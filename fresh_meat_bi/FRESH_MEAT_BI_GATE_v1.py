#!/usr/bin/env python3
"""
FRESH_MEAT_BI_GATE v1.3
Single release authority for PROMO and EU_PORK weekly outputs.
A renderer receipt or a dataset field can never independently grant RELEASE_PASS.
"""
import json, hashlib, sys
from pathlib import Path

PROMO_RETAILERS = ["Kaufland", "Lidl", "PENNY", "Carrefour", "Auchan"]
PROMO_KVI = [
    "Spată porc fără os", "Pulpă porc fără os", "Cotlet porc fără os",
    "Ceafă porc fără os", "Piept pui dezosat"
]
PROMO_STATUSES = {"VERIFIED","PARTIALLY VERIFIED","USER-REPORTED","N/V","NC"}
EU_MARKETS = [
    "Germany VEZG", "ISN / Internet Pig Auction", "Spain Mercolleida",
    "Italy CUN 156–200 kg", "Netherlands Vion", "Denmark Danish Crown",
    "France MPB", "Poland (ZMI) Class E"
]
EU_STATUSES = {"VERIFIED","NQ","N/V"}

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for b in iter(lambda:f.read(1024*1024), b""): h.update(b)
    return h.hexdigest()

def fail(errors, checks):
    return {"release_status":"FAIL_CLOSED","checks":checks,"errors":errors}


def authoritative_lock_gate(candidate_path, competing_paths=None):
    """
    Release requires one explicitly selected authoritative lock.
    If any distinct competing lock exists for the same week/profile, fail closed.
    The orchestrator supplies discovered competing lock paths; filename similarity alone
    never grants authority.
    """
    candidate=Path(candidate_path)
    if not candidate.exists():
        return False, ["AUTHORITATIVE_LOCK_MISSING"]
    candidate_hash=sha256(candidate)
    conflicts=[]
    for raw in competing_paths or []:
        q=Path(raw)
        if q.exists() and q.resolve()!=candidate.resolve() and sha256(q)!=candidate_hash:
            conflicts.append(str(q))
    if conflicts:
        return False, ["AUTHORITATIVE_LOCK_CONFLICT:" + "|".join(conflicts)]
    return True, []

def validate_promo(d, render_receipt=None, expected_master_sha=None, research_receipt=None,
                   reconciliation_receipt=None, dataset_path=None):
    e=[]; c={}
    cells=d.get("cells",[])
    c["coverage"]=len(cells)==25 and d.get("coverage_checked")=="25/25"
    if not c["coverage"]: e.append("PROMO_COVERAGE_NOT_25_25")

    expected={(r,k) for r in PROMO_RETAILERS for k in PROMO_KVI}
    actual={(x.get("retailer"),x.get("kvi")) for x in cells}
    c["matrix_identity"]=actual==expected
    if not c["matrix_identity"]: e.append("PROMO_MATRIX_IDENTITY_MISMATCH")

    c["statuses"]=all(x.get("status") in PROMO_STATUSES for x in cells)
    if not c["statuses"]: e.append("PROMO_INVALID_STATUS")

    source_ok=True
    for x in cells:
        if x.get("status")=="VERIFIED":
            required=("price_lei_kg","validity","source","source_date","exact_product")
            if any(x.get(k) in (None,"") for k in required):
                source_ok=False
    c["source_integrity"]=source_ok
    if not source_ok: e.append("PROMO_VERIFIED_SOURCE_FIELDS_MISSING")

    # 25 rows are not proof that all 25 cells were researched.
    research_ok = bool(research_receipt and research_receipt.get("status")=="PASS"
                       and research_receipt.get("coverage")=="25/25")
    if research_ok and dataset_path:
        research_ok = research_receipt.get("dataset_sha256") == sha256(dataset_path)
    audit=(research_receipt or {}).get("cells",[])
    if research_ok:
        research_ok = len(audit)==25 and all(
            x.get("checked_at") not in (None,"") and
            isinstance(x.get("sources_checked"),list) and
            x.get("result") not in (None,"") for x in audit)
    c["research_25_25_evidence"]=research_ok
    if not research_ok: e.append("PROMO_RESEARCH_25_25_NOT_PROVEN")

    # Dataset self-declaration cannot prove reconciliation.
    reconciliation_ok=bool(reconciliation_receipt and reconciliation_receipt.get("status")=="PASS")
    if reconciliation_ok and dataset_path:
        reconciliation_ok = reconciliation_receipt.get("dataset_sha256") == sha256(dataset_path)
    c["reconciliation"]=reconciliation_ok
    if not reconciliation_ok: e.append("PROMO_RECONCILIATION_NOT_PROVEN")

    c["render_receipt"]=bool(render_receipt and render_receipt.get("status")=="PASS")
    if not c["render_receipt"]: e.append("PROMO_RENDER_NOT_PROVEN")

    if expected_master_sha:
        got=(render_receipt or {}).get("master_sha256")
        c["master_hash"]=got==expected_master_sha
        if not c["master_hash"]: e.append("PROMO_MASTER_HASH_MISMATCH")

    # Renderer success is necessary, never sufficient.
    return fail(e,c) if e else {"release_status":"RELEASE_PASS","checks":c,"errors":[]}

