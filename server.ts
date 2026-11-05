import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory lock and cooldown for Retail Media Monitor on-demand collection
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between global collections
let isCollecting = false;
let lastCollectTimestamp = 0;
let lastCollectResult: any = null;

// Helper to determine data file path
function getExportFilePath(): string {
  const distPath = path.resolve(__dirname, 'dist', 'data', 'retail_media_export.json');
  if (isProd && fs.existsSync(distPath)) {
    return distPath;
  }
  return path.resolve(__dirname, 'public', 'data', 'retail_media_export.json');
}

// 1. Status endpoint: returns current collection status, cooldown, and metadata
app.get('/api/retail-media/status', (_req, res) => {
  const now = Date.now();
  const timeSinceLast = now - lastCollectTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  let exportData: any = null;
  const filePath = getExportFilePath();
  if (fs.existsSync(filePath)) {
    try {
      exportData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      // Ignore read error
    }
  }

  res.json({
    status: isCollecting ? 'COLLECTING' : 'IDLE',
    is_collecting: isCollecting,
    last_updated: exportData?.updated || null,
    last_updated_date: exportData?.updated_date || null,
    last_collect_timestamp: lastCollectTimestamp > 0 ? new Date(lastCollectTimestamp).toISOString() : null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollecting && cooldownRemainingMs === 0,
    min_interval_minutes: 10,
    publications_count: exportData?.publications?.length || 14,
    last_result: lastCollectResult
  });
});

// 2. Trigger on-demand collection endpoint (with 10-minute cooldown & single-active concurrency)
app.post('/api/retail-media/trigger-collect', (_req, res) => {
  const now = Date.now();
  const timeSinceLast = now - lastCollectTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  // Protection A: Concurrency deduplication (only one collection active at any time)
  if (isCollecting) {
    return res.status(409).json({
      success: false,
      status: 'IN_PROGRESS',
      message: 'O sesiune de colectare este deja în curs de desfășurare. Solicitare deduplicată.'
    });
  }

  // Protection B: 10-minute cooldown between collections
  if (cooldownRemainingMs > 0 && lastCollectTimestamp > 0) {
    return res.status(429).json({
      success: false,
      status: 'COOLDOWN',
      message: `Intervalul minim de protecție (10 minute) este activ. Reîncercați în ${Math.ceil(cooldownRemainingMs / 1000)} secunde.`,
      wait_seconds: Math.ceil(cooldownRemainingMs / 1000)
    });
  }

  // Acquire lock
  isCollecting = true;
  const startTime = Date.now();

  const pythonScript = path.resolve(__dirname, 'fresh_meat_bi', 'daily_retail_media_monitor.py');
  const pyProcess = spawn('python3', [pythonScript], {
    cwd: __dirname,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  let stdoutData = '';
  let stderrData = '';

  pyProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pyProcess.on('close', (code) => {
    const durationSec = Math.round((Date.now() - startTime) / 10) / 100;
    isCollecting = false;
    lastCollectTimestamp = Date.now();

    lastCollectResult = {
      exit_code: code,
      duration_seconds: durationSec,
      completed_at: new Date().toISOString(),
      success: code === 0
    };

    if (code === 0) {
      console.log(`[ON-DEMAND COLLECTOR] Sesiune finalizată cu succes în ${durationSec}s`);
    } else {
      console.error(`[ON-DEMAND COLLECTOR] Procesul a eșuat cu codul ${code}:`, stderrData);
    }
  });

  return res.json({
    success: true,
    status: 'STARTED',
    message: 'Colectarea la cerere a fost inițiată în fundal. Verificați statusul pentru finalizare.'
  });
});

// In-memory lock and cooldown for Promo Weekly on-demand collection
const PROMO_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let isCollectingPromo = false;
let lastCollectPromoTimestamp = 0;
let lastCollectPromoResult: any = null;

// 3. Status endpoint for Promo Weekly
app.get('/api/promo-weekly/status', (_req, res) => {
  const now = Date.now();
  const timeSinceLast = now - lastCollectPromoTimestamp;
  const cooldownRemainingMs = Math.max(0, PROMO_COOLDOWN_MS - timeSinceLast);

  let activeData: any = null;
  const pointerPath = path.resolve(__dirname, 'public', 'data', 'active_release.json');
  if (fs.existsSync(pointerPath)) {
    try {
      activeData = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
    } catch {
      // Ignore
    }
  }

  res.json({
    status: isCollectingPromo ? 'COLLECTING' : 'IDLE',
    is_collecting: isCollectingPromo,
    active_release_id: activeData?.release_id || null,
    published_at_utc: activeData?.published_at_utc || null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollectingPromo && cooldownRemainingMs === 0,
    last_result: lastCollectPromoResult
  });
});

// 4. Trigger on-demand Promo Weekly collection (with 10-minute cooldown & single-active concurrency)
app.post('/api/promo-weekly/trigger-collect', (_req, res) => {
  const now = Date.now();
  const timeSinceLast = now - lastCollectPromoTimestamp;
  const cooldownRemainingMs = Math.max(0, PROMO_COOLDOWN_MS - timeSinceLast);

  if (isCollectingPromo) {
    return res.status(409).json({
      success: false,
      status: 'IN_PROGRESS',
      message: 'O colectare Promo Weekly este deja în desfășurare. Solicitare deduplicată.'
    });
  }

  if (cooldownRemainingMs > 0 && lastCollectPromoTimestamp > 0) {
    return res.status(429).json({
      success: false,
      status: 'COOLDOWN',
      message: `Intervalul minim de protecție (10 minute) este activ. Reîncercați în ${Math.ceil(cooldownRemainingMs / 1000)} secunde.`,
      wait_seconds: Math.ceil(cooldownRemainingMs / 1000)
    });
  }

  isCollectingPromo = true;
  const startTime = Date.now();
  const scriptPath = path.resolve(__dirname, 'fresh_meat_bi', 'promo_weekly_rolling_updater.py');
  const pyProcess = spawn('python3', [scriptPath, '--apply', '--force'], {
    cwd: __dirname,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  let stderrData = '';
  pyProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pyProcess.on('close', (code) => {
    const durationSec = Math.round((Date.now() - startTime) / 10) / 100;
    isCollectingPromo = false;
    lastCollectPromoTimestamp = Date.now();
    lastCollectPromoResult = {
      exit_code: code,
      duration_seconds: durationSec,
      completed_at: new Date().toISOString(),
      success: code === 0
    };
    if (code === 0) {
      console.log(`[PROMO ROLLING UPDATE] Sesiune finalizată cu succes în ${durationSec}s`);
    } else {
      console.error(`[PROMO ROLLING UPDATE] A eșuat cu codul ${code}:`, stderrData);
    }
  });

  return res.json({
    success: true,
    status: 'STARTED',
    message: 'Colectarea și auditul Promo Weekly au fost inițiate în fundal.'
  });
});

async function startServer() {
  if (!isProd) {
    // Development mode: mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fresh Meat Retail BI server running on http://0.0.0.0:${PORT} (env: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
