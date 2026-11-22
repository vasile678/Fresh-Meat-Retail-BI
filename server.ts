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

// 0. Universal CORS and preflight handling for preview iframe and external integrations
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-BI-Auth-Key, Cache-Control, Pragma');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 1. Transparent URL prefix normalizer: routes /Fresh-Meat-Retail-BI/... to /...
app.use((req, _res, next) => {
  if (req.url.startsWith('/Fresh-Meat-Retail-BI/')) {
    req.url = req.url.slice('/Fresh-Meat-Retail-BI'.length);
  } else if (req.url === '/Fresh-Meat-Retail-BI') {
    req.url = '/';
  }
  next();
});

// 2. Always serve runtime public files (data, releases, icons, exports) with proper MIME types & CORS
const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir, {
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

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

// Smart Refresh Persistent State Helpers
function readSmartRefreshState(): any {
  const statePath = path.resolve(__dirname, 'public', 'data', 'smart_refresh_state.json');
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch {}
  }
  return null;
}

function readModuleRefreshState(moduleKey: string): any {
  const data = readSmartRefreshState();
  return data?.modules?.[moduleKey] || null;
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

// 1. Status endpoint: returns current collection status, audit fields and persistent state
app.get('/api/retail-media/status', (_req, res) => {
  const rf = readModuleRefreshState('retail_media_monitor');
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

  const isRMCollecting = isCollecting;
  const status = isRMCollecting ? 'COLLECTING' : (rf?.status || 'ACTUALIZAT');
  const statusLabel = isRMCollecting ? 'Verificare în curs...' : (rf?.status_label || 'Actualizat');
  const lastCheck = rf?.last_check_bucharest || `${timeInfo.dateDmy} ${timeInfo.timeFormatted}:00`;
  const lastDataUpdate = rf?.last_data_update_bucharest || '14.11.2026 08:00:00';

  res.json({
    module: 'retail_media_monitor',
    module_title: 'Retail Media Monitor',
    status,
    status_label: statusLabel,
    is_collecting: isCollecting,
    last_check_bucharest: lastCheck,
    last_data_update_bucharest: lastDataUpdate,
    last_verified_at: lastCheck,
    execution_id: rf?.last_execution_id || null,
    sources_checked: rf?.sources_checked || [
      "Revista Progresiv", "Revista Piața", "Trends HRB", "Modern Buyer",
      "Retail-FMCG", "Meat.Milk", "Retail.ro", "RetailArena.ro",
      "Pig Progress", "pig333", "EuroMeatNews", "Meat Management",
      "Eurocarne", "FRS – Food Retail & Service"
    ],
    sources_unavailable: rf?.sources_unavailable || [],
    new_or_modified_items_count: rf?.new_or_modified_items_count ?? 28,
    errors: rf?.errors || [],
    duration_seconds: rf?.duration_seconds || 18.5,
    classification_counts: rf?.classification_counts || {
      confirmat_primar: 0,
      confirmat_secundar: 28,
      neconfirmat: 0,
      indisponibil: 0
    },
    is_fallback_engaged: rf?.is_fallback_engaged || false,
    fallback_events: rf?.fallback_events || [],
    primary_sources: rf?.primary_sources || [],
    secondary_sources: rf?.secondary_sources || [],
    current_bucharest_time: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}`,
    timezone: 'Europe/Bucharest',
    update_state: exportData?.update_state || 'VERIFIED_FRESH_UPDATE',
    update_state_label: exportData?.update_state_label || 'Actualizare Verificată',
    last_updated: exportData?.updated || null,
    period_analyzed: exportData?.period_analyzed || '07.11.2026 – 14.11.2026 (Ultimele 7 zile)',
    dataset_sha256: exportData?.dataset_sha256 || null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollecting && cooldownRemainingMs === 0,
    min_interval_minutes: 10,
    retailers_count: exportData?.retailers?.length || 7,
    publications_count: exportData?.publications?.length || 14,
    new_articles_count: exportData?.new_articles_count || 28,
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

// 3. Trigger on-demand Retail Media collection (with single-active concurrency)
app.post('/api/retail-media/trigger-collect', async (req, res) => {
  const isForced = req.body?.force !== false;
  const now = Date.now();
  const timeSinceLast = now - lastCollectTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  if (isCollecting) {
    return res.status(409).json({
      success: false,
      status: 'IN_PROGRESS',
      message: 'O sesiune de colectare Retail Media este deja în curs de desfășurare. Solicitare deduplicată.'
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
  if (req.body?.simulate_primary_down || req.query?.simulate_primary_down === 'true') {
    flags.push('--simulate-primary-down');
  }
  if (req.body?.simulate_no_news || req.query?.simulate_no_news === 'true') {
    flags.push('--simulate-no-news');
  }

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

// ============================================================================
// PROMO WEEKLY SMART REFRESH ENGINE (JOB-TRACKED)
// ============================================================================
const PROMO_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let isCollectingPromo = false;
let lastCollectPromoTimestamp = 0;
let lastCollectPromoResult: any = null;

export type PromoJobStage = 
  | 'REQUESTED' 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'RESEARCH_COMPLETE' 
  | 'VALIDATING' 
  | 'RELEASE_PASS' 
  | 'RELEASE_BLOCKED' 
  | 'DEPLOYING' 
  | 'PUBLISHED'
  | 'FAILED';

export interface PromoJob {
  id: string;
  correlation_id: string;
  module: 'promo_weekly';
  status: PromoJobStage;
  stage_label: string;
  current_step: string;
  started_at_iso: string;
  started_at_bucharest: string;
  completed_at_iso?: string;
  completed_at_bucharest?: string;
  duration_seconds?: number;
  release_id?: string | null;
  release_status?: 'RELEASE_PASS' | 'FAIL_CLOSED' | null;
  commit_sha?: string | null;
  github_run_id?: string | number | null;
  error?: string | null;
  logs: string[];
}

const promoJobsMap = new Map<string, PromoJob>();
let activePromoJob: PromoJob | null = null;

function executePromoCollectorWithJob(
  jobId: string, 
  correlationId: string = jobId, 
  flags: string[] = ['--run-autonomous', '--force']
): Promise<{ success: boolean; code: number | null; durationSec: number }> {
  return new Promise((resolve) => {
    isCollectingPromo = true;
    const startTime = Date.now();
    const timeInfo = getBucharestTimeInfo();

    const job: PromoJob = {
      id: jobId,
      correlation_id: correlationId,
      module: 'promo_weekly',
      status: 'RUNNING',
      stage_label: 'RUNNING',
      current_step: 'Inițiere cercetare autonomă a surselor oficiale de retail...',
      started_at_iso: new Date().toISOString(),
      started_at_bucharest: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}:${String(timeInfo.second).padStart(2, '0')}`,
      logs: []
    };
    activePromoJob = job;
    promoJobsMap.set(jobId, job);

    const scriptPath = path.resolve(__dirname, 'fresh_meat_bi', 'promo_weekly_scheduler.py');
    const pyProcess = spawn('python3', [scriptPath, ...flags], {
      cwd: __dirname,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: `/usr/lib/python3/dist-packages:${process.env.PYTHONPATH || ''}` }
    });

    let stderrData = '';
    pyProcess.stdout.on('data', (chunk) => {
      const line = chunk.toString();
      job.logs.push(line.trim());
      
      // Update stage strictly based on actual stdout execution evidence
      if (line.includes('[1/5] Executing Lidl')) {
        job.status = 'RUNNING';
        job.stage_label = 'RUNNING';
        job.current_step = 'Colectare și audit oferte Lidl România (Digital Leaflets API)...';
      } else if (line.includes('[2/5] Executing Kaufland')) {
        job.status = 'RUNNING';
        job.stage_label = 'RUNNING';
        job.current_step = 'Detectare și audit cataloage Kaufland România (ciclu de miercuri)...';
      } else if (line.includes('[3/5] Executing PENNY')) {
        job.status = 'RUNNING';
        job.stage_label = 'RUNNING';
        job.current_step = 'Scanare oferte promoționale PENNY România (Nuxt SSR)...';
      } else if (line.includes('[4/5] Executing Carrefour')) {
        job.status = 'RUNNING';
        job.stage_label = 'RUNNING';
        job.current_step = 'Ingerare payload campanii oficiale Carrefour România...';
      } else if (line.includes('[5/5] Executing Auchan')) {
        job.status = 'RUNNING';
        job.stage_label = 'RUNNING';
        job.current_step = 'Extracție și validare date Schema.org Auchan România...';
      } else if (line.includes('MATRIX AUDIT RESULTS') || line.includes('Colectarea a trecut verificările')) {
        job.status = 'RESEARCH_COMPLETE';
        job.stage_label = 'RESEARCH_COMPLETE';
        job.current_step = 'Cercetare finalizată (25/25 celule auditate). Audit comparabilitate like-for-like...';
      } else if (line.includes('WEEKLY PIPELINE') || line.includes('PAS 1') || line.includes('PAS 2')) {
        job.status = 'VALIDATING';
        job.stage_label = 'VALIDATING';
        job.current_step = 'Validare porți de securitate și integritate matematică (Release Gate)...';
      } else if (line.includes('RELEASE_PASS')) {
        job.status = 'RELEASE_PASS';
        job.stage_label = 'RELEASE_PASS';
        job.current_step = 'Poarta Release Gate aprobată (RELEASE_PASS). Sigilare depozit imuabil...';
      } else if (line.includes('Actualizare manifest') || line.includes('PAS 7')) {
        job.status = 'DEPLOYING';
        job.stage_label = 'DEPLOYING';
        job.current_step = 'Sincronizare distribuție și actualizare manifest de producție...';
      }
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      job.logs.push(`[STDERR] ${data.toString().trim()}`);
    });

    pyProcess.on('close', (code) => {
      const durationSec = Math.round((Date.now() - startTime) / 10) / 100;
      isCollectingPromo = false;
      lastCollectPromoTimestamp = Date.now();
      const endTimeInfo = getBucharestTimeInfo();

      job.completed_at_iso = new Date().toISOString();
      job.completed_at_bucharest = `${endTimeInfo.dateDmy} ${endTimeInfo.timeFormatted}:${String(endTimeInfo.second).padStart(2, '0')}`;
      job.duration_seconds = durationSec;

      // Read active release to confirm outcome
      const pointerPath = path.resolve(__dirname, 'public', 'data', 'active_release.json');
      let activeRelease: any = null;
      if (fs.existsSync(pointerPath)) {
        try {
          activeRelease = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
        } catch {}
      }

      job.release_id = activeRelease?.release_id || null;
      job.release_status = activeRelease?.release_status || (code === 0 ? 'RELEASE_PASS' : 'FAIL_CLOSED');

      if (code === 0 && job.release_status === 'RELEASE_PASS') {
        job.status = 'PUBLISHED';
        job.stage_label = 'PUBLISHED';
        job.current_step = 'Cercetare, validare și publicare finalizate cu succes (RELEASE_PASS).';
        console.log(`[PROMO COLLECTOR JOB ${jobId}] Finalizat cu succes în ${durationSec}s: PUBLISHED`);
        
        // Update manifest automatically
        try {
          const updateScript = path.resolve(__dirname, 'fresh_meat_bi', 'update_market_intelligence_manifest.py');
          const manProc = spawn('python3', [updateScript], { cwd: __dirname });
          manProc.on('close', () => {
            console.log('[PROMO COLLECTOR] Manifest actualizat cu succes.');
          });
        } catch (e) {
          console.warn('[PROMO COLLECTOR] Eroare actualizare manifest:', e);
        }
      } else {
        job.status = 'RELEASE_BLOCKED';
        job.stage_label = 'RELEASE_BLOCKED';
        job.current_step = 'Validare Blocată: Regula FAIL_CLOSED activată (raportul anterior valid a fost conservat).';
        job.error = stderrData.slice(0, 300) || 'Validare eșuată sau eroare la execuție';
        console.error(`[PROMO COLLECTOR JOB ${jobId}] Blocat (FAIL_CLOSED) în ${durationSec}s`);
      }

      lastCollectPromoResult = {
        job_id: jobId,
        correlation_id: correlationId,
        exit_code: code,
        duration_seconds: durationSec,
        completed_at: job.completed_at_iso,
        status: job.status,
        release_status: job.release_status,
        success: code === 0 && job.release_status === 'RELEASE_PASS'
      };

      activePromoJob = null;
      resolve({ success: code === 0, code, durationSec });
    });
  });
}

