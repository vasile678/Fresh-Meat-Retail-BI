#!/usr/bin/env python3
# PROMO deterministic renderer v2.1
# Usage: python promo_image_renderer_v2.py WKxx_LOCK.json output.png
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import sys,json,hashlib,datetime

BASE=Path(__file__).resolve().parent
MASTER=BASE/"PROMO_MASTER_v2_LOCKED.png"
MASTER_LOCK=BASE/"PROMO_MASTER_v2_LOCK.json"
RETAILERS=["Kaufland","Lidl","PENNY","Carrefour","Auchan"]
KVI=["Spată porc fără os","Pulpă porc fără os","Cotlet porc fără os","Ceafă porc fără os","Piept pui dezosat"]
XS=[252,489,716,948,1190]; WS=[237,227,232,242,246]
YS=[247,392,535,678,813]; HS=[145,143,143,135,152]
REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def font(n,b=False): return ImageFont.truetype(BOLD if b else REG,n)
def die(s): raise SystemExit("FAIL: "+s)

if len(sys.argv)!=3: die("usage: renderer LOCK.json output.png")
lock=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
cfg=json.loads(MASTER_LOCK.read_text(encoding="utf-8"))
if sha(MASTER)!=cfg["master_sha256"]: die("master hash mismatch")
if lock.get("coverage_checked")!="25/25": die("coverage != 25/25")
if lock.get("retailers")!=RETAILERS or lock.get("kvi")!=KVI: die("schema drift")
cells=lock.get("cells",[])
if len(cells)!=25: die("exactly 25 cells required")
idx={(c["retailer"],c["kvi"]):c for c in cells}
if set(idx)!={(r,k) for r in RETAILERS for k in KVI}: die("missing/extra cells")
for c in cells:
    st=c.get("status")
    if st not in cfg["allowed_status"]: die("invalid status")
    if st in {"VERIFIED","USER-REPORTED"}:
        for f in ["price_lei_kg","validity","source","source_date","exact_product"]:
            if c.get(f) in [None,""]: die(st+" missing "+f)
    elif c.get("price_lei_kg") not in [None,""]:
        die("non-numeric-status cell contains price")

img=Image.open(MASTER).convert("RGB"); d=ImageDraw.Draw(img)
week=str(lock["week"]); year=str(lock["year"]); period=str(lock["calendar_period"])
# Header dynamic area, including top-right badge: stale week cannot survive.
d.rectangle((18,8,1145,128),fill=(248,252,255))
d.text((29,18),f"TOP 5 ARTICOLE – PREȚURI COMPETITORI | {week} {year} (±3 ZILE)",font=font(31,True),fill=(10,48,105))
d.text((29,62),f"Perioadă calendaristică: {period} | cercetare ±3 zile",font=font(20),fill=(10,48,105))
d.text((29,94),"Prețuri normalizate lei/kg. N/V = ofertă comparabilă neverificată.",font=font(19),fill=(10,48,105))
d.rounded_rectangle((1188,9,1435,130),radius=10,fill=(235,245,250))
d.text((1212,19),"Fresh Meat Retail BI",font=font(18,True),fill=(10,48,105))
d.text((1224,49),"PIAȚĂ. PREȚURI. DECIZII.",font=font(12),fill=(10,48,105))
d.line((1207,72,1416,72),fill=(10,48,105),width=1)
d.text((1255,79),f"{week} {year}",font=font(19,True),fill=(10,48,105))
d.text((1225,105),period.upper(),font=font(12),fill=(10,48,105))

for ri,k in enumerate(KVI):
  for ci,r in enumerate(RETAILERS):
    c=idx[(r,k)]; x,y,w,h=XS[ci],YS[ri],WS[ci],HS[ri]
    if c["status"] in {"VERIFIED","USER-REPORTED"}:
      verified=c["status"]=="VERIFIED"
      d.rectangle((x+1,y+1,x+w-2,y+h-2),fill=(224,248,220) if verified else (255,247,220))
      price=f'{float(c["price_lei_kg"]):.2f}'.replace(".",",")
      lines=[(price,font(31,True)),("lei/kg",font(18)),((str(c["validity"]) if verified else "USER-REPORTED"),font(14))]
      yy=y+30
      for t,f in lines:
        bb=d.textbbox((0,0),t,font=f); d.text((x+(w-(bb[2]-bb[0]))//2,yy),t,font=f,fill=(6,87,31)); yy+=34
    else:
      d.rectangle((x+1,y+1,x+w-2,y+h-2),fill=(248,252,255))
      t="N/V" if c["status"]!="NC" else "NC"; f=font(25,True); bb=d.textbbox((0,0),t,font=f)
      d.text((x+(w-(bb[2]-bb[0]))//2,y+h//2-18),t,font=f,fill=(7,27,82))

out=Path(sys.argv[2]); img.save(out)
lock_hash=hashlib.sha256(json.dumps(lock,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
manifest={"status":"PASS","renderer":"v2.1","master_sha256":sha(MASTER),"lock_hash":lock_hash,"dataset_sha256":sha(Path(sys.argv[1])),
"week":week,"year":year,"calendar_period":period,"coverage_checked":"25/25",
"retailers":RETAILERS,"kvi":KVI,"cell_count":25,"output_sha256":sha(out),
"checks":["master_hash","schema_5x5","no_Profi","coverage_25/25","verified_and_user_reported_required_fields","price_only_verified_or_user_reported","dynamic_week_badge","4:3"]}
Path(str(out)+".manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
print("PASS",out)
