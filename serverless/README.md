# Fresh Meat Retail BI — Hardened Serverless Dispatch Gateway v2.6

## 1. Arhitectură și Necesitate Tehnică
**GitHub Pages este o platformă de găzduire statică.** Aceasta distribuie fișiere HTML, JavaScript, JSON și imagini dintr-un CDN fără un backend activ în timpul navigării.

Pentru a realiza o cercetare autonomă la cerere sigură și auditată (Live On-Demand Research):
1. Declanșarea pipeline-ului GitHub Actions necesită un **GitHub Access Token**.
2. **Zero-Leak Policy:** Tokenul GitHub nu trebuie NICIODATĂ inclus în codul client sau în bundle-ul JavaScript publicat pe GitHub Pages.
3. Gateway-ul serverless (`serverless/fresh-meat-bi-gateway.js`) rulează pe **Cloudflare Workers (Edge)** și acționează ca un releu criptografic securizat:
   - **Autentifică utilizatorul / operatorul:** Rejează cererile anonime publice (HTTP 401 Unauthorized).
   - **Păstrează secretele:** Tokenul `GITHUB_PAT` și cheia `API_AUTH_KEY` sunt stocate exclusiv în Cloudflare Secret Bindings criptate.
   - **Stare durabilă distribuită (KV):** Folosește Cloudflare Workers KV (`env.BI_KV`) pentru un mutex global care previne execuțiile concurente pe multiple noduri edge din lume.
   - **Cooldown & Throttling:** Impune intervalul minim de 10 minute (600s) și rată per-IP.
   - **Trasabilitate reală a joburilor:** Emite `repository_dispatch` cu `job_id` și `correlation_id`, corelate cu rularea GitHub Actions reală (status `QUEUED` -> `RUNNING` -> `PUBLISHED` / `RELEASE_BLOCKED`).
   - **Fără procente artificiale:** Progresul reflectă stadiul real al execuției, nu simulatoare de timp.
   - **CORS restricționat:** Acceptă doar originea de producție `https://vasile678.github.io` și mediile de test autorizate.

---

## 2. Costuri și Resurse
- **Cost:** **0.00 USD / lună** (100% în Cloudflare & GitHub Free Tier).
  - Cloudflare Workers: 100.000 cereri gratuite / zi.
  - Cloudflare KV: 100.000 citiri / zi, 1.000 scrieri / zi gratuite.
  - GitHub Actions: 2.000 minute gratuite / lună.
- **Timp de configurare:** ~3–5 minute.
- **Domeniu:** Funcționează gratuit pe `https://fresh-meat-bi-gateway.<subdomeniu>.workers.dev`.

---

## 3. Ghid de Configurare și Activare în Producție

### Pasul 1: Generare Fine-Grained GitHub Token (Recomandat)
1. Accesează [GitHub Personal Access Tokens](https://github.com/settings/tokens?type=beta).
2. Configurează tokenul:
   - **Repository access:** *Only select repositories* → `vasile678/Fresh-Meat-Retail-BI`.
   - **Repository permissions:**
     * `Actions`: **Read and Write** (pentru declanșarea dispatches și citirea stării run-urilor).
     * `Contents`: **Read and Write** (pentru scrierea release-urilor validate).
     * `Metadata`: **Read-only**.
3. Generează și copiază tokenul (păstrează-l într-un manager de parole securizat; **nu îl introduceți în chat**).

### Pasul 2: Creare Worker și Binding KV în Cloudflare
1. Accesează [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create Application** → **Create Worker**.
2. Denumește worker-ul (ex: `fresh-meat-bi-gateway`) și apasă **Deploy**.
3. Creează un KV Namespace pentru sincronizarea globală a mutex-ului:
   - Mergi la **Workers & Pages** → **KV** → **Create a Namespace**.
   - Nume: `fresh_meat_bi_kv`.
4. Leagă KV Namespace la Worker:
   - În pagina worker-ului → **Settings** → **Bindings** → **Add** → **KV Namespace**.
   - Variable name: `BI_KV`
   - KV Namespace: selectează `fresh_meat_bi_kv`.
5. Apasă **Edit code** pe worker și înlocuiește conținutul cu `serverless/fresh-meat-bi-gateway.js`, apoi apasă **Save and deploy**.

### Pasul 3: Adăugare Variabile Secrete în Cloudflare
În pagina worker-ului → **Settings** → **Variables and Secrets**:
1. Adaugă Secret: `GITHUB_PAT` (Apasă **Encrypt**) → inserează tokenul GitHub.
2. Adaugă Secret: `API_AUTH_KEY` (Apasă **Encrypt**) → generează un șir secret puternic (ex: `openssl rand -hex 24`).
3. Adaugă Environment Variable: `GITHUB_REPO` = `vasile678/Fresh-Meat-Retail-BI`.
4. Salvează și aplică.

### Pasul 4: Conectare cu Aplicația Frontend
În `.env.production` sau în variabilele de build ale repository-ului:
```env
VITE_COLLECTOR_API_URL=https://fresh-meat-bi-gateway.<subdomeniul-tau>.workers.dev
```
Pentru ca un operator autorizat să declanșeze cercetarea din interfață, cheia `API_AUTH_KEY` poate fi salvată în browserul operatorului în `localStorage.setItem('fresh_meat_bi_auth_token', '<cheie>')`. Fără această cheie, vizitatorii publici primesc starea la zi a datelor fără permisiunea de a consuma minute GitHub Actions.

---

## 4. Testare și Verificare de Securitate End-to-End

### Test 1: Cerere anonimă (trebuie respinsă cu HTTP 401)
```bash
curl -i -X POST "https://fresh-meat-bi-gateway.<subdomeniu>.workers.dev/api/promo-weekly/trigger-collect" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```
*Răspuns așteptat:* `HTTP/1.1 401 Unauthorized` cu `{ "error": "UNAUTHORIZED" }`.

### Test 2: Cerere autorizată cu token valid (trebuie acceptată cu HTTP 200)
```bash
curl -i -X POST "https://fresh-meat-bi-gateway.<subdomeniu>.workers.dev/api/promo-weekly/trigger-collect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_AUTH_KEY>" \
  -d '{"force": true}'
```
*Răspuns așteptat:* `HTTP/1.1 200 OK` cu `{ "status": "REQUESTED", "job_id": "JOB_PROMO_..." }`.

### Test 3: Deduplicare concurentă (trebuie să returneze jobul activ fără duplicare)
O a doua cerere imediată returnează `HTTP 200` cu `{ "status": "IN_PROGRESS", "job_id": "JOB_PROMO_..." }` și același job ID.
