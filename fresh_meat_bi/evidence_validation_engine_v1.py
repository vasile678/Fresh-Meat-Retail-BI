#!/usr/bin/env python3
"""
Fresh Meat Retail BI — Subetapa 5A.1: Security Hardening (Evidence & Validation Engine)

Remedieri și controale de securitate implementate:
1. Proveniență URL:
   - Parsare structurală cu urllib.parse (fără căutări naive de subșir).
   - Impunere strictă schemă HTTPS (respinge HTTP, FTP, FILE).
   - Potrivire exactă hostname pe FQDN și subdomenii explicit autorizate.
   - Respingere URL-uri cu domenii oficiale plasate în cale (path), interogare (query) sau userinfo (@).
   - Respingere URL-uri malformate și parametri de redirecționare nevalidați (?redirect=, ?url=, etc.).
   - Disjuncția textului 'catalog oficial' nu mai constituie dovadă de sine stătătoare.
   - Documentare: validarea hostname-ului dovedește doar punctul de acces, nu autenticitatea documentului.

2. Autorizare Criptografică HMAC:
   - Eliminat complet saltul hardcodat din cod.
   - Utilizare exclusivă hmac.new(..., hashlib.sha256) și hmac.compare_digest().
   - Încărcare secret exclusiv din variabila de mediu FRESH_MEAT_HMAC_SECRET.
   - Dacă secretul lipsește: returnează NOT_CONFIGURED / FAIL_CLOSED (fără simulare de PASS).
   - Semnătura leagă: approval_id, authorizer_id, role, scope, year, week, dataset_sha256, issued_at, expires_at.
   - Verificare temporală strictă: respinge aprobările viitoare sau expirate.
   - Protecție anti-replay prin registru de aprobări consumate.

3. Izolare Garanții:
   - production_eligible este strict False.
   - Nicio operațiune de scriere în fișiere de producție sau public/.
"""

import os
import re
import json
import hmac
import hashlib
import datetime
import urllib.parse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set

BASE = Path(__file__).resolve().parent

# 1. Registru de Proveniență Oficială — Hostname-uri FQDN Autorizate Strict
OFFICIAL_PROVENANCE_REGISTRY = {
    "Kaufland": {
        "authorized_hosts": {"kaufland.ro", "catalog.kaufland.ro"},
        "official_apps": {"kaufland card"}
    },
    "Lidl": {
        "authorized_hosts": {"lidl.ro", "surprize.lidl.ro"},
        "official_apps": {"lidl plus"}
    },
    "PENNY": {
        "authorized_hosts": {"penny.ro", "catalog.penny.ro"},
        "official_apps": {"penny card"}
    },
    "Carrefour": {
        "authorized_hosts": {"carrefour.ro", "catalog.carrefour.ro"},
        "official_apps": {"act for good"}
    },
    "Auchan": {
        "authorized_hosts": {"auchan.ro", "catalog.auchan.ro"},
        "official_apps": {"myauchan"}
    }
}

# 2. Registru de Semnatari Comerciali și Politică de Roluri
AUTHORIZED_SIGNERS_REGISTRY = {
    "SIGNER-COMM-01": {
        "name": "Director Comercial Carne Proaspătă",
        "role": "COMMERCIAL_DIRECTOR",
        "active": True,
        "allowed_scopes": ["PROMO", "EU_PORK_MARKET"]
    },
    "SIGNER-LEAD-02": {
        "name": "Lead Analyst Retail BI",
        "role": "LEAD_ANALYST",
        "active": True,
        "allowed_scopes": ["PROMO"]
    },
    "SIGNER-REVOKED-99": {
        "name": "Fost Operator Revocat",
        "role": "COMMERCIAL_ANALYST",
        "active": False,
        "allowed_scopes": []
    }
}