def norm_market(s):
    return (s or "").replace("Netherlands, Vion","Netherlands Vion").strip()

def validate_eu(d, render_receipt=None, expected_master_sha=None, source_gate=None, visual_qa=None):
    e=[]; c={}
    rows=d.get("rows",[])
    actual=[norm_market(x.get("market")) for x in rows]
    c["market_matrix"]=len(rows)==8 and actual==EU_MARKETS
    if not c["market_matrix"]: e.append("EU_MARKET_ORDER_OR_COUNT_MISMATCH")

    c["statuses"]=all(x.get("status") in EU_STATUSES for x in rows)
    if not c["statuses"]: e.append("EU_INVALID_STATUS")

    integrity=True
    for x in rows:
        st=x.get("status")
        if st=="VERIFIED":
            for k in ("price","unit","source"):
                if x.get(k) in (None,"","N/V","—"):
                    integrity=False
        if st=="NQ" and x.get("price") not in (None,"NQ","N/V","—"):
            integrity=False
    c["row_integrity"]=integrity
    if not integrity: e.append("EU_STATUS_PRICE_SOURCE_UNIT_INCONSISTENT")

    # Independent evidence gates: self-declared reconciliation cannot replace them.
    c["current_source_verification"]=source_gate is True
    if not c["current_source_verification"]: e.append("EU_CURRENT_SOURCE_VERIFICATION_NOT_PROVEN")

    c["render_receipt"]=bool(render_receipt and render_receipt.get("status")=="PASS")
    if not c["render_receipt"]: e.append("EU_RENDER_NOT_PROVEN")

    if expected_master_sha:
        got=(render_receipt or {}).get("master_sha256")
        c["master_hash"]=got==expected_master_sha
        if not c["master_hash"]: e.append("EU_GOLDEN_REFERENCE_HASH_MISMATCH")

    c["visual_qa"]=visual_qa is True
    if not c["visual_qa"]: e.append("EU_VISUAL_QA_NOT_PROVEN")

    return fail(e,c) if e else {"release_status":"RELEASE_PASS","checks":c,"errors":[]}

