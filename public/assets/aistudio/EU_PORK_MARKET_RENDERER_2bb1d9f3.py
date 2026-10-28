# EU_PORK_MARKET_RENDERER.py
# LUMI Fresh Meat BI — canonical deterministic renderer
# Golden Reference: WK38/2026 FINAL v3
# Layout geometry is embedded in this renderer; no external mask-map is required.
# Weekly rule: data/content may change; layout must not change.
# Generative reconstruction is forbidden.

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, hashlib, sys

def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf",
    ]
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for b in iter(lambda:f.read(1<<20), b""): h.update(b)
    return h.hexdigest()

def render(master_path, dataset_path, output_path, receipt_path):
    d=json.loads(Path(dataset_path).read_text(encoding="utf-8"))
    im=Image.open(master_path).convert("RGB")
    if im.size != (1536,1024):
        raise ValueError(f"Unexpected master size {im.size}")
    dr=ImageDraw.Draw(im)

    navy=(6,25,121); blue=(7,25,137); green=(0,153,69); red=(245,0,0); gray=(120,132,140)
    white=(255,255,255); pale=(245,250,253); pale_blue=(237,247,255); pale_green=(235,250,243)

    # Header dynamic subtitle only.
    dr.rectangle((145,66,1215,112), fill=(3,54,131))
    dr.text((160,77), f"{d['week']} ({d['period']})  |  Updated {d['updated']}  |  Retail Procurement View",
            fill=white, font=font(24))

    ys=[174,229,284,339,394,449,504,559]
    for i,(y,row) in enumerate(zip(ys,d["rows"])):
        y2=y+54
        # Preserve market/flag column. Clear dynamic cells.
        dr.rectangle((390,y,1524,y2), fill=(250,253,255))
        # subtle row separators
        dr.line((390,y2,1524,y2), fill=(190,220,240), width=1)

        dr.text((442,y+15), row["price"], fill=navy, font=font(23, True))
        dr.text((580,y+16), row["unit"], fill=navy, font=font(20))
        wow_color = red if str(row["wow"]).startswith("-") else green if str(row["wow"]).startswith("+") else navy
        dr.text((734,y+16), row["wow"], fill=wow_color, font=font(20))

        trend=row["trend"]
        if trend=="WEAKENING":
            dr.text((870,y+8),"↓",fill=red,font=font(37,True)); dr.text((925,y+17),"WEAKENING",fill=red,font=font(18,True))
        elif trend=="RISING":
            dr.text((870,y+8),"↑",fill=green,font=font(37,True)); dr.text((925,y+17),"RISING",fill=green,font=font(18,True))
        elif trend=="STABLE":
            dr.text((870,y+8),"→",fill=gray,font=font(37,True)); dr.text((925,y+17),"STABLE",fill=navy,font=font(18,True))
        elif row["status"]=="NQ":
            dr.text((900,y+17),"NQ",fill=gray,font=font(19,True))
        else:
            dr.text((900,y+17),"N/V",fill=gray,font=font(19,True))

        dr.text((1095,y+16), row["source_date"], fill=navy if row["status"]=="VERIFIED" else gray, font=font(17))
        if row["status"]=="VERIFIED":
            dr.rounded_rectangle((1407,y+10,1504,y+45), radius=8, fill=(0,174,73))
            dr.text((1418,y+18),"VERIFIED",fill=white,font=font(14,True))
        elif row["status"]=="NQ":
            dr.rounded_rectangle((1417,y+10,1495,y+45), radius=8, fill=(210,218,224))
            dr.text((1439,y+18),"NQ",fill=(65,75,85),font=font(16,True))
        else:
            dr.rounded_rectangle((1417,y+10,1495,y+45), radius=8, fill=(210,218,224))
            dr.text((1435,y+18),"N/V",fill=(65,75,85),font=font(16,True))

    # Lower panels: deterministic overwrite inside same locked panel geometry.
    dr.rectangle((12,642,494,945), fill=pale_green)
    dr.rectangle((504,642,1040,945), fill=pale_blue)
    dr.rectangle((1040,642,1524,945), fill=pale_blue)
    dr.line((1039,660,1039,930), fill=(185,215,235), width=1)

    dr.text((62,668), d["market_signal_title"], fill=(0,103,71), font=font(26,True))
    # Market signal title/value: wrap to the actual left-panel width.
    import textwrap
    signal_lines=textwrap.wrap(d["market_signal"], width=18)
    sy=716
    for line in signal_lines:
        dr.text((64,sy), line, fill=(0,103,71), font=font(31,True))
        sy += 36

    # Market signal body: smaller type and tighter leading so it stays inside
    # the fixed left panel and above the footer.
    yy=sy+12
    for paragraph in d["market_signal_body"].splitlines():
        for line in textwrap.wrap(paragraph, width=37):
            if yy > 910:
                break
            dr.text((64,yy), line, fill=navy, font=font(17))
            yy += 23

    dr.text((526,668),"KEY TAKEAWAYS",fill=navy,font=font(27,True))
    yy=714
    for t in d["takeaways"]:
        dr.ellipse((530,yy+7,543,yy+20), fill=green)
        # Wrap takeaway text to stay inside the center panel.
        import textwrap
        lines=textwrap.wrap(t, width=48)
        for j,line in enumerate(lines):
            dr.text((570,yy+j*24), line, fill=navy, font=font(17))
        yy += max(42, len(lines)*24+10)

    dr.text((1070,668),"IMPLICATIONS FOR BUYERS",fill=navy,font=font(26,True))
    yy=722
    for t in d["implications"]:
        dr.text((1080,yy),"•",fill=green,font=font(30,True))
        # Wrap implication text to stay inside the right panel.
        import textwrap
        lines=textwrap.wrap(t, width=35)
        for j,line in enumerate(lines):
            dr.text((1110,yy+2+j*23), line, fill=navy, font=font(16, True if yy==722 else False))
        yy += max(58, len(lines)*23+12)

    # Footer date.
    dr.rectangle((1300,968,1524,1017), fill=white)
    dr.text((1306,983), f"Fresh Meat BI  |  {d['updated']}", fill=navy, font=font(16))

    im.save(output_path, "PNG", optimize=True)
    rec={
        "runtime":"eu_pork_market_renderer_v1.1",
        "status":"PASS",
        "master_sha256":sha256(master_path),
        "dataset_sha256":sha256(dataset_path),
        "output_sha256":sha256(output_path),
        "week":d["week"],
        "period":d["period"],
        "verified_rows":sum(1 for r in d["rows"] if r["status"]=="VERIFIED"),
        "nq_rows":sum(1 for r in d["rows"] if r["status"]=="NQ"),
        "nv_rows":sum(1 for r in d["rows"] if r["status"]=="N/V"),
        "render_mode":"DETERMINISTIC_MASTER_OVERLAY",
        "generative_image":"FORBIDDEN"
    }
    Path(receipt_path).write_text(json.dumps(rec,indent=2),encoding="utf-8")
    return rec

if __name__=="__main__":
    if len(sys.argv)!=5:
        raise SystemExit("Usage: eu_pork_market_renderer_v1.py MASTER DATASET OUTPUT RECEIPT")
    print(json.dumps(render(*sys.argv[1:]), indent=2))
