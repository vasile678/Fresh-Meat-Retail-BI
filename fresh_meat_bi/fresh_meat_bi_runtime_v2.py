#!/usr/bin/env python3
"""
LUMI Fresh Meat BI aggregate runtime v2.9 asset-resolution hardening
Manifest-driven orchestration only. Canonical renderers own rendering/schema validation.
DEFINED != EXECUTED != VALIDATED != RELEASED.
"""
from pathlib import Path
import sys, json, hashlib, subprocess, datetime, os

BASE = Path(__file__).resolve().parent
MANIFEST_PATH = BASE / "CONFIG_MANIFEST.json"

def die(msg):
    raise SystemExit("FAIL: " + msg)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def load_manifest():
    if not MANIFEST_PATH.exists():
        die("CONFIG_MANIFEST.json missing")
    m = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if m.get("governance", {}).get("fail_mode") != "CLOSED":
        die("manifest fail_mode must be CLOSED")
    return m

def require_asset(path, expected_sha=None, label="asset"):
    if not path.exists():
        die(f"ASSET_RESOLUTION_FAIL:{label}:{path.name}")
    if expected_sha and sha256(path) != expected_sha:
        die(f"ASSET_HASH_MISMATCH:{label}:{path.name}")
    return path

def resolve_asset(name, expected_sha, label, resolution=None):
    # Same resolver path is used by production and self-test. No filename-only PASS.
    candidates = [BASE / name]
    root = os.environ.get("LUMI_ASSET_ROOT")
    if root:
        candidates.append(Path(root).expanduser().resolve() / name)
    configured = (resolution or {}).get("materialized_path")
    if configured:
        p = Path(configured).expanduser()
        candidates.append(p if p.is_absolute() else BASE / p)
    seen=[]
    for p in candidates:
        p=p.resolve(); seen.append(str(p))
        if p.exists():
            return require_asset(p, expected_sha, label)
    die(f"ASSET_RESOLUTION_FAIL:{label}:{name}; searched=" + "|".join(seen))

def resolve(m, mode):
    if mode == "promo":
        c = m["promo"]
        master = resolve_asset(c["master"], c["master_sha256"], "Promo master", c.get("master_resolution"))
        renderer = resolve_asset(c["renderer"], c["renderer_sha256"], "Promo renderer", c.get("renderer_resolution"))
        return renderer, master
    c = m["eu_pork_market"]
    master = resolve_asset(c["golden_reference"], c["golden_reference_sha256"], "EU golden reference", c.get("golden_reference_resolution"))
    renderer = resolve_asset(c["renderer"], c["renderer_sha256"], "EU renderer", c.get("renderer_resolution"))
    return renderer, master

def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ("promo", "eu"):
        die("usage: fresh_meat_bi_runtime_v2.py [promo|eu] DATASET.json OUTPUT.png "
            "[--research RECEIPT.json] [--reconciliation RECEIPT.json] "
            "[--source RECEIPT.json] [--visual RECEIPT.json] [--release]")
    mode=sys.argv[1]
    dataset=Path(sys.argv[2]).resolve()
    output=Path(sys.argv[3]).resolve()
    args=sys.argv[4:]

    def one(flag):
        if flag not in args: return None
        i=args.index(flag)
        if i+1>=len(args): die("missing value for "+flag)
        return Path(args[i+1]).resolve()

    release_requested="--release" in args
    research=one("--research"); reconciliation=one("--reconciliation")
    source=one("--source"); visual=one("--visual")

    if not dataset.exists() or output.suffix.lower()!=".png": die("invalid input/output")
    m=load_manifest()
    renderer,master=resolve(m,mode)

    candidates=[output,Path(str(output)+".manifest.json"),Path(str(output)+".receipt.json"),
                Path(str(output)+".runtime_receipt.json"),Path(str(output)+".release_receipt.json")]
    for p in candidates:
        if p.exists(): p.unlink()

    if mode=="promo":
        cmd=[sys.executable,str(renderer),str(dataset),str(output)]
        expected_renderer_receipt=Path(str(output)+".manifest.json")
    else:
        expected_renderer_receipt=Path(str(output)+".receipt.json")
        cmd=[sys.executable,str(renderer),str(master),str(dataset),str(output),str(expected_renderer_receipt)]

    cp=subprocess.run(cmd,cwd=str(BASE),text=True,capture_output=True)
    if cp.returncode!=0: die("canonical renderer failed: "+(cp.stderr.strip() or cp.stdout.strip() or "unknown error"))
    if not output.exists(): die("renderer returned without output")
    if not expected_renderer_receipt.exists(): die("renderer receipt missing")

    rr=json.loads(expected_renderer_receipt.read_text(encoding="utf-8"))
    if rr.get("status")!="PASS": die("renderer receipt is not PASS")
    dataset_sha=sha256(dataset)
    if rr.get("dataset_sha256")!=dataset_sha: die("renderer receipt is not bound to current dataset")
    expected_master_sha=m["promo"]["master_sha256"] if mode=="promo" else m["eu_pork_market"]["golden_reference_sha256"]
    if rr.get("master_sha256")!=expected_master_sha: die("renderer receipt master hash mismatch")

    receipt={"runtime":"FRESH_MEAT_BI_RUNTIME_v2.9-asset-resolution","status":"PASS","mode":mode,
             "executed_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
             "dataset_sha256":dataset_sha,"renderer_sha256":sha256(renderer),
             "master_sha256":expected_master_sha,"output_sha256":sha256(output),
             "renderer_receipt_sha256":sha256(expected_renderer_receipt),
             "release_status":"NOT_GRANTED_BY_RUNTIME"}
    rp=Path(str(output)+".runtime_receipt.json")
    rp.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    if release_requested:
        gate=BASE/m["release_gate"]["file"]
        gcmd=[sys.executable,str(gate),"PROMO" if mode=="promo" else "EU_PORK",str(dataset),
              "--render",str(expected_renderer_receipt),"--manifest",str(BASE/"CONFIG_MANIFEST.json")]
        if mode=="promo":
            if not research or not reconciliation: die("promo release requires --research and --reconciliation receipts")
            gcmd += ["--research",str(research),"--reconciliation",str(reconciliation)]
        else:
            if not source or not visual: die("EU release requires --source and --visual receipts")
            gcmd += ["--source",str(source),"--visual",str(visual)]
        gp=subprocess.run(gcmd,cwd=str(BASE),text=True,capture_output=True)
        try: release_obj=json.loads(gp.stdout.strip())
        except Exception: die("release gate returned unreadable receipt: "+(gp.stdout.strip() or gp.stderr.strip()))
        release_path=Path(str(output)+".release_receipt.json")
        release_path.write_text(json.dumps(release_obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        if gp.returncode!=0 or release_obj.get("release_status")!="RELEASE_PASS":
            die("release gate did not grant RELEASE_PASS")
        receipt["release_status"]="RELEASE_PASS"
        receipt["release_receipt_sha256"]=sha256(release_path)
        rp.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    print(json.dumps(receipt,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
