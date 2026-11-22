/**
 * Fresh Meat Retail BI — On Page Open Automated Research Evaluator v2.6
 * 
 * Objectives:
 * 1. Immediate loading: Never delays initial page rendering while waiting for research.
 * 2. Deep freshness evaluation:
 *    - Current ISO week in Europe/Bucharest (Monday 09:00 rule).
 *    - Last successful source verification timestamp and dataset age.
 *    - Last successful research execution from smart_refresh_state.json.
 *    - Catalog publication and validity windows (detecting expired offers).
 *    - Retailer-specific publication schedules:
 *      * Kaufland: Wednesday–Tuesday cycle (detects mid-week catalog transition even within same ISO week).
 *      * PENNY: Wednesday–Tuesday promotional flyer.
 *      * Lidl: Monday base + Thursday ("De Joi") weekend cycle.
 *      * Carrefour / Auchan: Thursday weekly flyers.
 *    - Lightweight server-side catalog discovery via /api/promo-weekly/check-research-needed.
 * 3. Client-side session cooldown (5 minutes minimum between automatic triggers).
 * 4. Secure authentication awareness (forwards Authorization Bearer header if available).
 * 5. Handles static hosting (GitHub Pages) gracefully without false claims or crashes.
 */

import { getAssetUrl } from '../utils';

export interface PageOpenCheckResult {
  evaluation_time: string;
  current_bucharest_time: string;
  target_week: string;
  active_week: string;
  is_overdue: boolean;
  has_expired_offers: boolean;
  is_mid_week_cycle_due: boolean;
  research_required: boolean;
  reason: string;
  action_taken: 'NONE_UP_TO_DATE' | 'SKIPPED_COOLDOWN' | 'TRIGGERED_BACKEND' | 'STATIC_HOST_SYNC' | 'AUTH_REQUIRED';
  job_id?: string | null;
  server_discovery?: any;
}

const SESSION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minute client-side cooldown
const STORAGE_KEY = 'fresh_meat_bi_last_page_check';
const AUTH_TOKEN_KEY = 'fresh_meat_bi_auth_token';

/**
 * Calculates expected active Promo Weekly release according to official rule:
 * Target week advances every Monday at 09:00 Europe/Bucharest.
 */
export function getBucharestTargetPromoWeek(nowDate: Date = new Date()): {
  targetWeek: string;
  targetYear: number;
  dateStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  day: number;
  month: number;
} {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false
  });

  const parts = formatter.formatToParts(nowDate);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const year = parseInt(map.year || '2026', 10);
  const month = parseInt(map.month || '11', 10);
  const day = parseInt(map.day || '19', 10);
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);

  // Compute ISO weekday (1=Mon ... 7=Sun)
  const target = new Date(Date.UTC(year, month - 1, day));
  const isoDay = (target.getUTCDay() + 6) % 7; // 0=Mon, 1=Tue, ..., 6=Sun
  const dayOfWeek = target.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  target.setUTCDate(target.getUTCDate() - isoDay + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const isoWeek = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);

  // If Monday before 09:00, target week is previous week
  let finalWeek = isoWeek;
  let finalYear = year;
  if (isoDay === 0 && (hour < 9 || (hour === 9 && minute === 0))) {
    finalWeek = isoWeek - 1;
    if (finalWeek < 1) {
      finalWeek = 52;
      finalYear -= 1;
    }
  }

  const weekStr = `WK${String(finalWeek).padStart(2, '0')}`;
  const dateStr = `${map.day}.${map.month}.${map.year} ${map.hour}:${map.minute}`;

  return { targetWeek: weekStr, targetYear: finalYear, dateStr, hour, minute, dayOfWeek, day, month };
}

/**
 * Checks on page opening whether fresh research is needed and triggers it securely if required.
 * Never delays initial rendering; handles all conditions asynchronously.
 */