# 3. KVI 7-Dimensional Reference Rules
KVI_RULES = {
    "Spată porc fără os": {
        "species": "porc",
        "cut_keywords": ["spată", "spata"],
        "bone_status": "fără os",
        "prohibited_keywords": ["cu os", "costiță", "marinat", "afumat", "cuburi", "tocată", "mici"]
    },
    "Pulpă porc fără os": {
        "species": "porc",
        "cut_keywords": ["pulpă", "pulpa"],
        "bone_status": "fără os",
        "prohibited_keywords": ["cu os", "ciolan", "marinat", "afumat", "cuburi", "tocată"]
    },
    "Cotlet porc fără os": {
        "species": "porc",
        "cut_keywords": ["cotlet"],
        "bone_status": "fără os",
        "prohibited_keywords": ["cu os", "marinat", "afumat", "ceafă", "piept"]
    },
    "Ceafă porc fără os": {
        "species": "porc",
        "cut_keywords": ["ceafă", "ceafa"],
        "bone_status": "fără os",
        "prohibited_keywords": ["cu os", "marinat", "condimentat", "grill", "afumat"]
    },
    "Piept pui dezosat": {
        "species": "pui",
        "cut_keywords": ["piept"],
        "bone_status": "fără os",
        "prohibited_keywords": ["cu os", "aripi", "copănele", "marinat", "afumat", "porc"]
    }
}

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def sha256_str(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class EvidenceValidationEngine:
    def __init__(self, evidence_root: Optional[Path] = None, secret_override: Optional[str] = None):
        self.evidence_root = evidence_root or (BASE / "evidence")
        self._secret_override = secret_override
        # Registru în memorie pentru aprobări consumate (anti-replay la nivel de proces)
        self._consumed_approval_ids: Set[str] = set()

    # --- 1. Proveniență URL Structurală (RFC 3986) ---
    def verify_provenance(self, retailer: str, source_str: str, source_url: Optional[str] = None) -> Tuple[bool, str]:
        """
        Validează structural proveniența sursei web:
        - Exclusiv HTTPS.
        - Parsare structurală cu urllib.parse.
        - Potrivire exactă a hostname-ului pe lista albă oficială a retailerului.
        - Respingere userinfo (@), parametri de redirect și subdomenii neautorizate.
        
        Notă de guvernanță: Validarea hostname-ului garantează doar canalul de acces web;
        autenticitatea documentului este dovedită separat prin hash-ul SHA-256 al decupajului fizic.
        """
        registry = OFFICIAL_PROVENANCE_REGISTRY.get(retailer)
        if not registry:
            return False, f"RETAILER_UNREGISTERED: '{retailer}' nu are o listă de proveniență configurată"

        if not source_url or not isinstance(source_url, str) or not source_url.strip():
            return False, "PROVENANCE_URL_REQUIRED: Simpla mențiune textuală fără URL web validat HTTPS este insuficientă"

        try:
            parsed = urllib.parse.urlparse(source_url.strip())
        except Exception as e:
            return False, f"MALFORMED_URL: {e}"

        # 1. Impunere strictă schemă HTTPS
        if parsed.scheme.lower() != "https":
            return False, f"INSECURE_SCHEME: Schema '{parsed.scheme}' este strict interzisă. Exclusiv HTTPS este permis."

        # 2. Respingere userinfo (@ în autoritate - vector de phishing URL)
        if parsed.username or parsed.password or "@" in (parsed.netloc or ""):
            return False, "CREDENTIALS_IN_URL_REJECTED: URL-ul conține userinfo (@), potențial vector de atac"

        # 3. Extragere FQDN curat (fără port)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False, "MALFORMED_URL_NO_HOSTNAME"

        # 4. Potrivire exactă pe hostname-uri autorizate (fără subșiruri)
        authorized_hosts = registry["authorized_hosts"]
        if hostname not in authorized_hosts:
            return False, f"UNAUTHORIZED_HOSTNAME: Hostname-ul '{hostname}' nu este în lista autorizată {list(authorized_hosts)}"

        # 5. Detectare parametri de redirecționare nevalidați în query string
        query_lower = (parsed.query or "").lower()
        redirect_params = ["redirect=", "url=", "goto=", "return=", "return_to=", "dest="]
        if any(p in query_lower for p in redirect_params):
            return False, "UNVALIDATED_REDIRECT_PARAM_REJECTED: URL-ul conține parametri de redirecționare externă"

        return True, f"OFFICIAL_PROVENANCE_CONFIRMED: Hostname HTTPS legitim ({hostname})"

    # --- 2. Verificare Integritate Fizică a Artefactului ---
    def verify_artifact_integrity(self, artifact_rel_path: str, expected_sha: str) -> Tuple[bool, str]:
        if not artifact_rel_path:
            return False, "ARTIFACT_PATH_MISSING"

        full_path = self.evidence_root / artifact_rel_path
        if not full_path.exists():
            return False, f"ARTIFACT_FILE_NOT_FOUND: {full_path}"

        actual_sha = sha256_file(full_path)
        if not hmac.compare_digest(actual_sha.lower(), expected_sha.lower()):
            return False, f"ARTIFACT_HASH_CORRUPT: expected {expected_sha}, got {actual_sha}"

        return True, "ARTIFACT_VERIFIED"

    # --- 3. Validare Temporală Dublă ---
    def verify_temporal_validity(self, validity_str: str, week_str: str, year: int,
                                 captured_at_iso: str) -> Tuple[bool, str, Dict[str, Any]]:
        m = re.match(r"^WK(\d{1,2})$", week_str.upper())
        if not m:
            return False, "INVALID_WEEK_FORMAT", {}
        week_num = int(m.group(1))

        mon = datetime.date.fromisocalendar(year, week_num, 1)
        sun = datetime.date.fromisocalendar(year, week_num, 7)

        window_start = mon - datetime.timedelta(days=3)
        window_end = sun + datetime.timedelta(days=3)

        try:
            capture_date = datetime.datetime.fromisoformat(captured_at_iso.replace("Z", "+00:00")).date()
        except Exception as e:
            return False, f"INVALID_CAPTURE_TIMESTAMP: {e}", {}

        if capture_date < window_start or capture_date > window_end:
            return False, f"CAPTURE_OUTSIDE_RESEARCH_WINDOW: {capture_date} nu este în intervalul [{window_start}, {window_end}]", {}

        date_pattern = r"(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?[\s–-]+(\d{1,2})\.(\d{1,2})\.(\d{4})"
        vm = re.search(date_pattern, validity_str or "")
        if not vm:
            return False, f"UNPARSEABLE_VALIDITY_DATES: '{validity_str}'", {}

        d1, m1, y1_opt, d2, m2, y2 = vm.groups()
        y1 = int(y1_opt) if y1_opt else int(y2)
        start_date = datetime.date(y1, int(m1), int(d1))
        end_date = datetime.date(int(y2), int(m2), int(d2))

        overlap_start = max(start_date, mon)
        overlap_end = min(end_date, sun)
        overlap_days = (overlap_end - overlap_start).days + 1 if overlap_end >= overlap_start else 0

        details = {
            "commercial_week": f"{mon} -> {sun}",
            "research_window": f"{window_start} -> {window_end}",
            "promo_interval": f"{start_date} -> {end_date}",
            "overlap_days_with_commercial_week": overlap_days
        }

        if overlap_days <= 0:
            return False, f"ZERO_COMMERCIAL_OVERLAP: Oferta ({start_date}->{end_date}) nu se suprapune cu săptămâna comercială ({mon}->{sun})", details

        return True, "TEMPORAL_VALIDATION_PASS", details

    # --- 4. Motor 7D Like-For-Like ---
    def evaluate_7d_like_for_like(self, kvi: str, product_title: str,
                                  price_lei_kg: Optional[float], mechanic: Optional[str] = None) -> Tuple[str, str]:
        rules = KVI_RULES.get(kvi)
        if not rules:
            return "NON_COMPARABLE_7D", f"UNKNOWN_KVI: {kvi}"

        p_lower = (product_title or "").lower()

        # D1: Specie
        if rules["species"] == "porc" and "pui" in p_lower:
            return "NON_COMPARABLE_7D", "SPECIES_MISMATCH: găsit pui pentru KVI porc"
        if rules["species"] == "pui" and "porc" in p_lower:
            return "NON_COMPARABLE_7D", "SPECIES_MISMATCH: găsit porc pentru KVI pui"

        # D2, D3, D4: Termeni interziși (os, marinat, afumat, procesat)
        for bad in rules["prohibited_keywords"]:
            if bad in p_lower:
                return "NON_COMPARABLE_7D", f"LIKE_FOR_LIKE_VIOLATION: conține '{bad}'"

        # Verificare mențiune piesă
        cut_found = any(k in p_lower for k in rules["cut_keywords"])
        if not cut_found:
            return "NON_COMPARABLE_7D", f"CUT_MISMATCH: denumirea nu conține piesa '{kvi}'"

        # D5: Ambiguități de format și feliere -> NEEDS_REVIEW obligatoriu
        ambiguous_tokens = ["feliat", "feliate", "caserolă", "caserola", "cuburi", "preambalat", "family pack", "special"]
        if any(tok in p_lower for tok in ambiguous_tokens):
            return "NEEDS_REVIEW", f"FORMAT_AMBIGUOUS: Necesită review manual pentru formatul '{product_title}'"

        # D6: Plauzibilitate preț normalizat
        if price_lei_kg is None or price_lei_kg <= 0:
            return "NEEDS_REVIEW", "PRICE_MISSING_OR_ZERO"
        if price_lei_kg < 5.0 or price_lei_kg > 90.0:
            return "NEEDS_REVIEW", f"PRICE_OUTLIER_SUSPICIOUS: {price_lei_kg} lei/kg este în afara limitelor normale de piață"

        return "VERIFIED_ELIGIBLE", "LIKE_FOR_LIKE_CONFIRMED"

    # --- 5. Autorizare Criptografică HMAC Securizată ---
    def verify_commercial_authorization(self, auth_token: Dict[str, Any], dataset_sha: str,
                                        week: str, year: int) -> Tuple[bool, str, str]:
        """
        Verifică autorizarea comercială:
        - Încarcă secretul exclusiv din FRESH_MEAT_HMAC_SECRET (eșuează NOT_CONFIGURED dacă lipsește).
        - hmac.new(..., hashlib.sha256) și hmac.compare_digest().
        - Leagă: approval_id, authorizer_id, role, scope, year, week, dataset_sha, issued_at, expires_at.
        - Validează expirarea și fereastra temporală.
        - Detectează și blochează reutilizarea approval_id (anti-replay în memorie).
        """
        # 1. Încărcare secret securizat
        secret = self._secret_override or os.environ.get("FRESH_MEAT_HMAC_SECRET")
        if not secret or len(secret) < 32:
            return False, "HMAC_SECRET_NOT_CONFIGURED: Variabila de mediu FRESH_MEAT_HMAC_SECRET lipsește sau este nesigură (<32 caractere). Regula FAIL_CLOSED.", "NOT_CONFIGURED"

        if not isinstance(auth_token, dict):
            return False, "INVALID_AUTH_STRUCTURE: Aprobarea trebuie să fie un obiect JSON structurat", "INVALID_AUTH"

        approval_id = auth_token.get("approval_id")
        if not approval_id:
            return False, "APPROVAL_ID_MISSING: Fiecare aprobare necesită un identificator unic (UUID)", "INVALID_AUTH"

        # 2. Verificare anti-replay în memorie
        if approval_id in self._consumed_approval_ids:
            return False, f"REPLAY_DETECTED: Aprobarea comercială '{approval_id}' a fost deja consumată", "REPLAY"

        signer_id = auth_token.get("authorizer_id")
        signer = AUTHORIZED_SIGNERS_REGISTRY.get(signer_id)
        if not signer:
            return False, f"UNRECOGNIZED_SIGNER: '{signer_id}' nu există în registrul de semnatari autorizați", "UNAUTHORIZED"

        if not signer.get("active"):
            return False, f"SIGNER_REVOKED: Semnatarul '{signer_id}' este revocat / inactiv", "REVOKED"

        role = auth_token.get("role")
        if role != signer.get("role"):
            return False, f"ROLE_MISMATCH: Rolul declarat '{role}' nu corespunde rolului atribuit '{signer.get('role')}'", "UNAUTHORIZED"

        scope = auth_token.get("scope")
        if scope not in signer.get("allowed_scopes", []):
            return False, f"UNAUTHORIZED_SCOPE: Semnatarul nu are permisiuni pe domeniul '{scope}'", "UNAUTHORIZED"

        # 3. Legătură de săptămână și an
        auth_week = auth_token.get("week")
        auth_year = auth_token.get("year")
        if str(auth_week).upper() != str(week).upper() or int(auth_year or 0) != int(year):
            return False, f"WEEK_YEAR_MISMATCH: Aprobarea este emisă pentru {auth_week}/{auth_year}, dar setul auditat este {week}/{year}", "SCOPE_MISMATCH"

        # 4. Verificare temporală (issued_at / expires_at)
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        try:
            issued_at = datetime.datetime.fromisoformat(auth_token.get("issued_at", "").replace("Z", "+00:00"))
            expires_at = datetime.datetime.fromisoformat(auth_token.get("expires_at", "").replace("Z", "+00:00"))
        except Exception as e:
            return False, f"INVALID_SIGNATURE_TIMESTAMPS: {e}", "INVALID_AUTH"

        if now_utc < issued_at:
            return False, f"APPROVAL_FUTURE_DATED: Aprobarea este datată în viitor ({issued_at})", "TEMPORAL_FAIL"
        if now_utc > expires_at:
            return False, f"APPROVAL_EXPIRED: Aprobarea a expirat la {expires_at}", "EXPIRED"

        # 5. Calcul HMAC peste mesaj canonic delimitat
        canonical_message = f"{approval_id}:{signer_id}:{role}:{scope}:{year}:{week}:{dataset_sha}:{auth_token.get('issued_at')}:{auth_token.get('expires_at')}"
        expected_sig = hmac.new(secret.encode("utf-8"), canonical_message.encode("utf-8"), hashlib.sha256).hexdigest()
        provided_sig = auth_token.get("signature_token", "")

        if not hmac.compare_digest(str(provided_sig).lower(), expected_sig.lower()):
            return False, "SIGNATURE_VERIFICATION_FAILED: Semnătura HMAC nu este validă", "FORGED_SIGNATURE"

        # Înregistrare consum anti-replay
        self._consumed_approval_ids.add(approval_id)
        return True, f"COMMERCIAL_AUTHORIZATION_VERIFIED: {signer['name']} ({role})", "PASS"

    # --- 6. Reconcilier Celulă & Păstrare NEEDS_REVIEW ---
    def reconcile_cell(self, existing_offers: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], str, List[str]]:
        if not existing_offers:
            return None, "N/V", ["NO_OFFERS_SUBMITTED"]

        valid_offers = [o for o in existing_offers if o.get("internal_status") == "VERIFIED_ELIGIBLE"]
        review_offers = [o for o in existing_offers if o.get("internal_status") == "NEEDS_REVIEW"]
        nc_offers = [o for o in existing_offers if o.get("internal_status") == "NON_COMPARABLE_7D"]

        # Conflict între prețuri distincte
        if len(valid_offers) > 1:
            prices = {o["price_lei_kg"] for o in valid_offers}
            if len(prices) > 1:
                return None, "N/V", [f"UNRESOLVED_PRICE_CONFLICT: Surse multiple cu prețuri diferite {prices}"]

        if valid_offers:
            return valid_offers[0], "VERIFIED", []

        # Ambiguitățile rămân NEEDS_REVIEW în audit și sunt mapate la N/V pe grilă (zero promovare)
        if review_offers:
            chosen = review_offers[0]
            reason = chosen.get("eval_reason", "AMBIGUOUS_FORMAT")
            return chosen, "N/V", [f"NEEDS_REVIEW: {reason}"]

        if nc_offers:
            return nc_offers[0], "NC", [f"NON_COMPARABLE: {nc_offers[0].get('eval_reason')}"]

        return None, "N/V", ["NO_VERIFIED_OFFER_AFTER_AUDIT"]

    # --- 7. Evaluare Pachet Candidat (Izolat: production_eligible = False) ---
    def evaluate_candidate_package(self, candidate_package: Dict[str, Any]) -> Dict[str, Any]:
        week = candidate_package.get("week")
        year = candidate_package.get("year", 2026)
        raw_offers = candidate_package.get("candidate_offers", [])
        auth_block = candidate_package.get("commercial_authorization", {})

        cell_evaluations = []
        overall_errors = []

        for offer in raw_offers:
            retailer = offer.get("retailer")
            kvi = offer.get("kvi")
            source = offer.get("source")
            url = offer.get("source_url")
            artifact_path = offer.get("artifact_path")
            artifact_sha = offer.get("artifact_sha256")
            validity = offer.get("validity")
            captured_at = offer.get("captured_at_utc")
            product_title = offer.get("exact_product")
            price = offer.get("price_lei_kg")

            prov_ok, prov_msg = self.verify_provenance(retailer, source, url)
            art_ok, art_msg = self.verify_artifact_integrity(artifact_path, artifact_sha) if artifact_path else (False, "NO_ARTIFACT")
            temp_ok, temp_msg, temp_details = self.verify_temporal_validity(validity, week, year, captured_at)
            internal_7d, reason_7d = self.evaluate_7d_like_for_like(kvi, product_title, price)

            if not prov_ok:
                int_status = "SUSPICIOUS_PROVENANCE"
                final_reason = prov_msg
            elif not art_ok:
                int_status = "ARTIFACT_UNVERIFIED"
                final_reason = art_msg
            elif not temp_ok:
                int_status = "TEMPORAL_MISMATCH"
                final_reason = temp_msg
            elif internal_7d != "VERIFIED_ELIGIBLE":
                int_status = internal_7d
                final_reason = reason_7d
            else:
                int_status = "VERIFIED_ELIGIBLE"
                final_reason = "ALL_5A_CHECKS_PASSED"

            offer["internal_status"] = int_status
            offer["eval_reason"] = final_reason
            offer["temporal_details"] = temp_details
            cell_evaluations.append(offer)

        # Calcul hash conținut auditat
        computed_ds_sha = sha256_str(json.dumps(cell_evaluations, sort_keys=True))
        auth_ok, auth_msg, auth_code = self.verify_commercial_authorization(auth_block, computed_ds_sha, week, year)
        if not auth_ok:
            overall_errors.append(f"AUTHORIZATION_FAIL [{auth_code}]: {auth_msg}")

        return {
            "schema_version": "5A-EVALUATION-REPORT",
            "production_eligible": False,  # Strict barrier: NEVER ACCEPTED BY RELEASE GATE
            "evaluation_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "week": week,
            "year": year,
            "offers_audited": len(cell_evaluations),
            "commercial_authorization_status": auth_msg,
            "commercial_authorization_code": auth_code,
            "authorization_verified": auth_ok,
            "internal_evaluations": cell_evaluations,
            "errors": overall_errors,
            "evaluation_outcome": "REJECT" if overall_errors else "EVALUATION_PASS_READY_FOR_STAGE_5B"
        }
