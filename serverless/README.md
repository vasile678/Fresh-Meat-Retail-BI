# Retail Media Monitor — Serverless On-Demand Gateway

## 1. De ce este necesar un gateway serverless pentru GitHub Pages?
**GitHub Pages este un serviciu de hosting exclusiv static.** El servește fișiere `.html`, `.js` și `.json` dintr-un CDN global, fără un runtime de execuție backend (fără Node.js, Python sau acces la sistemul de operare la momentul refresh-ului în browser).

Pentru a declanșa o colectare la cerere (on-demand) din browser fără a compromite securitatea:
1. Declanșarea unui workflow GitHub Actions necesită un **Personal Access Token (PAT)** GitHub cu drepturi de execuție (`repo` sau `actions:write`).
2. Dacă acest token ar fi inclus în codul JavaScript descărcat de browser pe GitHub Pages, **orice utilizator l-ar putea copia din DevTools**, obținând control complet asupra repository-ului.
3. Gateway-ul serverless (`serverless/retail-media-gateway.js`) funcționează ca un releu securizat:
   - Păstrează tokenul `GITHUB_PAT` criptat în variabilele de mediu ale serverless worker-ului.
   - Verifică cooldown-ul de 10 minute (600 secunde).
   - Aplică deduplicarea cererilor simultane și limitarea de trafic per IP.
   - Emite evenimentul securizat `repository_dispatch: on_demand_collect` către GitHub Actions.

---

## 2. Costuri și Cerințe
- **Cost:** **0.00 USD / lună** (100% Gratuit).
  - Cloudflare Workers oferă **100.000 de cereri gratuite pe zi**.
  - GitHub Actions oferă **2.000 de minute gratuite de rulare pe lună** pentru repository-uri publice/private standard.
- **Timp de configurare:** ~2-3 minute.
- **Fără cerințe DNS speciale:** Se poate folosi domeniul gratuit `*.workers.dev` oferit de Cloudflare.

---

## 3. Ghid de Configurare Pas cu Pas (Cloudflare Worker)

### Pasul 1: Generare Token GitHub
1. Accesează [GitHub Personal Access Tokens (Fine-grained sau Classic)](https://github.com/settings/tokens).
2. Creează un token nou cu permisiunile:
   - `repo` (sau `actions:write` pentru fine-grained pe repository-ul `Fresh-Meat-Retail-BI`).
3. Copiază tokenul generat (ex: `ghp_xxxxxxxxxxxxxxxxxxxx`).

### Pasul 2: Creare Worker în Cloudflare
1. Creează un cont gratuit pe [Cloudflare](https://dash.cloudflare.com/) (dacă nu ai deja).
2. Mergi la **Workers & Pages** → **Create Application** → **Create Worker**.
3. Denumește worker-ul (ex: `fresh-meat-collector-gateway`).
4. Apasă **Deploy**.
5. În ecranul worker-ului, apasă **Edit code** și înlocuiește tot conținutul cu codul din `serverless/retail-media-gateway.js`.
6. Apasă **Save and deploy**.

### Pasul 3: Adăugare Variabile Secrete în Cloudflare
1. În pagina worker-ului, mergi la **Settings** → **Variables and Secrets**.
2. Adaugă următoarele variabile:
   - `GITHUB_PAT` (Apasă **Encrypt**): inserează tokenul generat la Pasul 1.
   - `GITHUB_REPO`: `vasile678/Fresh-Meat-Retail-BI`
3. Salvează modificările.

### Pasul 4: Conectare cu GitHub Pages
În repository-ul GitHub, setează variabila în GitHub Actions Secrets sau în `.env.production`:
```env
VITE_COLLECTOR_API_URL=https://fresh-meat-collector-gateway.<contul-tau>.workers.dev
```
La următorul build, aplicația publicată pe GitHub Pages va interoga automat acest endpoint la fiecare refresh sau deschidere a tabului Media Monitor!
