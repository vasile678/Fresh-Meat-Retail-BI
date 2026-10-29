#!/usr/bin/env python3
"""
Test Suite for Substage 5A.1: Security Hardening (Evidence & Validation Engine)
Validates:
1. Rejection of malicious URLs containing official domains in path, query, userinfo, or suffix.
2. Rejection of insecure schemes (HTTP, FTP, FILE) and malformed URLs.
3. Rejection of unauthorized subdomains.
4. Rejection of unvalidated redirects in query string.
5. Rejection when HMAC secret is not configured (FAIL_CLOSED / NOT_CONFIGURED).
6. Rejection of forged or corrupted HMAC signatures.
7. Rejection of unauthorized roles or scope mismatch.
8. Rejection of expired approvals and future-dated approvals.
9. Rejection of approvals issued for a different week or year (cross-week replay).
10. Replay prevention for already consumed approval IDs.
11. Preservation of complete evidence for NEEDS_REVIEW (and mapping strictly to N/V, zero auto-promotion).
12. Strict isolation: production_eligible is False and rejected by Release Gate.
"""

import sys
import os
import json
import shutil
import hmac
import hashlib
import datetime
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent

if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

from evidence_validation_engine_v1 import (
    EvidenceValidationEngine,
    sha256_str,
    sha256_file
)

TEST_SECRET = "VERY_SECURE_TEST_KEY_THAT_HAS_OVER_32_CHARACTERS_123456"

def setup_test_sandbox():
    sandbox = BASE / "tmp_test_5a1_sandbox"
    if sandbox.exists():
        shutil.rmtree(sandbox)
    sandbox.mkdir(parents=True, exist_ok=True)
    return sandbox

def test_1_malicious_urls_with_official_domains():
    print("[TEST 1/12] Test: Respingere URL-uri malițioase ce conțin domenii oficiale...")
    engine = EvidenceValidationEngine()

    malicious_candidates = [
        # Domain in path
        ("Kaufland", "https://attacker.com/kaufland.ro/promo.html"),
        ("Lidl", "https://evil.org/phishing/lidl.ro"),
        # Domain in query
        ("Kaufland", "https://attacker.com/view?item=kaufland.ro"),
        # Domain in userinfo
        ("Kaufland", "https://kaufland.ro@attacker.com/payload"),
        ("PENNY", "https://penny.ro:secret@evil.net/fake"),
        # Domain as prefix of attacker domain
        ("Kaufland", "https://kaufland.ro.attacker-controlled.com/catalog"),
        ("Lidl", "https://lidl.ro.phishing.site/oferte"),
        ("Carrefour", "https://fake-carrefour.ro/promo"),
        # Typo-squatting
        ("Auchan", "https://auchan-romania.com/catalog")
    ]

    for retailer, bad_url in malicious_candidates:
        ok, msg = engine.verify_provenance(retailer, "Catalog Oficial", bad_url)
        assert not ok, f"URL-ul malițios '{bad_url}' ar fi trebuit respins pentru {retailer}!"
        assert any(term in msg for term in ["UNAUTHORIZED_HOSTNAME", "CREDENTIALS_IN_URL_REJECTED", "MALFORMED_URL"])

    # Legitimate exact FQDN
    ok_real, msg_real = engine.verify_provenance("Kaufland", "Catalog Oficial", "https://catalog.kaufland.ro/ro-kaufland-catalog-wk44/page/1")
    assert ok_real, f"URL-ul legitim a eșuat: {msg_real}"
    print("  ✓ Toate tentativele de injectare a domeniului oficial în URL-uri ostile sunt blocate: PASS\n")

