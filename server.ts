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

// In-memory lock and cooldown for Retail Media Monitor collection
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between manual collections
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

// Europe/Bucharest Time Helper (with DST support via Intl)
function getBucharestTimeInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const day = partMap.day || '01';
  const month = partMap.month || '01';
  const year = partMap.year || '2026';
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const second = parseInt(partMap.second || '0', 10);

  const dateDmy = `${day}.${month}.${year}`;
  const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { dateDmy, timeFormatted, hour, minute, second, iso: now.toISOString() };
}

const SCHEDULER_STATE_FILE = path.resolve(__dirname, 'public', 'data', 'retail_media_scheduler_state.json');
const SCHEDULER_LOG_FILE = path.resolve(__dirname, 'fresh_meat_bi', 'daily_collector_scheduler.log');

interface SchedulerState {
  last_scheduled_run_date: string | null;
  last_scheduled_run_time: string | null;
  last_status: 'SUCCESS' | 'FAILED' | 'RETRYING' | 'IDLE';
  last_duration_seconds: number | null;
  retry_count: number;
  next_scheduled_run: string;
}

function readSchedulerState(): SchedulerState {
  if (fs.existsSync(SCHEDULER_STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SCHEDULER_STATE_FILE, 'utf-8'));
    } catch {
      // fallback
    }
  }
  return {
    last_scheduled_run_date: null,
    last_scheduled_run_time: null,
    last_status: 'IDLE',
    last_duration_seconds: null,
    retry_count: 0,
    next_scheduled_run: '08:00 Europe/Bucharest'
  };
}

function writeSchedulerState(state: SchedulerState) {
  try {
    fs.writeFileSync(SCHEDULER_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SCHEDULER] Error saving scheduler state:', err);
  }
}

function appendSchedulerLog(msg: string) {
  try {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(SCHEDULER_LOG_FILE, logLine, 'utf-8');
  } catch {
    // ignore
  }
}

function executeRetailMediaCollector(flags: string[] = []): Promise<{ success: boolean; code: number | null; durationSec: number }> {
  return new Promise((resolve) => {
    isCollecting = true;
    const startTime = Date.now();
    const pythonScript = path.resolve(__dirname, 'fresh_meat_bi', 'daily_retail_media_monitor.py');
    const pyProcess = spawn('python3', [pythonScript, ...flags], {
      cwd: __dirname,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stderrData = '';
    pyProcess.stderr.on('data', (d) => { stderrData += d.toString(); });

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
        appendSchedulerLog(`Colectare finalizată cu succes (${durationSec}s)`);
        console.log(`[RETAIL MEDIA COLLECTOR] Finalizat cu succes în ${durationSec}s`);
      } else {
        appendSchedulerLog(`Colectare eșuată cu codul ${code}: ${stderrData.slice(0, 150)}`);
        console.error(`[RETAIL MEDIA COLLECTOR] A eșuat cu codul ${code}:`, stderrData);
      }
      resolve({ success: code === 0, code, durationSec });
    });
  });
}

// Autonomous in-process cron scheduler: checks every 30 seconds
function initAutonomousScheduler() {
  console.log('[SCHEDULER] Persistent Retail Media Monitor scheduler initialized for 08:00 Europe/Bucharest');
  setInterval(async () => {
    const timeInfo = getBucharestTimeInfo();
    const state = readSchedulerState();

    // Check if 08:00 Europe/Bucharest has arrived and hasn't been run today yet
    const shouldRunToday = timeInfo.hour === 8 && state.last_scheduled_run_date !== timeInfo.dateDmy;
    
    // Also support recovery if current time is after 08:00 and today's run was completely missed
    const isMissedRecovery = timeInfo.hour > 8 && state.last_scheduled_run_date !== timeInfo.dateDmy && !isCollecting;

    if ((shouldRunToday || isMissedRecovery) && !isCollecting) {
      appendSchedulerLog(`Declanșare automată programată pentru ${timeInfo.dateDmy} 08:00 (Ora curentă: ${timeInfo.timeFormatted})`);
      console.log(`[SCHEDULER] Rulare automată 08:00 Europe/Bucharest declanșată (${timeInfo.dateDmy} ${timeInfo.timeFormatted})`);

      state.last_status = 'RETRYING';
      state.retry_count = 0;
      writeSchedulerState(state);

      let attempts = 0;
      let success = false;
      const maxRetries = 3;

      while (attempts < maxRetries && !success) {
        attempts++;
        const res = await executeRetailMediaCollector();
        if (res.success) {
          success = true;
          state.last_scheduled_run_date = timeInfo.dateDmy;
          state.last_scheduled_run_time = timeInfo.timeFormatted;
          state.last_status = 'SUCCESS';
          state.last_duration_seconds = res.durationSec;
          state.retry_count = attempts - 1;
          writeSchedulerState(state);
          appendSchedulerLog(`Rulare 08:00 finalizată cu SUCCESS (încercarea ${attempts})`);
        } else {
          appendSchedulerLog(`Încercarea ${attempts}/${maxRetries} a eșuat. Se reîncearcă în 10 secunde...`);
          if (attempts < maxRetries) {
            await new Promise((r) => setTimeout(r, 10000));
          }
        }
      }

      if (!success) {
        state.last_status = 'FAILED';
        state.retry_count = attempts;
        writeSchedulerState(state);
        appendSchedulerLog(`Rularea programată a eșuat după ${maxRetries} încercări. Raportul anterior valid rămâne activ (FAIL_CLOSED).`);
      }
    }
  }, 30000);
}

