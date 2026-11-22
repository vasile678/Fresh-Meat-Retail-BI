/**
 * Asset URL helper ensuring correct path resolution under GitHub Pages base URL (/Fresh-Meat-Retail-BI/)
 * and root deployments (AI Studio / Cloud Run / custom domain).
 */
export const getAssetUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // If running in browser: check whether the app is truly accessed under /Fresh-Meat-Retail-BI (e.g. GitHub Pages)
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/Fresh-Meat-Retail-BI')) {
      return `/Fresh-Meat-Retail-BI${cleanPath}`;
    }
    return cleanPath;
  }

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}${cleanPath}`;
};

export interface BucharestWeekInfo {
  targetWeek: string; // e.g. "WK47"
  targetYear: number; // e.g. 2026
  targetPeriod: string; // e.g. "16–22 NOI 2026"
  isMondayMorning: boolean; // Monday before 09:00 EET
}

/**
 * Calculates current authoritative ISO week in Europe/Bucharest timezone
 * respecting the governance transition rule:
 * Every Monday at 09:00 Europe/Bucharest, the target week advances.
 * If Monday before 09:00, target week is previous week.
 */
export function getCurrentBucharestISOWeek(date = new Date()): BucharestWeekInfo {
  try {
    const bucharestStr = date.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' });
    const bDate = new Date(bucharestStr);
    
    const dayOfWeek = bDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hours = bDate.getHours();
    const minutes = bDate.getMinutes();

    // Transition rule: Monday before 09:00 belongs to prior week
    const effectiveDate = new Date(bDate.getTime());
    const isMondayMorning = dayOfWeek === 1 && (hours < 9 || (hours === 9 && minutes === 0));
    if (isMondayMorning) {
      effectiveDate.setDate(effectiveDate.getDate() - 7);
    }

    // ISO 8601 week number calculation
    const target = new Date(effectiveDate.valueOf());
    const dayNr = (effectiveDate.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const targetYear = new Date(firstThursday).getFullYear();
    const targetWeek = `WK${weekNum < 10 ? '0' + weekNum : weekNum}`;

    // Calculate Monday and Sunday of target week
    const jan4 = new Date(targetYear, 0, 4);
    const jan4Day = (jan4.getDay() + 6) % 7;
    const targetMon = new Date(jan4);
    targetMon.setDate(jan4.getDate() - jan4Day + (weekNum - 1) * 7);
    const targetSun = new Date(targetMon);
    targetSun.setDate(targetMon.getDate() + 6);

    const monthsRo = ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC'];
    const m1 = monthsRo[targetMon.getMonth()];
    const m2 = monthsRo[targetSun.getMonth()];
    const d1 = String(targetMon.getDate()).padStart(2, '0');
    const d2 = String(targetSun.getDate()).padStart(2, '0');

    const targetPeriod = (targetMon.getMonth() === targetSun.getMonth())
      ? `${d1}–${d2} ${m1} ${targetYear}`
      : `${d1} ${m1} – ${d2} ${m2} ${targetYear}`;

    return { targetWeek, targetYear, targetPeriod, isMondayMorning };
  } catch {
    return {
      targetWeek: 'WK47',
      targetYear: 2026,
      targetPeriod: '16–22 NOI 2026',
      isMondayMorning: false
    };
  }
}

