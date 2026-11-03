/**
 * RETAIL MEDIA MONITOR — SERVERLESS DISPATCH GATEWAY (Cloudflare Worker / Vercel Edge)
 * 
 * Funcționalitate:
 * 1. Punte serverless securizată între clientul static (GitHub Pages) și GitHub Actions.
 * 2. Protejează secretul GITHUB_PAT — tokenul nu ajunge niciodată în browserul utilizatorului.
 * 3. Impune cooldown global strict de 10 minute (600s) și deduplicare concurentă.
 * 4. Protecție rate-limiting per IP împotriva abuzului din partea utilizatorilor anonimi.
 * 5. Cost: 0.00 USD (Rulează 100% în Free Tier: 100.000 cereri/zi pe Cloudflare Workers).
 */

const COOLDOWN_SECONDS = 600; // 10 minute
const ALLOWED_ORIGINS = [
  "https://vasile678.github.io",
  "http://localhost:3000",
  "http://localhost:5173"
];

// În memorie sau Cloudflare KV
let lastDispatchTimestamp = 0;
let isDispatchActive = false;
const ipRateLimitMap = new Map();

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 1. Status endpoint: GET /api/retail-media/status
    if (url.pathname === "/api/retail-media/status" && request.method === "GET") {
      const now = Date.now();
      const elapsed = Math.floor((now - lastDispatchTimestamp) / 1000);
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed);

      return new Response(JSON.stringify({
        status: isDispatchActive ? "COLLECTING" : (remaining > 0 ? "COOLDOWN" : "IDLE"),
        is_collecting: isDispatchActive,
        cooldown_remaining_seconds: remaining,
        can_collect_now: !isDispatchActive && remaining === 0,
        min_interval_minutes: 10,
        provider: "serverless_gateway",
        backend: "github_actions_dispatcher"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 2. Trigger endpoint: POST /api/retail-media/trigger-collect
    if (url.pathname === "/api/retail-media/trigger-collect" && request.method === "POST") {
      const now = Date.now();
      const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "anonymous";

      // A. Verificare rate limiting per IP (max 1 cerere la 10 minute)
      const lastIpRequest = ipRateLimitMap.get(clientIp) || 0;
      if (now - lastIpRequest < COOLDOWN_SECONDS * 1000) {
        const ipWait = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - lastIpRequest)) / 1000);
        return new Response(JSON.stringify({
          success: false,
          status: "IP_RATE_LIMITED",
          message: `Limita de apeluri per IP activă. Reîncercați în ${ipWait} secunde.`,
          wait_seconds: ipWait
        }), { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // B. Verificare cooldown global (10 minute între colectări pe repository)
      const elapsed = Math.floor((now - lastDispatchTimestamp) / 1000);
      if (elapsed < COOLDOWN_SECONDS && lastDispatchTimestamp > 0) {
        const wait = COOLDOWN_SECONDS - elapsed;
        return new Response(JSON.stringify({
          success: false,
          status: "COOLDOWN",
          message: `Fereastra globală de 10 minute este activă. Reîncercați în ${wait} secunde.`,
          wait_seconds: wait
        }), { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // C. Verificare concurență unică
      if (isDispatchActive) {
        return new Response(JSON.stringify({
          success: false,
          status: "IN_PROGRESS",
          message: "O sesiune de colectare este deja activă pe server. Solicitare deduplicată."
        }), { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // D. Preluare variabile securizate din environment (secrete serverless)
      const GITHUB_PAT = env.GITHUB_PAT || "";
      const GITHUB_REPO = env.GITHUB_REPO || "vasile678/Fresh-Meat-Retail-BI";

      if (!GITHUB_PAT) {
        return new Response(JSON.stringify({
          success: false,
          status: "CONFIGURATION_ERROR",
          message: "GITHUB_PAT nu este configurat în variabilele secrete ale worker-ului."
        }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // E. Declanșare GitHub Actions repository_dispatch
      isDispatchActive = true;
      ipRateLimitMap.set(clientIp, now);

      try {
        const ghResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": `Bearer ${GITHUB_PAT}`,
            "User-Agent": "Retail-Media-Serverless-Gateway"
          },
          body: JSON.stringify({
            event_type: "on_demand_collect",
            client_payload: {
              triggered_at: new Date().toISOString(),
              client_ip: clientIp.substring(0, 7) + "***"
            }
          })
        });

        if (ghResponse.ok || ghResponse.status === 204) {
          lastDispatchTimestamp = Date.now();
          // Reset status după scurt timp (jobul rulează în fundal pe GitHub)
          setTimeout(() => { isDispatchActive = false; }, 45000);

          return new Response(JSON.stringify({
            success: true,
            status: "DISPATCHED",
            message: "Colectarea live a fost declanșată cu succes în GitHub Actions. Datele vor fi publicate pe GitHub Pages în 40-60 secunde."
          }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
        } else {
          isDispatchActive = false;
          const errText = await ghResponse.text();
          return new Response(JSON.stringify({
            success: false,
            status: "DISPATCH_FAILED",
            error: errText
          }), { status: ghResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      } catch (err) {
        isDispatchActive = false;
        return new Response(JSON.stringify({
          success: false,
          status: "NETWORK_ERROR",
          error: err.message
        }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