// 1. Status endpoint: returns current collection status, cooldown, scheduler state, and metadata
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

  const schedulerState = readSchedulerState();
  const timeInfo = getBucharestTimeInfo();

  res.json({
    status: isCollecting ? 'COLLECTING' : 'IDLE',
    is_collecting: isCollecting,
    current_bucharest_time: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}`,
    timezone: 'Europe/Bucharest',
    update_state: exportData?.update_state || 'VERIFIED_FRESH_UPDATE',
    update_state_label: exportData?.update_state_label || 'Actualizare Verificată',
    last_updated: exportData?.updated || null,
    last_updated_date: exportData?.updated_date || null,
    last_collection_bucharest: exportData?.last_collection_bucharest || null,
    period_analyzed: exportData?.period_analyzed || null,
    dataset_sha256: exportData?.dataset_sha256 || null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollecting && cooldownRemainingMs === 0,
    min_interval_minutes: 10,
    retailers_count: exportData?.retailers?.length || 7,
    publications_count: exportData?.publications?.length || 14,
    new_articles_count: exportData?.new_articles_count || 0,
    scheduler: schedulerState,
    last_result: lastCollectResult
  });
});

// 2. History endpoint: returns list of historical snapshots
app.get('/api/retail-media/history', (_req, res) => {
  const historyIndexFile = path.resolve(__dirname, 'public', 'data', 'retail_media_history', 'index.json');
  let historyList = [];
  if (fs.existsSync(historyIndexFile)) {
    try {
      historyList = JSON.parse(fs.readFileSync(historyIndexFile, 'utf-8'));
    } catch {
      // ignore
    }
  }
  res.json({
    total_snapshots: historyList.length,
    history: historyList
  });
});

// 3. Trigger on-demand collection endpoint (with 10-minute cooldown & single-active concurrency)
app.post('/api/retail-media/trigger-collect', async (req, res) => {
  const isForced = req.body?.force === true;
  const now = Date.now();
  const timeSinceLast = now - lastCollectTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  if (isCollecting) {
    return res.status(409).json({
      success: false,
      status: 'IN_PROGRESS',
      message: 'O sesiune de colectare este deja în curs de desfășurare. Solicitare deduplicată.'
    });
  }

  if (!isForced && cooldownRemainingMs > 0 && lastCollectTimestamp > 0) {
    return res.status(429).json({
      success: false,
      status: 'COOLDOWN',
      message: `Intervalul minim de protecție (10 minute) este activ. Reîncercați în ${Math.ceil(cooldownRemainingMs / 1000)} secunde.`,
      wait_seconds: Math.ceil(cooldownRemainingMs / 1000)
    });
  }

  const flags: string[] = [];
  if (isForced) flags.push('--force');

  // Trigger asynchronously in background
  executeRetailMediaCollector(flags).catch((e) => {
    console.error('[ON-DEMAND] Error in collection execution:', e);
  });

  return res.json({
    success: true,
    status: 'STARTED',
    message: 'Colectarea Retail Media Monitor a fost inițiată în fundal. Verificați statusul pentru finalizare.'
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
  const scriptPath = path.resolve(__dirname, 'fresh_meat_bi', 'promo_weekly_scheduler.py');
  const pyProcess = spawn('python3', [scriptPath, '--check-and-recover'], {
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
    initAutonomousScheduler();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