def test_2_insecure_schemes_and_malformed_urls():
    print("[TEST 2/12] Test: Respingere scheme HTTP, FTP, FILE și URL-uri malformate...")
    engine = EvidenceValidationEngine()

    bad_schemes = [
        ("Kaufland", "http://catalog.kaufland.ro/catalog"),
        ("Lidl", "ftp://lidl.ro/cataloage/oferta.pdf"),
        ("PENNY", "file:///etc/passwd"),
        ("Carrefour", "javascript:alert(1)"),
        ("Auchan", "not_a_valid_url_scheme"),
        ("Kaufland", "")
    ]

    for retailer, url in bad_schemes:
        ok, msg = engine.verify_provenance(retailer, "Sursă", url)
        assert not ok, f"Schema nesigură '{url}' a fost permisă eronat!"
        assert any(term in msg for term in ["INSECURE_SCHEME", "MALFORMED_URL", "PROVENANCE_URL_REQUIRED"])

    print("  ✓ Schemele nesigure și URL-urile malformate sunt respinse: PASS\n")

def test_3_unauthorized_subdomains():
    print("[TEST 3/12] Test: Respingere subdomenii neautorizate...")
    engine = EvidenceValidationEngine()

    # Even though base domain is kaufland.ro, unapproved subdomains must be rejected
    unauthorized_subs = [
        ("Kaufland", "https://promo-unapproved.kaufland.ro/catalog"),
        ("Lidl", "https://dev-test.lidl.ro/promo"),
        ("PENNY", "https://internal.penny.ro/prices")
    ]

    for retailer, url in unauthorized_subs:
        ok, msg = engine.verify_provenance(retailer, "Catalog", url)
        assert not ok, f"Subdomeniul neautorizat '{url}' a fost permis!"
        assert "UNAUTHORIZED_HOSTNAME" in msg

    print("  ✓ Subdomeniile neautorizate explicit sunt respinse: PASS\n")

def test_4_unvalidated_redirect_parameters():
    print("[TEST 4/12] Test: Respingere parametri de redirecționare nevalidați...")
    engine = EvidenceValidationEngine()

    redirect_urls = [
        ("Kaufland", "https://catalog.kaufland.ro/click?redirect=https://evil.com/fake"),
        ("Lidl", "https://lidl.ro/nav?url=https://phishing.org/offers"),
        ("Carrefour", "https://carrefour.ro/login?goto=https://external.site")
    ]

    for retailer, url in redirect_urls:
        ok, msg = engine.verify_provenance(retailer, "Catalog", url)
        assert not ok, f"URL-ul cu redirect '{url}' nu a fost respins!"
        assert "UNVALIDATED_REDIRECT_PARAM_REJECTED" in msg

    print("  ✓ Parametrii de redirecționare externă sunt detectați și blocați: PASS\n")

def test_5_missing_hmac_secret_fails_closed():
    print("[TEST 5/12] Test: Lipsă secret HMAC returnează NOT_CONFIGURED / FAIL_CLOSED...")
    # Instantiate engine with NO secret override and ensure environment variable is clear
    if "FRESH_MEAT_HMAC_SECRET" in os.environ:
        del os.environ["FRESH_MEAT_HMAC_SECRET"]

    engine = EvidenceValidationEngine(secret_override=None)
    fake_token = {"approval_id": "APPR-01", "authorizer_id": "SIGNER-COMM-01"}

    ok, msg, code = engine.verify_commercial_authorization(fake_token, "dataset_sha_123", "WK44", 2026)
    assert not ok
    assert code == "NOT_CONFIGURED"
    assert "HMAC_SECRET_NOT_CONFIGURED" in msg
    assert "FAIL_CLOSED" in msg
    print("  ✓ În absența secretului securizat, sistemul blochează autorizarea (FAIL_CLOSED): PASS\n")