def load_receipt(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def receipt_proves_dataset(receipt, dataset_path, required_status):
    if not receipt or receipt.get("status") != required_status:
        return False
    expected=sha256(dataset_path)
    return receipt.get("dataset_sha256") == expected

def main():
    if len(sys.argv)<3:
        raise SystemExit(
            "Usage: FRESH_MEAT_BI_GATE.py PROMO|EU_PORK DATASET.json "
            "[--render RENDER.json] [--source SOURCE.json] [--visual VISUAL.json] "
            "[--research RESEARCH.json] [--reconciliation RECONCILIATION.json] "
            "[--manifest CONFIG_MANIFEST.json] [--sibling LOCK.json ...]"
        )

    mode=sys.argv[1].upper()
    dataset_path=sys.argv[2]
    d=json.loads(Path(dataset_path).read_text(encoding="utf-8"))

    args=sys.argv[3:]
    def one(flag):
        if flag not in args: return None
        i=args.index(flag)
        if i+1>=len(args): raise SystemExit("Missing value for "+flag)
        return args[i+1]
    def many(flag):
        vals=[]; i=0
        while i<len(args):
            if args[i]==flag:
                if i+1>=len(args): raise SystemExit("Missing value for "+flag)
                vals.append(args[i+1]); i+=2
            else: i+=1
        return vals

    render_path=one("--render")
    source_path=one("--source")
    visual_path=one("--visual")
    research_path=one("--research")
    reconciliation_path=one("--reconciliation")
    manifest_path=one("--manifest")
    siblings=many("--sibling")

    render=load_receipt(render_path) if render_path else None
    source=load_receipt(source_path) if source_path else None
    visual=load_receipt(visual_path) if visual_path else None
    research=load_receipt(research_path) if research_path else None
    reconciliation=load_receipt(reconciliation_path) if reconciliation_path else None

    manifest=None
    if manifest_path:
        manifest=json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    else:
        default_manifest=Path(__file__).resolve().parent/"CONFIG_MANIFEST.json"
        if default_manifest.exists():
            manifest=json.loads(default_manifest.read_text(encoding="utf-8"))

    expected_master_sha=None
    if manifest:
        if mode=="PROMO":
            expected_master_sha=manifest.get("promo",{}).get("master_sha256")
        else:
            expected_master_sha=manifest.get("eu_pork_market",{}).get("golden_reference_sha256")

    # Authority comes from manifest registry when declared.
    lock_candidate=dataset_path
    authority_errors=[]
    if mode=="PROMO" and manifest:
        reg=manifest.get("promo",{}).get("authoritative_lock_registry",{})
        if reg.get("mode")=="MANIFEST_CANONICAL":
            canonical=reg.get("canonical_lock")
            if not canonical:
                authority_errors.append("MANIFEST_CANONICAL_LOCK_UNDECLARED")
            else:
                cp=Path(manifest_path).resolve().parent/ canonical if manifest_path else Path(__file__).resolve().parent/canonical
                if not cp.exists():
                    authority_errors.append("MANIFEST_CANONICAL_LOCK_MISSING")
                elif Path(dataset_path).resolve()!=cp.resolve():
                    authority_errors.append("DATASET_IS_NOT_MANIFEST_CANONICAL_LOCK")
                else:
                    lock_candidate=str(cp)

    lock_ok, lock_errors=authoritative_lock_gate(lock_candidate, siblings)
    authority_errors.extend(lock_errors)
    if not lock_ok or authority_errors:
        print(json.dumps(fail(authority_errors, {"authoritative_lock":False}),ensure_ascii=False,indent=2))
        raise SystemExit(2)

    if mode=="PROMO":
        result=validate_promo(
            d, render_receipt=render, expected_master_sha=expected_master_sha,
            research_receipt=research, reconciliation_receipt=reconciliation,
            dataset_path=dataset_path
        )
    elif mode in ("EU","EU_PORK"):
        source_gate=bool(source and receipt_proves_dataset(source,dataset_path,"PASS"))
        visual_gate=bool(visual and receipt_proves_dataset(visual,dataset_path,"PASS"))
        result=validate_eu(d, render_receipt=render, expected_master_sha=expected_master_sha,
                           source_gate=source_gate, visual_qa=visual_gate)
    else:
        raise SystemExit("Mode must be PROMO or EU_PORK")

    print(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(0 if result.get("release_status")=="RELEASE_PASS" else 2)

if __name__=="__main__":
    main()