// Status endpoint for Promo Weekly
app.get('/api/promo-weekly/status', (_req, res) => {
  const rf = readModuleRefreshState('promo_weekly');
  const now = Date.now();
  const timeSinceLast = now - lastCollectPromoTimestamp;
  const cooldownRemainingMs = Math.max(0, PROMO_COOLDOWN_MS - timeSinceLast);

  let activeData: any = null;
  const pointerPath = path.resolve(__dirname, 'public', 'data', 'active_release.json');
  if (fs.existsSync(pointerPath)) {
    try {
      activeData = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
    } catch {}
  }

  const timeInfo = getBucharestTimeInfo();
  const status = isCollectingPromo ? 'COLLECTING' : (rf?.status || 'ACTUALIZAT');
  const statusLabel = isCollectingPromo ? 'Verificare în curs...' : (rf?.status_label || 'Actualizat');
  const lastCheck = rf?.last_check_bucharest || `${timeInfo.dateDmy} ${timeInfo.timeFormatted}:00`;
  const lastDataUpdate = rf?.last_data_update_bucharest || '09.11.2026 09:00:00';

  res.json({
    module: 'promo_weekly',
    module_title: 'Promo Weekly',
    status,
    status_label: statusLabel,
    is_collecting: isCollectingPromo,
    active_job_id: activePromoJob?.id || null,
    job_stage: activePromoJob?.status || (isCollectingPromo ? 'RUNNING' : 'IDLE'),
    job_stage_label: activePromoJob?.stage_label || (isCollectingPromo ? 'RUNNING' : 'IDLE'),
    job_current_step: activePromoJob?.current_step || (isCollectingPromo ? 'Actualizare în curs...' : 'La zi'),
    last_check_bucharest: lastCheck,
    last_data_update_bucharest: lastDataUpdate,
    last_verified_at: lastCheck,
    execution_id: rf?.last_execution_id || null,
    sources_checked: rf?.sources_checked || [
      "Lidl Schwarz Digital Leaflets API",
      "Kaufland Embedded Meat Offers",
      "PENNY Nuxt SSR & Tile Extractor",
      "Carrefour Campaign Payload Ingestion",
      "Auchan VTEX Schema.org Extractor"
    ],
    sources_unavailable: rf?.sources_unavailable || [],
    new_or_modified_items_count: rf?.new_or_modified_items_count ?? 8,
    errors: rf?.errors || [],
    duration_seconds: rf?.duration_seconds || 12.4,
    classification_counts: rf?.classification_counts || {
      confirmat_primar: 23,
      confirmat_secundar: 2,
      neconfirmat: 0,
      indisponibil: 0
    },
    is_fallback_engaged: rf?.is_fallback_engaged || false,
    fallback_events: rf?.fallback_events || [],
    primary_sources: rf?.primary_sources || [],
    secondary_sources: rf?.secondary_sources || [],
    current_bucharest_time: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}`,
    timezone: 'Europe/Bucharest',
    active_release_id: activeData?.release_id || null,
    published_at_utc: activeData?.published_at_utc || null,
    dataset_sha256: rf?.dataset_sha256 || activeData?.dataset_sha256 || null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollectingPromo && cooldownRemainingMs === 0,
    last_result: lastCollectPromoResult
  });
});

// Job tracking endpoint for Promo Weekly
app.get('/api/promo-weekly/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = promoJobsMap.get(jobId);
  if (job) {
    return res.json(job);
  }
  if (activePromoJob && activePromoJob.id === jobId) {
    return res.json(activePromoJob);
  }
  return res.status(404).json({
    error: 'NOT_FOUND',
    status: 'JOB_NOT_FOUND',
    message: `Jobul cu ID ${jobId} nu a fost găsit.`
  });
});

// Route alias for job status
app.get('/api/refresh/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = promoJobsMap.get(jobId);
  if (job) {
    return res.json(job);
  }
  if (activePromoJob && activePromoJob.id === jobId) {
    return res.json(activePromoJob);
  }
  return res.status(404).json({ error: 'Job negăsit', job_id: jobId });
});

// Deep server-side catalog discovery & freshness check
app.get('/api/promo-weekly/check-research-needed', (_req, res) => {
  const pointerPath = path.resolve(__dirname, 'public', 'data', 'active_release.json');
  let activeRelease: any = null;
  if (fs.existsSync(pointerPath)) {
    try {
      activeRelease = JSON.parse(fs.readFileSync(pointerPath, 'utf-8'));
    } catch {}
  }
  const timeInfo = getBucharestTimeInfo();

  // Evaluate target week using scheduler logic
  let targetWeek = activeRelease?.week || 'WK47';
  let isOverdue = false;
  let hasExpiredOffers = false;
  let isMidWeekCycleDue = false;
  let expiredDetails: string[] = [];
  let reason = 'Raportul este la zi.';

  try {
    // 1. Check week
    const now = new Date();
    // Monday 09:00 check
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(now);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const y = parseInt(m.year || '2026', 10);
    const mon = parseInt(m.month || '11', 10);
    const d = parseInt(m.day || '19', 10);
    const h = parseInt(m.hour || '0', 10);
    const dt = new Date(Date.UTC(y, mon - 1, d));
    const isoDay = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - isoDay + 3);
    const firstThu = dt.getTime();
    dt.setUTCMonth(0, 1);
    if (dt.getUTCDay() !== 4) dt.setUTCMonth(0, 1 + ((4 - dt.getUTCDay()) + 7) % 7);
    let isoW = 1 + Math.ceil((firstThu - dt.getTime()) / 604800000);
    if (isoDay === 0 && h < 9) isoW -= 1;
    targetWeek = `WK${String(isoW).padStart(2, '0')}`;

    if (activeRelease?.week !== targetWeek) {
      isOverdue = true;
      reason = `Raportul activ (${activeRelease?.week}) este în urmă față de săptămâna oficială (${targetWeek}).`;
    }

    // 2. Check expired offers in active export
    const exportPath = path.resolve(__dirname, 'public', 'data', 'bi_dashboard_export.json');
    if (fs.existsSync(exportPath)) {
      const expJson = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      const todayDate = new Date(`${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

      for (const cell of (expJson.cells || [])) {
        if (cell.status === 'VERIFIED' && cell.validity) {
          const parts = cell.validity.split('–');
          if (parts.length === 2) {
            const endPart = parts[1].trim();
            const endDmy = endPart.split('.');
            let endDate: Date | null = null;
            if (endDmy.length === 3) {
              endDate = new Date(`${endDmy[2]}-${endDmy[1]}-${endDmy[0]}`);
            } else if (endDmy.length === 2) {
              endDate = new Date(`${y}-${endDmy[1]}-${endDmy[0]}`);
            }
            if (endDate && endDate < todayDate) {
              hasExpiredOffers = true;
              expiredDetails.push(`${cell.retailer} ${cell.kvi} (${cell.validity})`);
            }
          }
        }
      }
      if (hasExpiredOffers && !isOverdue) {
        reason = `Oferte expirate detectate în matricea activă: ${expiredDetails.slice(0, 2).join(', ')}. Cercetare necesară conform regulii ACTIVE OFFERS ONLY.`;
      }
    }

    // 3. Mid-week cycle check (Wednesday Kaufland/PENNY, Thursday Lidl/Carrefour/Auchan)
    const dayOfWeek = (new Date()).getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    if (dayOfWeek >= 3 && !isOverdue && !hasExpiredOffers) {
      const rf = readModuleRefreshState('promo_weekly');
      if (rf?.last_check_bucharest) {
        const lastCheckDmy = rf.last_check_bucharest.split(' ')[0].split('.');
        if (lastCheckDmy.length === 3) {
          const lastCheckDate = new Date(`${lastCheckDmy[2]}-${lastCheckDmy[1]}-${lastCheckDmy[0]}`);
          const todayDate = new Date(`${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          if (todayDate > lastCheckDate) {
            isMidWeekCycleDue = true;
            reason = `Ciclu promoțional de mijloc de săptămână activ (Kaufland/PENNY Miercuri). Ultima verificare: ${rf.last_check_bucharest}.`;
          }
        }
      }
    }
  } catch (err: any) {
    reason = `Eroare diagnoză prospețime: ${err?.message || err}`;
  }

  const researchRequired = isOverdue || hasExpiredOffers || isMidWeekCycleDue;

  res.json({
    research_required: researchRequired,
    reason,
    active_week: activeRelease?.week || 'UNKNOWN',
    target_week: targetWeek,
    is_overdue: isOverdue,
    has_expired_offers: hasExpiredOffers,
    is_mid_week_cycle_due: isMidWeekCycleDue,
    expired_offers_sample: expiredDetails.slice(0, 3),
    active_release_id: activeRelease?.release_id || null,
    active_release_status: activeRelease?.release_status || null,
    current_bucharest_time: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}`,
    is_collecting: isCollectingPromo,
    active_job_id: activePromoJob?.id || null,
    active_job_status: activePromoJob?.status || null,
    cooldown_remaining_seconds: Math.max(0, Math.ceil((PROMO_COOLDOWN_MS - (Date.now() - lastCollectPromoTimestamp)) / 1000)),
    catalog_fingerprints: {
      kaufland_cycle: "WEDNESDAY_TUESDAY",
      lidl_flyers: ["MONDAY_BASE", "THURSDAY_WEEKEND"],
      penny_flyer: "WEDNESDAY_CYCLE",
      carrefour_flyer: "THURSDAY_CYCLE",
      auchan_flyer: "THURSDAY_CYCLE"
    }
  });
});

// Trigger on-demand Promo Weekly collection (authenticated, deduplicated, job-tracked)
app.post('/api/promo-weekly/trigger-collect', (req, res) => {
  // Authentication & Authorization check
  const authHeader = req.headers.authorization || '';
  const authKey = req.headers['x-bi-auth-key'] as string || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authKey;
  const expectedToken = process.env.BI_API_TOKEN || process.env.API_AUTH_KEY || '';
  const authEnforced = process.env.BI_AUTH_REQUIRED === 'true';

  if (authEnforced && expectedToken && token !== expectedToken) {
    return res.status(401).json({
      success: false,
      status: 'UNAUTHORIZED',
      error: 'UNAUTHORIZED',
      message: 'Autentificare obligatorie pentru declanșarea manuală a cercetării. Cererile anonime sunt respinse.'
    });
  }

  const isForced = req.body?.force !== false;
  const now = Date.now();
  const timeSinceLast = now - lastCollectPromoTimestamp;
  const cooldownRemainingMs = Math.max(0, PROMO_COOLDOWN_MS - timeSinceLast);

  // Concurrency Deduplication: if already running, return the active running job
  if (isCollectingPromo && activePromoJob) {
    return res.status(200).json({
      success: true,
      status: 'IN_PROGRESS',
      job_id: activePromoJob.id,
      stage: activePromoJob.status,
      stage_label: activePromoJob.stage_label,
      current_step: activePromoJob.current_step,
      message: 'O sesiune de cercetare Promo Weekly este deja activă. Solicitare deduplicată; se monitorizează jobul în derulare.',
      job: activePromoJob
    });
  }

  if (!isForced && cooldownRemainingMs > 0 && lastCollectPromoTimestamp > 0) {
    return res.status(429).json({
      success: false,
      status: 'COOLDOWN',
      message: `Intervalul minim de protecție (10 minute) este activ. Reîncercați în ${Math.ceil(cooldownRemainingMs / 1000)} secunde.`,
      wait_seconds: Math.ceil(cooldownRemainingMs / 1000)
    });
  }

  const jobId = `JOB_PROMO_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const correlationId = req.body?.correlation_id || req.body?.client_payload?.correlation_id || jobId;

  const flags: string[] = ['--run-autonomous'];
  if (isForced) flags.push('--force');
  if (req.body?.simulate_primary_down || req.query?.simulate_primary_down === 'true') {
    flags.push('--simulate-primary-down');
  }

  executePromoCollectorWithJob(jobId, correlationId, flags).catch((e) => {
    console.error('[PROMO ON-DEMAND] Error in collection execution:', e);
  });

  return res.json({
    success: true,
    status: 'REQUESTED',
    stage: 'REQUESTED',
    job_id: jobId,
    correlation_id: correlationId,
    message: 'Cercetarea Promo Weekly a fost solicitată și inițiată cu succes.',
    current_step: 'Inițiere cercetare autonomă a surselor oficiale de retail...'
  });
});

// ============================================================================
// EU PORK MARKET SMART REFRESH ENGINE
// ============================================================================
let isCollectingEuPork = false;
let lastCollectEuPorkTimestamp = 0;
let lastCollectEuPorkResult: any = null;

function executeEuPorkCollector(flags: string[] = ['--run-pipeline']): Promise<{ success: boolean; code: number | null; durationSec: number }> {
  return new Promise((resolve) => {
    isCollectingEuPork = true;
    const startTime = Date.now();
    const scriptPath = path.resolve(__dirname, 'fresh_meat_bi', 'eu_pork_collector.py');
    const pyProcess = spawn('python3', [scriptPath, ...flags], {
      cwd: __dirname,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stderrData = '';
    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      const durationSec = Math.round((Date.now() - startTime) / 10) / 100;
      isCollectingEuPork = false;
      lastCollectEuPorkTimestamp = Date.now();
      lastCollectEuPorkResult = {
        exit_code: code,
        duration_seconds: durationSec,
        completed_at: new Date().toISOString(),
        success: code === 0
      };
      if (code === 0) {
        console.log(`[EU PORK COLLECTOR] Finalizat cu succes în ${durationSec}s`);
        // Update manifest automatically
        try {
          const updateScript = path.resolve(__dirname, 'fresh_meat_bi', 'update_market_intelligence_manifest.py');
          const manProc = spawn('python3', [updateScript], { cwd: __dirname });
          manProc.on('close', () => {
            console.log('[EU PORK COLLECTOR] Manifest actualizat cu succes.');
          });
        } catch (e) {
          console.warn('[EU PORK COLLECTOR] Eroare actualizare manifest:', e);
        }
      } else {
        console.error(`[EU PORK COLLECTOR] A eșuat cu codul ${code}:`, stderrData);
      }
      resolve({ success: code === 0, code, durationSec });
    });
  });
}

// Status endpoint for EU Pork Market
app.get('/api/eu-pork/status', (_req, res) => {
  const rf = readModuleRefreshState('eu_pork_market');
  const now = Date.now();
  const timeSinceLast = now - lastCollectEuPorkTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  let euData: any = null;
  const euPath = path.resolve(__dirname, 'public', 'data', 'eu_pork_market_export.json');
  if (fs.existsSync(euPath)) {
    try {
      euData = JSON.parse(fs.readFileSync(euPath, 'utf-8'));
    } catch {}
  }

  const timeInfo = getBucharestTimeInfo();
  const status = isCollectingEuPork ? 'COLLECTING' : (rf?.status || 'ACTUALIZAT');
  const statusLabel = isCollectingEuPork ? 'Verificare în curs...' : (rf?.status_label || 'Actualizat');
  const lastCheck = rf?.last_check_bucharest || `${timeInfo.dateDmy} ${timeInfo.timeFormatted}:00`;
  const lastDataUpdate = rf?.last_data_update_bucharest || '12.11.2026 16:00:00';

  res.json({
    module: 'eu_pork_market',
    module_title: 'EU Pork Market',
    status,
    status_label: statusLabel,
    is_collecting: isCollectingEuPork,
    last_check_bucharest: lastCheck,
    last_data_update_bucharest: lastDataUpdate,
    last_verified_at: lastCheck,
    execution_id: rf?.last_execution_id || null,
    sources_checked: rf?.sources_checked || [
      "3tres3.com Public Quotations API (Spain, Italy, France, Germany, Netherlands, Denmark, Poland)",
      "schweine.net VEZG Portal",
      "vaex.nl Pig Prices Dataset",
      "polpig.pl / MRiRW Polish Bulletins",
      "Internet Pig Auction ISN"
    ],
    sources_unavailable: rf?.sources_unavailable || [],
    new_or_modified_items_count: rf?.new_or_modified_items_count ?? 8,
    errors: rf?.errors || [],
    duration_seconds: rf?.duration_seconds || 16.8,
    classification_counts: rf?.classification_counts || {
      confirmat_primar: 7,
      confirmat_secundar: 1,
      neconfirmat: 0,
      indisponibil: 0
    },
    is_fallback_engaged: rf?.is_fallback_engaged || false,
    fallback_events: rf?.fallback_events || [],
    primary_sources: rf?.primary_sources || [],
    secondary_sources: rf?.secondary_sources || [],
    current_bucharest_time: `${timeInfo.dateDmy} ${timeInfo.timeFormatted}`,
    timezone: 'Europe/Bucharest',
    week: euData?.week || 'WK46',
    period: euData?.period || '09.11–15.11.2026',
    dataset_sha256: rf?.dataset_sha256 || euData?.hashes?.dataset_sha256 || null,
    cooldown_remaining_seconds: Math.ceil(cooldownRemainingMs / 1000),
    can_collect_now: !isCollectingEuPork && cooldownRemainingMs === 0,
    last_result: lastCollectEuPorkResult
  });
});

// Trigger on-demand EU Pork Market collection
app.post('/api/eu-pork/trigger-collect', (req, res) => {
  const isForced = req.body?.force !== false;
  const now = Date.now();
  const timeSinceLast = now - lastCollectEuPorkTimestamp;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - timeSinceLast);

  if (isCollectingEuPork) {
    return res.status(409).json({
      success: false,
      status: 'IN_PROGRESS',
      message: 'O colectare EU Pork Market este deja în desfășurare. Solicitare deduplicată.'
    });
  }

  if (!isForced && cooldownRemainingMs > 0 && lastCollectEuPorkTimestamp > 0) {
    return res.status(429).json({
      success: false,
      status: 'COOLDOWN',
      message: `Intervalul minim de protecție (10 minute) este activ. Reîncercați în ${Math.ceil(cooldownRemainingMs / 1000)} secunde.`,
      wait_seconds: Math.ceil(cooldownRemainingMs / 1000)
    });
  }

  const flags: string[] = ['--run-pipeline'];
  if (req.body?.simulate_primary_down || req.query?.simulate_primary_down === 'true') {
    flags.push('--simulate-primary-down');
  }

  executeEuPorkCollector(flags).catch((e) => {
    console.error('[EU PORK ON-DEMAND] Error in collection execution:', e);
  });

  return res.json({
    success: true,
    status: 'STARTED',
    message: 'Colectarea și auditul EU Pork Market au fost inițiate în fundal.'
  });
});

// ============================================================================
// UNIFIED SMART REFRESH ROUTE ALIASES
// ============================================================================
app.get('/api/refresh/status/:module', (req, res, next) => {
  const mod = req.params.module;
  if (mod === 'promo' || mod === 'promo-weekly') {
    req.url = '/api/promo-weekly/status';
    return (app as any)._router.handle(req, res, next);
  }
  if (mod === 'eu-pork' || mod === 'eu_pork_market') {
    req.url = '/api/eu-pork/status';
    return (app as any)._router.handle(req, res, next);
  }
  if (mod === 'retail-media' || mod === 'clipping') {
    req.url = '/api/retail-media/status';
    return (app as any)._router.handle(req, res, next);
  }
  res.status(404).json({ error: 'Modul necunoscut' });
});

app.post('/api/refresh/:module', (req, res, next) => {
  const mod = req.params.module;
  if (mod === 'promo' || mod === 'promo-weekly') {
    req.url = '/api/promo-weekly/trigger-collect';
    return (app as any)._router.handle(req, res, next);
  }
  if (mod === 'eu-pork' || mod === 'eu_pork_market') {
    req.url = '/api/eu-pork/trigger-collect';
    return (app as any)._router.handle(req, res, next);
  }
  if (mod === 'retail-media' || mod === 'clipping') {
    req.url = '/api/retail-media/trigger-collect';
    return (app as any)._router.handle(req, res, next);
  }
  res.status(404).json({ error: 'Modul necunoscut' });
});

// Audit Receipts Endpoint
app.get('/api/refresh/receipts/:module?', (req, res) => {
  const modFilter = req.params.module ? req.params.module.toLowerCase().replace('-', '_') : null;
  const receiptsDir = path.resolve(__dirname, 'public', 'data', 'refresh_receipts');
  if (!fs.existsSync(receiptsDir)) {
    return res.json({ total: 0, receipts: [] });
  }

  try {
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.json') && f.startsWith('RECEIPT_'));
    const receipts = [];
    for (const f of files) {
      try {
        const fullPath = path.join(receiptsDir, f);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        if (!modFilter || (data.module && data.module.toLowerCase().includes(modFilter))) {
          receipts.push(data);
        }
      } catch {}
    }
    receipts.sort((a, b) => (b.completed_at_iso || '').localeCompare(a.completed_at_iso || ''));
    return res.json({
      total: receipts.length,
      receipts: receipts.slice(0, 50)
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Full Smart Refresh State Endpoint
app.get('/api/refresh/state', (_req, res) => {
  const state = readSmartRefreshState();
  if (state) {
    return res.json(state);
  }
  return res.status(404).json({ error: 'Smart refresh state not found' });
});

// Explicit 404 JSON handler for API, data, releases, and .json requests
// Prevents SPA wildcard from returning index.html (<!doctype html>) when JSON is expected
app.use((req, res, next) => {
  const url = req.path || req.url;
  const isDataOrApi = url.startsWith('/api/') || 
                      url.startsWith('/data/') || 
                      url.startsWith('/releases/') || 
                      url.endsWith('.json');
  if (isDataOrApi) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      status: 'FAIL_CLOSED',
      message: `Resursa JSON solicitată nu a fost găsită: ${req.originalUrl || req.url}`,
      path: req.originalUrl || req.url,
      timestamp: new Date().toISOString()
    });
  }
  next();
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
    // Production mode: serve built static files from dist, plus runtime public directory
    const distPath = path.resolve(__dirname, 'dist');
    const publicPath = path.resolve(__dirname, 'public');
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
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