def test_6_forged_and_corrupted_hmac_signatures():
    print("[TEST 6/12] Test: Respingere semnături HMAC falsificate sau corupte...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)

    now = datetime.datetime.now(datetime.timezone.utc)
    issued_at = (now - datetime.timedelta(hours=1)).isoformat()
    expires_at = (now + datetime.timedelta(hours=2)).isoformat()

    valid_token = {
        "approval_id": "APPR-TEST-001",
        "authorizer_id": "SIGNER-COMM-01",
        "role": "COMMERCIAL_DIRECTOR",
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": issued_at,
        "expires_at": expires_at
    }
    dataset_sha = "abc123datasetsha456"

    # Compute genuine signature
    msg = f"APPR-TEST-001:SIGNER-COMM-01:COMMERCIAL_DIRECTOR:PROMO:2026:WK44:{dataset_sha}:{issued_at}:{expires_at}"
    genuine_sig = hmac.new(TEST_SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

    # 1. Provide forged signature
    token_forged = dict(valid_token)
    token_forged["signature_token"] = "bad_signature_1234567890abcdef"
    ok1, msg1, code1 = engine.verify_commercial_authorization(token_forged, dataset_sha, "WK44", 2026)
    assert not ok1
    assert code1 == "FORGED_SIGNATURE"

    # 2. Tamper single byte in dataset_sha
    token_good = dict(valid_token)
    token_good["signature_token"] = genuine_sig
    ok2, msg2, code2 = engine.verify_commercial_authorization(token_good, "tampered_dataset_sha", "WK44", 2026)
    assert not ok2
    assert code2 == "FORGED_SIGNATURE"

    # 3. Valid token passes
    engine_fresh = EvidenceValidationEngine(secret_override=TEST_SECRET)
    ok3, msg3, code3 = engine_fresh.verify_commercial_authorization(token_good, dataset_sha, "WK44", 2026)
    assert ok3
    assert code3 == "PASS"

    print("  ✓ Falsificarea tokenului sau alterarea conținutului eșuează verificarea HMAC: PASS\n")

def test_7_incorrect_roles_and_scope_mismatch():
    print("[TEST 7/12] Test: Respingere roluri neautorizate sau scope incorect...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)
    now = datetime.datetime.now(datetime.timezone.utc)
    issued = now.isoformat()
    expires = (now + datetime.timedelta(hours=2)).isoformat()

    # 1. Impostor role (declaring COMMERCIAL_DIRECTOR when signer is LEAD_ANALYST)
    token_role_mismatch = {
        "approval_id": "APPR-ROLE-01",
        "authorizer_id": "SIGNER-LEAD-02",
        "role": "COMMERCIAL_DIRECTOR", # False role
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": issued,
        "expires_at": expires
    }
    ok1, msg1, code1 = engine.verify_commercial_authorization(token_role_mismatch, "sha", "WK44", 2026)
    assert not ok1
    assert code1 == "UNAUTHORIZED"
    assert "ROLE_MISMATCH" in msg1

    # 2. Scope mismatch (LEAD_ANALYST only allowed on PROMO, attempting EU_PORK_MARKET)
    token_scope_mismatch = {
        "approval_id": "APPR-SCOPE-01",
        "authorizer_id": "SIGNER-LEAD-02",
        "role": "LEAD_ANALYST",
        "scope": "EU_PORK_MARKET", # Scope not allowed for this signer
        "week": "WK44",
        "year": 2026,
        "issued_at": issued,
        "expires_at": expires
    }
    ok2, msg2, code2 = engine.verify_commercial_authorization(token_scope_mismatch, "sha", "WK44", 2026)
    assert not ok2
    assert code2 == "UNAUTHORIZED"
    assert "UNAUTHORIZED_SCOPE" in msg2

    print("  ✓ Nepotrivirile de rol sau acces în afara domeniului autorizat sunt respinse: PASS\n")

def test_8_expired_and_future_dated_approvals():
    print("[TEST 8/12] Test: Respingere aprobări expirate sau datate în viitor...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Expired approval
    expired_token = {
        "approval_id": "APPR-EXP-01",
        "authorizer_id": "SIGNER-COMM-01",
        "role": "COMMERCIAL_DIRECTOR",
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": (now - datetime.timedelta(days=2)).isoformat(),
        "expires_at": (now - datetime.timedelta(hours=1)).isoformat() # Expired 1h ago
    }
    ok1, msg1, code1 = engine.verify_commercial_authorization(expired_token, "sha", "WK44", 2026)
    assert not ok1
    assert code1 == "EXPIRED"

    # 2. Future-dated approval (anti-clock tampering)
    future_token = {
        "approval_id": "APPR-FUT-01",
        "authorizer_id": "SIGNER-COMM-01",
        "role": "COMMERCIAL_DIRECTOR",
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": (now + datetime.timedelta(hours=5)).isoformat(), # Future
        "expires_at": (now + datetime.timedelta(hours=10)).isoformat()
    }
    ok2, msg2, code2 = engine.verify_commercial_authorization(future_token, "sha", "WK44", 2026)
    assert not ok2
    assert code2 == "TEMPORAL_FAIL"

    print("  ✓ Aprobările expirate sau datate în viitor sunt respinse automat: PASS\n")

def test_9_cross_week_and_year_replay():
    print("[TEST 9/12] Test: Respingere aprobări emise pentru altă săptămână (Cross-week Replay)...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)
    now = datetime.datetime.now(datetime.timezone.utc)

    # Token issued for WK44
    token_wk44 = {
        "approval_id": "APPR-WK44-01",
        "authorizer_id": "SIGNER-COMM-01",
        "role": "COMMERCIAL_DIRECTOR",
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": now.isoformat(),
        "expires_at": (now + datetime.timedelta(hours=2)).isoformat()
    }

    # Attempting to use WK44 token to approve WK45 audit
    ok, msg, code = engine.verify_commercial_authorization(token_wk44, "sha", "WK45", 2026)
    assert not ok
    assert code == "SCOPE_MISMATCH"
    assert "WEEK_YEAR_MISMATCH" in msg

    print("  ✓ Tentativele de reutilizare a aprobării din altă săptămână sunt respinse: PASS\n")

def test_10_replay_attack_prevention():
    print("[TEST 10/12] Test: Prevenire replay pe aprobare deja consumată...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)
    now = datetime.datetime.now(datetime.timezone.utc)
    issued = now.isoformat()
    expires = (now + datetime.timedelta(hours=2)).isoformat()
    dataset_sha = "unique_dataset_sha_999"

    msg = f"APPR-REPLAY-101:SIGNER-COMM-01:COMMERCIAL_DIRECTOR:PROMO:2026:WK44:{dataset_sha}:{issued}:{expires}"
    sig = hmac.new(TEST_SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

    token = {
        "approval_id": "APPR-REPLAY-101",
        "authorizer_id": "SIGNER-COMM-01",
        "role": "COMMERCIAL_DIRECTOR",
        "scope": "PROMO",
        "week": "WK44",
        "year": 2026,
        "issued_at": issued,
        "expires_at": expires,
        "signature_token": sig
    }

    # First consumption: PASS
    ok1, _, code1 = engine.verify_commercial_authorization(token, dataset_sha, "WK44", 2026)
    assert ok1
    assert code1 == "PASS"

    # Second consumption of the exact same approval_id: REPLAY DETECTED!
    ok2, msg2, code2 = engine.verify_commercial_authorization(token, dataset_sha, "WK44", 2026)
    assert not ok2
    assert code2 == "REPLAY"
    assert "REPLAY_DETECTED" in msg2

    print("  ✓ Aprobarea consumată nu mai poate fi refolosită (Anti-Replay confirmat): PASS\n")

def test_11_needs_review_preservation_and_zero_autopromotion():
    print("[TEST 11/12] Test: Păstrare completă dovezi NEEDS_REVIEW și mapare N/V fără promovare...")
    engine = EvidenceValidationEngine(secret_override=TEST_SECRET)

    # Format ambiguity: sliced meat tray with surcharge
    status_7d, reason_7d = engine.evaluate_7d_like_for_like("Cotlet porc fără os", "Cotlet porc feliat caserolă 500g", 24.50)
    assert status_7d == "NEEDS_REVIEW"
    assert "FORMAT_AMBIGUOUS" in reason_7d

    candidate_offer = {
        "retailer": "Lidl",
        "kvi": "Cotlet porc fără os",
        "price_lei_kg": 24.50,
        "exact_product": "Cotlet porc feliat caserolă 500g",
        "internal_status": status_7d,
        "eval_reason": reason_7d,
        "artifact_path": "lidl_cotlet_crop.png",
        "artifact_sha256": "abcdef123456"
    }

    chosen, canonical_status, logs = engine.reconcile_cell([candidate_offer])

    # 1. Canonical status must be N/V (NOT VERIFIED)
    assert canonical_status == "N/V", f"Expected N/V, got {canonical_status}"
    assert canonical_status != "VERIFIED", "CRITICAL ERROR: Ambiguous offer was promoted to VERIFIED!"

    # 2. Chosen offer retains all evidence and reasons intact
    assert chosen is not None
    assert chosen["exact_product"] == "Cotlet porc feliat caserolă 500g"
    assert chosen["internal_status"] == "NEEDS_REVIEW"
    assert chosen["artifact_path"] == "lidl_cotlet_crop.png"
    assert "FORMAT_AMBIGUOUS" in logs[0]

    print("  ✓ Ofertele ambigue păstrează toate dovezile în audit și sunt mapate la N/V (Zero promovare): PASS\n")

def test_12_strict_isolation_and_release_gate_rejection(sandbox: Path):
    print("[TEST 12/12] Test: Izolare strictă: production_eligible=False și respingere de poartă...")
    engine = EvidenceValidationEngine(evidence_root=sandbox, secret_override=TEST_SECRET)

    crop = sandbox / "crop.png"
    crop.write_bytes(b"AUTHENTIC_EVIDENCE_BYTES_123")
    crop_sha = sha256_file(crop)

    candidate_package = {
        "week": "WK44",
        "year": 2026,
        "candidate_offers": [
            {
                "retailer": "Kaufland",
                "kvi": "Spată porc fără os",
                "source": "Catalog Kaufland",
                "source_url": "https://catalog.kaufland.ro/ro-wk44/p1",
                "artifact_path": "crop.png",
                "artifact_sha256": crop_sha,
                "validity": "28.10–03.11.2026",
                "captured_at_utc": "2026-10-28T12:00:00Z",
                "exact_product": "Spată de porc fără os Purland",
                "price_lei_kg": 14.90
            }
        ],
        "commercial_authorization": {}
    }

    report = engine.evaluate_candidate_package(candidate_package)

    assert report["schema_version"] == "5A-EVALUATION-REPORT"
    assert report["production_eligible"] is False, "CRITICAL: 5A must set production_eligible: False"

    # Verify that Release Gate rejects this evaluation report
    report_file = sandbox / "eval_report_5a.json"
    report_file.write_text(json.dumps(report), encoding="utf-8")

    gate = BASE / "FRESH_MEAT_BI_GATE_v1.py"
    cmd = [
        sys.executable, str(gate.resolve()), "PROMO", str((BASE / "PROMO_WEEKLY_CANONICAL_LOCK.json").resolve()),
        "--research", str(report_file.resolve())
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Gate must return 2 (FAIL_CLOSED), got {cp.returncode}"
    res = json.loads(cp.stdout)
    assert res.get("release_status") == "FAIL_CLOSED"
    assert "PROMO_RESEARCH_25_25_NOT_PROVEN" in res.get("errors", [])

    print("  ✓ Raportul 5A este respins categoric de Release Gate ca chitanță de producție: PASS\n")

def main():
    print("==========================================================================")
    print(" FRESH MEAT RETAIL BI — TEST SUITE SUBETAPA 5A.1 (SECURITY HARDENING)")
    print("==========================================================================\n")
    sandbox = setup_test_sandbox()
    try:
        test_1_malicious_urls_with_official_domains()
        test_2_insecure_schemes_and_malformed_urls()
        test_3_unauthorized_subdomains()
        test_4_unvalidated_redirect_parameters()
        test_5_missing_hmac_secret_fails_closed()
        test_6_forged_and_corrupted_hmac_signatures()
        test_7_incorrect_roles_and_scope_mismatch()
        test_8_expired_and_future_dated_approvals()
        test_9_cross_week_and_year_replay()
        test_10_replay_attack_prevention()
        test_11_needs_review_preservation_and_zero_autopromotion()
        test_12_strict_isolation_and_release_gate_rejection(sandbox)
        print("==========================================================================")
        print(" TOATE CELE 12 TESTE DE SECURITATE SUBETAPA 5A.1 AU TRECUT CU SUCCES!     ")
        print("==========================================================================")
    finally:
        shutil.rmtree(sandbox, ignore_errors=True)

if __name__ == "__main__":
    main()
