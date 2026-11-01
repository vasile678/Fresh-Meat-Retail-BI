#!/usr/bin/env python3
import json
import re
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
DATA_PATH = ROOT / "public" / "data" / "retail_media_export.json"

def fetch_url(url, timeout=12):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            final_url = resp.geturl()
            content = resp.read().decode("utf-8", errors="ignore")
            return status, final_url, content, None
    except urllib.error.HTTPError as e:
        return e.code, url, "", str(e)
    except Exception as e:
        return None, url, "", str(e)

def extract_dates_and_title(html):
    found_dates = []
    # 1. JSON-LD datePublished
    for m in re.finditer(r'"datePublished"\s*:\s*"([^"]+)"', html, re.I):
        found_dates.append(("jsonld_datePublished", m.group(1)))
    
    # 2. OpenGraph / article:published_time
    for m in re.finditer(r'<meta[^>]+(?:property|name)=["\'](?:article:published_time|publish-date|date|pubdate)["\'][^>]+content=["\']([^"\']+)["\']', html, re.I):
        found_dates.append(("meta_published_time", m.group(1)))

    for m in re.finditer(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:article:published_time|publish-date|date|pubdate)["\']', html, re.I):
        found_dates.append(("meta_published_time_rev", m.group(1)))

    # 3. HTML time tag
    for m in re.finditer(r'<time[^>]+datetime=["\']([^"\']+)["\']', html, re.I):
        found_dates.append(("time_datetime", m.group(1)))

    # 4. Romanian date patterns in visible post_date or div_date
    ro_months = {
        "ianuarie": "01", "februarie": "02", "martie": "03", "aprilie": "04",
        "mai": "05", "iunie": "06", "iulie": "07", "august": "08",
        "septembrie": "09", "octombrie": "10", "noiembrie": "11", "decembrie": "12"
    }
    for m in re.finditer(r'(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s+(\d{4})', html, re.I):
        day = m.group(1).zfill(2)
        mon = ro_months[m.group(2).lower()]
        yr = m.group(3)
        found_dates.append(("ro_text_date", f"{yr}-{mon}-{day}"))

    # Spanish date patterns (for eurocarne) e.g. "29 de octubre de 2026" or "29/10/2026"
    es_months = {
        "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
        "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
        "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
    }
    for m in re.finditer(r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})', html, re.I):
        day = m.group(1).zfill(2)
        mon = es_months[m.group(2).lower()]
        yr = m.group(3)
        found_dates.append(("es_text_date", f"{yr}-{mon}-{day}"))

    # Title extraction
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    page_title = title_match.group(1).strip() if title_match else ""

    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.I | re.S)
    h1 = re.sub(r'<[^>]+>', '', h1_match.group(1)).strip() if h1_match else ""

    return found_dates, page_title, h1

def normalize_date_str(raw):
    # Try parsing ISO
    m = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', raw)
    if m:
        yr, mo, da = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
        return f"{da}.{mo}.{yr}"
    # Try parsing DD.MM.YYYY
    m2 = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', raw)
    if m2:
        da, mo, yr = m2.group(1).zfill(2), m2.group(2).zfill(2), m2.group(3)
        return f"{da}.{mo}.{yr}"
    return raw

def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    pubs = data.get("publications", [])

    results = []
    print("=" * 80)
    print("AUDITARE EXACTĂ PENTRU TOATE ARTICOLELE (12 PUBLICAȚII)")
    print("=" * 80)

    total_articles = 0
    date_mismatches = 0
    verified_count = 0
    invalid_links = 0

    for p in pubs:
        p_name = p["name"]
        print(f"\n--- Publicația: {p_name} ({p['id']}) ---")
        for a in p.get("articles", []):
            total_articles += 1
            curr_date = a.get("date")
            title = a.get("title")
            url = a.get("url")

            status, final_url, html, err = fetch_url(url)
            is_valid_link = status == 200

            if not is_valid_link:
                invalid_links += 1
                print(f"[FAIL LINK] {title[:40]} | Status: {status} | Err: {err}")
                results.append({
                    "pub": p_name,
                    "title": title,
                    "url": url,
                    "curr_date": curr_date,
                    "status": "INVALID_LINK",
                    "http_status": status,
                    "error": err
                })
                continue

            dates, page_title, h1 = extract_dates_and_title(html)
            # Pick best date (prefer jsonld or meta_published_time)
            best_raw_date = None
            best_source = None
            for dtype, dval in dates:
                if dtype in ("jsonld_datePublished", "meta_published_time", "meta_published_time_rev", "time_datetime"):
                    best_raw_date = dval
                    best_source = dtype
                    break
            if not best_raw_date and dates:
                best_raw_date = dates[0][1]
                best_source = dates[0][0]

            norm_date = normalize_date_str(best_raw_date) if best_raw_date else None
            
            is_mismatch = norm_date and norm_date != curr_date
            if is_mismatch:
                date_mismatches += 1
                print(f"[DATE MISMATCH] {title[:45]}...")
                print(f"   Afișat în app: {curr_date}  -->  Sursă reală ({best_source}): {norm_date}")
            else:
                verified_count += 1
                print(f"[VERIFIED] {title[:45]}... (Data: {norm_date or curr_date})")

            results.append({
                "pub": p_name,
                "title": title,
                "url": url,
                "curr_date": curr_date,
                "verified_date": norm_date,
                "date_source": best_source,
                "raw_date": best_raw_date,
                "all_dates": dates,
                "mismatch": is_mismatch,
                "page_title": page_title[:80],
                "h1": h1[:80],
                "status": "VERIFIED"
            })

    output_audit_file = BASE / "audit_articles_result.json"
    output_audit_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print("\n" + "=" * 80)
    print("REZUMAT AUDIT:")
    print(f"Total articole auditate: {total_articles}")
    print(f"Articole cu date corectate/mismatch: {date_mismatches}")
    print(f"Articole verificate: {verified_count}")
    print(f"Linkuri invalide/inaccesibile: {invalid_links}")
    print(f"Rezultat salvat în {output_audit_file}")
    print("=" * 80)

if __name__ == "__main__":
    main()