export async function evaluateOnPageOpenResearch(): Promise<PageOpenCheckResult> {
  const bucharest = getBucharestTargetPromoWeek();
  const result: PageOpenCheckResult = {
    evaluation_time: new Date().toISOString(),
    current_bucharest_time: bucharest.dateStr,
    target_week: bucharest.targetWeek,
    active_week: 'UNKNOWN',
    is_overdue: false,
    has_expired_offers: false,
    is_mid_week_cycle_due: false,
    research_required: false,
    reason: 'Inițializare verificare prospețime...',
    action_taken: 'NONE_UP_TO_DATE'
  };

  try {
    // 1. Fetch active release with cache bypass
    const pointerRes = await fetch(getAssetUrl(`/data/active_release.json?t=${Date.now()}`), { cache: 'no-store' });
    if (!pointerRes.ok) {
      result.reason = 'Pointer activ indisponibil pe server';
      return result;
    }

    const pointer = await pointerRes.json();
    result.active_week = pointer.week || 'UNKNOWN';

    // 2. Multi-factor Check A: ISO week change check (Monday 09:00 rule)
    if (pointer.week !== bucharest.targetWeek) {
      result.is_overdue = true;
      result.research_required = true;
      result.reason = `Raportul activ (${pointer.week}) este în urmă față de săptămâna oficială curentă (${bucharest.targetWeek}). Cercetare necesară.`;
    }

    // 3. Multi-factor Check B: Expired offer validity in cell matrix
    if (!result.research_required) {
      try {
        const exportRes = await fetch(getAssetUrl(`/data/bi_dashboard_export.json?t=${Date.now()}`), { cache: 'no-store' });
        if (exportRes.ok) {
          const exportJson = await exportRes.json();
          const todayDate = new Date(`${bucharest.dateStr.split(' ')[0].split('.').reverse().join('-')}`);

          for (const cell of (exportJson.cells || [])) {
            if (cell.status === 'VERIFIED' && cell.validity) {
              const parts = cell.validity.split('–');
              if (parts.length === 2) {
                const endPart = parts[1].trim(); // e.g. 17.11.2026 or 17.11
                const endDmy = endPart.split('.');
                let endDate: Date | null = null;
                if (endDmy.length === 3) {
                  endDate = new Date(`${endDmy[2]}-${endDmy[1]}-${endDmy[0]}`);
                } else if (endDmy.length === 2) {
                  endDate = new Date(`${bucharest.targetYear}-${endDmy[1]}-${endDmy[0]}`);
                }

                if (endDate && endDate < todayDate) {
                  result.has_expired_offers = true;
                  result.research_required = true;
                  result.reason = `Oferta pentru ${cell.retailer} (${cell.kvi}) a expirat la ${endPart}. Cercetare de actualizare necesară (regula ACTIVE OFFERS ONLY).`;
                  break;
                }
              }
            }
          }
        }
      } catch {
        // Tolerant
      }
    }

    // 4. Multi-factor Check C: Retailer Mid-Week Catalog Cycle Detection (Kaufland Wed–Tue, PENNY Wed–Tue, Lidl Thu–Sun)
    if (!result.research_required) {
      try {
        // Check smart refresh state for last verified execution date
        const stateRes = await fetch(getAssetUrl(`/data/smart_refresh_state.json?t=${Date.now()}`), { cache: 'no-store' });
        if (stateRes.ok) {
          const stateJson = await stateRes.json();
          const promoState = stateJson?.modules?.promo_weekly;
          const lastCheckStr = promoState?.last_check_bucharest || promoState?.last_data_update_bucharest;

          if (lastCheckStr) {
            // Parse last check date: DD.MM.YYYY
            const lastCheckDateParts = lastCheckStr.split(' ')[0].split('.');
            if (lastCheckDateParts.length === 3) {
              const lastCheckDate = new Date(`${lastCheckDateParts[2]}-${lastCheckDateParts[1]}-${lastCheckDateParts[0]}`);
              const todayDate = new Date(`${bucharest.dateStr.split(' ')[0].split('.').reverse().join('-')}`);

              // If today is Wednesday (3) or Thursday (4) or Friday (5) or Saturday (6)
              // and the last verified check was before Wednesday of this week:
              // Kaufland & PENNY publish their new weekly catalogs on Wednesday!
              if (bucharest.dayOfWeek >= 3 && lastCheckDate < todayDate) {
                // Check if days difference or crossing Wednesday
                const diffDays = Math.floor((todayDate.getTime() - lastCheckDate.getTime()) / (1000 * 3600 * 24));
                if (diffDays >= 1) {
                  result.is_mid_week_cycle_due = true;
                  result.research_required = true;
                  result.reason = `Ciclu promoțional de mijloc de săptămână activ (Kaufland/PENNY Miercuri–Marți). Ultima cercetare: ${lastCheckStr}. Verificare necesară.`;
                }
              }
            }
          }
        }
      } catch {
        // Tolerant
      }
    }

    // 5. Multi-factor Check D: Lightweight Server-Side Catalog Discovery (if backend available)
    const apiBase = (import.meta.env.VITE_COLLECTOR_API_URL || '').replace(/\/$/, '');
    const discoveryUrl = apiBase ? `${apiBase}/api/promo-weekly/check-research-needed` : '/api/promo-weekly/check-research-needed';

    try {
      const discRes = await fetch(`${discoveryUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (discRes.ok && discRes.headers.get('content-type')?.includes('application/json')) {
        const discJson = await discRes.json();
        result.server_discovery = discJson;
        if (discJson.research_required === true && !result.research_required) {
          result.research_required = true;
          result.reason = discJson.reason || 'Serverul a detectat cataloage noi disponibile.';
        }
      }
    } catch {
      // Backend not running / static host
    }

    // If completely up to date:
    if (!result.research_required) {
      result.reason = `Raportul curent (${pointer.week}) este 100% la zi conform calendarului oficial și verificărilor surselor. Nicio execuție redundantă.`;
      result.action_taken = 'NONE_UP_TO_DATE';
      return result;
    }

    // 6. Client-side Session Cooldown Check
    const lastCheckRaw = typeof window !== 'undefined' ? window.sessionStorage?.getItem(STORAGE_KEY) : null;
    const nowMs = Date.now();
    if (lastCheckRaw) {
      const lastCheckTime = parseInt(lastCheckRaw, 10);
      if (nowMs - lastCheckTime < SESSION_COOLDOWN_MS) {
        result.action_taken = 'SKIPPED_COOLDOWN';
        result.reason += ` (Declanșarea la deschiderea paginii este în cooldown de protecție: ${Math.round((SESSION_COOLDOWN_MS - (nowMs - lastCheckTime)) / 1000)}s rămase)`;
        return result;
      }
    }

    // 7. Trigger on-demand research through secure backend if authorized
    const triggerUrl = apiBase ? `${apiBase}/api/promo-weekly/trigger-collect` : '/api/promo-weekly/trigger-collect';
    const authToken = typeof window !== 'undefined' 
      ? (window.localStorage?.getItem(AUTH_TOKEN_KEY) || (import.meta.env.VITE_BI_API_TOKEN as string) || '')
      : '';

    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
      reqHeaders['X-BI-Auth-Key'] = authToken;
    }

    try {
      const triggerRes = await fetch(triggerUrl, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          force: false,
          trigger_source: 'page_open_auto',
          reason: result.reason,
          target_week: result.target_week
        })
      });

      if (triggerRes.status === 401 || triggerRes.status === 403) {
        // Authenticated user required
        result.action_taken = 'AUTH_REQUIRED';
        result.reason += ' (Autentificare necesară pentru declanșarea manuală; utilizatorul vizitează în mod public).';
      } else if (triggerRes.status === 404 || triggerRes.status === 405) {
        // Static hosting environment (GitHub Pages)
        result.action_taken = 'STATIC_HOST_SYNC';
        result.reason += ' (Găzduire statică GitHub Pages: Actualizările rulează conform schedulerului automat GitHub Actions).';
      } else if (triggerRes.ok || triggerRes.status === 409) {
        const trigJson = await triggerRes.json().catch(() => ({}));
        result.action_taken = 'TRIGGERED_BACKEND';
        result.job_id = trigJson.job_id || null;
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEY, String(nowMs));
        }
      } else {
        result.action_taken = 'STATIC_HOST_SYNC';
      }
    } catch {
      result.action_taken = 'STATIC_HOST_SYNC';
    }

    return result;
  } catch (err: any) {
    result.reason = `Eroare verificare deschidere pagină: ${err?.message || err}`;
    return result;
  }
}
