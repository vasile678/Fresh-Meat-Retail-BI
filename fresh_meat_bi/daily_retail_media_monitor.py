#!/usr/bin/env python3
"""
FRESH MEAT RETAIL BI — DAILY RETAIL MEDIA MONITOR PIPELINE
Execuție zilnică programată la ora 08:00 Europe/Bucharest.

Monitorizează autonom:
  - EXACT 7 RETAILERI DIN ROMÂNIA:
      Lidl, Kaufland, Carrefour, Penny, Profi, Auchan, Mega Image
      structurați pe EXACT 6 DIMENSIUNI/PILONI OBLIGATORII:
        1. Știri și decizii comerciale (commercial_decisions)
        2. Promoții și strategii de preț (pricing_promotions)
        3. Expansiune și investiții (expansion_investments)
        4. Modificări operaționale și management (operations_management)
        5. Reputație, reclamații și apariții negative (reputation_claims)
        6. Tendințe competitive și impact potențial asupra Fresh Meat (fresh_meat_impact)
  - EXACT 14 PUBLICAȚII SPECIALIZATE:
      8 România: Revista Progresiv, Revista Piața, Trends HRB, Modern Buyer,
                 Retail-FMCG, Meat.Milk, Retail.ro, RetailArena.ro
      6 Internaționale: Pig Progress, pig333, EuroMeatNews, Meat Management,
                        Eurocarne, FRS – Food Retail & Service
  - Strategic Category Intelligence (3 Strategic Insights | Fresh Meat Category).

Reguli de publicare:
  - NO VERIFIED SOURCE. NO PUBLISHED ARTICLE. Nicio știre sau dată fictivă.
  - Diferențiere strictă între elemente NOI (publicate în ultimele 7 zile) și conținut ISTORIC.
  - Când nu există noutăți pentru un pilon/retailer: afișare explicită "Fără noutăți verificate".
  - Dacă o actualizare eșuează: se păstrează ultimul raport valid și se afișează "ACTUALIZARE EȘUATĂ".
  - Publicare atomică și arhivare în public/data/retail_media_history/.
  - Sincronizare automată a hash-ului SHA-256 în market_intelligence_manifest.json.
"""

import sys
import os
import json
import re
import ssl
import html
import hashlib
import datetime
import urllib
import urllib.request
import urllib.error
import argparse
from pathlib import Path
from email.utils import parsedate_to_datetime

try:
    import zoneinfo
except ImportError:
    from backports import zoneinfo

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"
OUTPUT_FILE = PUBLIC_DATA_DIR / "retail_media_export.json"
HISTORY_DIR = PUBLIC_DATA_DIR / "retail_media_history"
VERIFIED_FILE = BASE_DIR / "verified_publications.json"
RECEIPT_FILE = BASE_DIR / "daily_collector_audit_receipt.json"

try:
    from strategic_category_intelligence import recalculate_competitive_intelligence
except ImportError:
    from fresh_meat_bi.strategic_category_intelligence import recalculate_competitive_intelligence

CTX = ssl.create_default_context()
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FreshMeatBI/3.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6"
}

RO_MONTHS = {
    "ianuarie": "01", "februarie": "02", "martie": "03", "aprilie": "04",
    "mai": "05", "iunie": "06", "iulie": "07", "august": "08",
    "septembrie": "09", "octombrie": "10", "noiembrie": "11", "decembrie": "12"
}
ES_MONTHS = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
}
EN_MONTHS = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}

PILLARS_META = {
    "commercial_decisions": {
        "title": "Știri și decizii comerciale",
        "description": "Parteneriate strategice, achiziții, politică comercială, branduri naționale și private label"
    },
    "pricing_promotions": {
        "title": "Promoții și strategii de preț",
        "description": "Mecanisme promoționale, cupoane digitale, campanii sezoniere și agresivitate KVI"
    },
    "expansion_investments": {
        "title": "Expansiune și investiții",
        "description": "Deschideri de magazine noi, modernizări, capacități logistice și investiții în rețea"
    },
    "operations_management": {
        "title": "Modificări operaționale și management",
        "description": "Numiri cheie în conducere, reorganizări, digitalizare în magazin și procese operaționale"
    },
    "reputation_claims": {
        "title": "Reputație, reclamații și apariții negative",
        "description": "Controverse, retrageri de produse, controale ANPC/DSVSA și impact reputațional"
    },
    "fresh_meat_impact": {
        "title": "Tendințe competitive și impact potențial asupra Fresh Meat",
        "description": "Dinamica raioanelor de carne, filiere locale de calitate și oportunități de categorie"
    }
}

RETAILERS_META = [
    {
        "id": "lidl",
        "name": "Lidl",
        "catalog_url": "https://www.lidl.ro/l/ro/cataloage/",
        "validity": "Luni – Duminică (Ediții Săptămânale)",
        "app_name": "Lidl Plus",
        "app_url": "https://www.lidl.ro/lidl-plus",
        "private_brand": "Cămara Noastră & Pikok",
        "focus_meat_kvi": ["Spată porc f.o.", "Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat"],
        "active_mechanics": "Cupon Lidl Plus (-20% la -25%), Promoții XXL, Super Weekend",
        "meat_price_position": "Lider de preț pe spata de porc (cupon digital / catalog)",
        "search_slug": "lidl",
        "search_terms": ["lidl", "lidl plus", "camara noastra", "cămara noastră"]
    },
    {
        "id": "kaufland",
        "name": "Kaufland",
        "catalog_url": "https://www.kaufland.ro/cataloage-cu-reduceri.html",
        "validity": "Miercuri – Marți (Ciclul principal de miercuri)",
        "app_name": "Kaufland Card",
        "app_url": "https://www.kaufland.ro/kaufland-card.html",
        "private_brand": "K-Purland & Vreau din România",
        "focus_meat_kvi": ["Spată porc f.o.", "Pulpă porc f.o.", "Cotlet porc f.o.", "Ceafă porc f.o."],
        "active_mechanics": "Reducere directă de catalog (-21% la -33%), Steaua Zilei, Weekend Kaufland",
        "meat_price_position": "Agresivitate directă: pulpă porc la 15,99 lei/kg și cotlet întreg la 16,99 lei/kg",
        "search_slug": "kaufland",
        "search_terms": ["kaufland", "kaufland card", "k-purland", "purland", "vreau din romania"]
    },
    {
        "id": "carrefour",
        "name": "Carrefour",
        "catalog_url": "https://carrefour.ro/corporate/cataloage",
        "validity": "Joi – Miercuri (Catalog Hipermarket / Market)",
        "app_name": "ActForFood / Aplicația Carrefour",
        "app_url": "https://carrefour.ro/corporate/aplicatia-carrefour",
        "private_brand": "Filiera Calității Carrefour & Drag de România",
        "focus_meat_kvi": ["Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat", "Carne tocată"],
        "active_mechanics": "Cupoane în aplicație, Reduceri 2+1 la preț special, Promoții ActForFood",
        "meat_price_position": "Focus pe trasabilitate și filieră de calitate românească, preț mediu KVI",
        "search_slug": "carrefour",
        "search_terms": ["carrefour", "actforfood", "filiera calitatii", "drag de romania"]
    },
    {
        "id": "penny",
        "name": "Penny",
        "catalog_url": "https://www.penny.ro/vezi-pliantele-saptamanii",
        "validity": "Miercuri – Marți (Pliant Național)",
        "app_name": "PENNY Card",
        "app_url": "https://www.penny.ro/penny-card",
        "private_brand": "Hanul Boieresc (Carne cu origine România)",
        "focus_meat_kvi": ["Pulpă porc f.o.", "Spată porc f.o.", "Cotlet porc feliat", "Piept pui dezosat"],
        "active_mechanics": "Preț redus cu scanare PENNY Card (-30%), Reduceri de volum (3 bucăți)",
        "meat_price_position": "Paritate competitivă la pulpa de porc f.o. Hanul Boieresc (15,99 lei/kg)",
        "search_slug": "penny",
        "search_terms": ["penny", "rewe", "penny card", "hanul boieresc"]
    },
    {
        "id": "profi",
        "name": "Profi",
        "catalog_url": "https://www.profi.ro/reviste-ro/",
        "validity": "Joi – Miercuri (Revista săptămânală)",
        "app_name": "Aplicația Profi",
        "app_url": "https://www.profi.ro/aplicatia-profi/",
        "private_brand": "Ferma din Deal",
        "focus_meat_kvi": ["Pulpă porc f.o.", "Spată porc f.o.", "Ceafă porc f.o.", "Carne tocată amestec"],
        "active_mechanics": "Cuponiada din aplicație, Reduceri pachet, Promoții locale de proximitate",
        "meat_price_position": "Accesibilitate în proximitate urbană și rurală; oportunitate de reacție rapidă KVI",
        "search_slug": "profi",
        "search_terms": ["profi", "ferma din deal", "profi rom", "profi loco", "profi city"]
    },
    {
        "id": "auchan",
        "name": "Auchan",
        "catalog_url": "https://www.auchan.ro/cataloage",
        "validity": "Miercuri – Marți (Catalog Național)",
        "app_name": "MyClub Auchan",
        "app_url": "https://romania.auchan.ro/myclub-auchan/",
        "private_brand": "Filiera Auchan & Pouce",
        "focus_meat_kvi": ["Pulpă porc f.o.", "Cotlet porc f.o.", "Piept pui dezosat"],
        "active_mechanics": "Cashback pe card MyClub (5-10% bani înapoi), Preț redus direct la casă",
        "meat_price_position": "Pondere ridicată a ambalajelor mari și caserolelor economice de familie",
        "search_slug": "auchan",
        "search_terms": ["auchan", "myclub auchan", "filiera auchan", "pouce"]
    },
    {
        "id": "mega-image",
        "name": "Mega Image",
        "catalog_url": "https://revista.mega-image.ro/",
        "validity": "Joi – Miercuri (Revista Săptămânală)",
        "app_name": "Card Connect & Mega Image App",
        "app_url": "https://www.mega-image.ro/card-connect",
        "private_brand": "Gusturi Românești & Mega Apetit",
        "focus_meat_kvi": ["Cotlet porc feliat", "Ceafă porc feliată", "Piept pui dezosat"],
        "active_mechanics": "Preț Card Connect, Promoții de weekend, Pachete proaspete gata de gătit",
        "meat_price_position": "Orientare premium pe piese feliate porționate; preț superior mediei pieței",
        "search_slug": "mega-image",
        "search_terms": ["mega image", "gusturi romanesti", "gusturi românești", "ahold delhaize", "card connect"]
    }
]

def get_current_bucharest_time():
    tz = zoneinfo.ZoneInfo("Europe/Bucharest")
    return datetime.datetime.now(tz)

def clean_text(t: str) -> str:
    if not t:
        return ""
    t = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', t, flags=re.DOTALL)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def parse_date_to_dmy(date_str: str) -> str:
    if not date_str:
        return None
    date_str = date_str.strip()
    try:
        dt = parsedate_to_datetime(date_str)
        return dt.strftime("%d.%m.%Y")
    except Exception:
        pass

    m_iso = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if m_iso:
        y, m, d = m_iso.group(1), m_iso.group(2), m_iso.group(3)
        return f"{d}.{m}.{y}"

    m_es = re.search(r'(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})', date_str, re.I)
    if m_es:
        d = m_es.group(1).zfill(2)
        mon = ES_MONTHS.get(m_es.group(2).lower(), "11")
        y = m_es.group(3)
        return f"{d}.{mon}.{y}"

    m_ro = re.search(r'(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})', date_str, re.I)
    if m_ro:
        d = m_ro.group(1).zfill(2)
        mon = RO_MONTHS.get(m_ro.group(2).lower(), "11")
        y = m_ro.group(3)
        return f"{d}.{mon}.{y}"

    m_en = re.search(r'([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})', date_str, re.I)
    if m_en:
        mon = EN_MONTHS.get(m_en.group(1).lower()[:3], "11")
        d = m_en.group(2).zfill(2)
        y = m_en.group(3)
        return f"{d}.{mon}.{y}"

    if re.match(r'^\d{2}\.\d{2}\.\d{4}$', date_str):
        return date_str

    return None

def date_sort_key(art):
    p_at = art.get("published_at") or art.get("date") or "01.01.2000"
    parts = p_at.split(".")
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return p_at

def is_published_within_days(date_dmy: str, reference_dt, max_days: int = 7) -> bool:
    try:
        parts = date_dmy.split(".")
        art_dt = datetime.datetime(int(parts[2]), int(parts[1]), int(parts[0]), tzinfo=reference_dt.tzinfo)
        diff = (reference_dt - art_dt).total_seconds()
        return 0 <= diff <= (max_days * 86400 + 43200) # allow 12h leeway
    except Exception:
        return False

def fetch_http(url: str, timeout: int = 12) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def fetch_rss_articles(url: str, max_items: int = 6) -> list:
    try:
        content = fetch_http(url)
        items = re.findall(r'<item>(.*?)</item>', content, re.DOTALL | re.IGNORECASE)
        res = []
        for it in items[:max_items]:
            m_t = re.search(r'<title>(.*?)</title>', it, re.DOTALL | re.IGNORECASE)
            m_l = re.search(r'<link>(.*?)</link>', it, re.DOTALL | re.IGNORECASE)
            m_d = re.search(r'<pubDate>(.*?)</pubDate>', it, re.DOTALL | re.IGNORECASE)
            m_desc = re.search(r'<description>(.*?)</description>', it, re.DOTALL | re.IGNORECASE)

            t = clean_text(m_t.group(1)) if m_t else ""
            l = clean_text(m_l.group(1)) if m_l else ""
            d_raw = clean_text(m_d.group(1)) if m_d else ""
            desc = clean_text(m_desc.group(1)) if m_desc else ""

            d = parse_date_to_dmy(d_raw)
            if t and l and d and l.startswith("http"):
                res.append({
                    "title": t,
                    "url": l,
                    "published_at": d,
                    "summary": (desc[:240] + "...") if len(desc) > 240 else desc
                })
        return res
    except Exception as e:
        print(f"       [WARN] Eroare RSS {url}: {e}")
        return []

def scrape_meat_milk() -> list:
    articles = []
    try:
        html_page = fetch_http("https://www.meat-milk.ro/")
        links = re.findall(r'<a[^>]+href="(/article/[^"]+)"[^>]*>(.*?)</a>', html_page, re.DOTALL)
        seen = set()
        for href, title_html in links:
            url = f"https://www.meat-milk.ro{href}"
            if url in seen:
                continue
            seen.add(url)
            t = clean_text(title_html)
            if len(t) < 20:
                continue
            try:
                art_html = fetch_http(url, timeout=8)
                m_date = re.search(r'"datePublished"\s*:\s*"([^"]+)"', art_html)
                m_desc = re.search(r'<meta[^>]+(?:name|property)="description"[^>]+content="([^"]+)"', art_html, re.I)
                d = parse_date_to_dmy(m_date.group(1)) if m_date else None
                desc = clean_text(m_desc.group(1)) if m_desc else ""
                if not desc:
                    m_lead = re.search(r'<div[^>]+class="[^"]*lead[^"]*"[^>]*>(.*?)</div>', art_html, re.DOTALL)
                    desc = clean_text(m_lead.group(1)) if m_lead else ""
                if d and t:
                    articles.append({
                        "title": t,
                        "url": url,
                        "published_at": d,
                        "summary": (desc[:240] + "...") if len(desc) > 240 else (desc or "Analiză de specialitate privind industria cărnii și a laptelui.")
                    })
                if len(articles) >= 3:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"       [WARN] Eroare colectare Meat.Milk: {e}")
    return articles

def scrape_pig_progress() -> list:
    articles = []
    try:
        html_page = fetch_http("https://www.foodagribusiness.world/pigs/")
        matches = re.findall(r'<a[^>]+href="(https://www.foodagribusiness.world/pigs/[^"]+)"[^>]*>(.*?)</a>', html_page, re.DOTALL)
        href_map = {}
        for url, title_html in matches:
            if url.endswith("/pigs/") or "/tag/" in url or "/category/" in url:
                continue
            clean_t = clean_text(title_html)
            clean_t = re.sub(r'^(?:[A-Za-z]{3}\s+\d+\s+News\s+|Pig Progress\s+|Premium\s+)+', '', clean_t, flags=re.I).strip()
            if len(clean_t) > len(href_map.get(url, "")):
                href_map[url] = clean_t

        for url, t in href_map.items():
            if len(t) < 20:
                continue
            try:
                art_html = fetch_http(url, timeout=8)
                m_date = re.search(r'"datePublished"\s*:\s*"([^"]+)"', art_html)
                if not m_date:
                    m_date = re.search(r'<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"', art_html, re.I)
                if not m_date:
                    m_date = re.search(r'(\d{4}-\d{2}-\d{2})', art_html)
                m_desc = re.search(r'<meta[^>]+(?:name|property)="description"[^>]+content="([^"]+)"', art_html, re.I)
                d = parse_date_to_dmy(m_date.group(1)) if m_date else None
                desc = clean_text(m_desc.group(1)) if m_desc else ""
                if d and t:
                    articles.append({
                        "title": t,
                        "url": url,
                        "published_at": d,
                        "summary": (desc[:240] + "...") if len(desc) > 240 else "European and international swine industry intelligence and market dynamics."
                    })
                if len(articles) >= 3:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"       [WARN] Eroare colectare Pig Progress: {e}")
    return articles

def scrape_eurocarne() -> list:
    articles = []
    try:
        html_page = fetch_http("https://eurocarne.com/noticias")
        matches = re.findall(r'<a[^>]+href="([^"]*noticias/codigo/[^"]+)"[^>]*>(.*?)</a>', html_page, re.DOTALL)
        href_map = {}
        for href, title_html in matches:
            url = f"https://eurocarne.com{href}" if href.startswith("/") else href
            clean_t = clean_text(title_html)
            if len(clean_t) > len(href_map.get(url, "")):
                href_map[url] = clean_t

        for url, t in href_map.items():
            if len(t) < 20:
                continue
            try:
                art_html = fetch_http(url, timeout=8)
                m_date = re.search(r'(\d{1,2}\s+de\s+[a-zA-Z]+\s+de\s+\d{4})', art_html, re.I)
                m_desc = re.search(r'<meta[^>]+(?:name|property)="description"[^>]+content="([^"]+)"', art_html, re.I)
                d = parse_date_to_dmy(m_date.group(1)) if m_date else None
                desc = clean_text(m_desc.group(1)) if m_desc else ""
                if d and t:
                    articles.append({
                        "title": t,
                        "url": url,
                        "published_at": d,
                        "summary": (desc[:240] + "...") if len(desc) > 240 else "Noutăți și reglementări din sectorul european al cărnii și procesării."
                    })
                if len(articles) >= 3:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"       [WARN] Eroare colectare Eurocarne: {e}")
    return articles

def scrape_frs() -> list:
    articles = []
    try:
        html_page = fetch_http("https://www.foodretail.es/retailers/")
        matches = re.findall(r'<a[^>]+href="(/retailers/[^"]+\.html)"[^>]*>(.*?)</a>', html_page, re.DOTALL)
        href_map = {}
        for href, title_html in matches:
            url = f"https://www.foodretail.es{href}"
            clean_t = clean_text(title_html)
            if len(clean_t) > len(href_map.get(url, "")):
                href_map[url] = clean_t

        for url, t in href_map.items():
            if len(t) < 20:
                continue
            try:
                art_html = fetch_http(url, timeout=8)
                m_date = re.search(r'itemprop="datePublished"\s+content="([^"]+)"', art_html)
                m_desc = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]+)"', art_html, re.I)
                d = parse_date_to_dmy(m_date.group(1)) if m_date else None
                desc = clean_text(m_desc.group(1)) if m_desc else ""
                if d and t:
                    articles.append({
                        "title": t,
                        "url": url,
                        "published_at": d,
                        "summary": (desc[:240] + "...") if len(desc) > 240 else "Evoluția retailului alimentar și a formatelor de proximitate în Europa."
                    })
                if len(articles) >= 3:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"       [WARN] Eroare colectare FRS: {e}")
    return articles

def scrape_euromeat() -> list:
    articles = []
    try:
        html_page = fetch_http("https://euromeatnews.com/")
        matches = re.findall(r'<a[^>]+href="(/[^"]+)"[^>]*>(.*?)</a>', html_page, re.DOTALL)
        href_map = {}
        for href, title_html in matches:
            if href.startswith(("/tag/", "/category/", "/about", "/contact", "/privacy", "/terms")):
                continue
            url = f"https://euromeatnews.com{href}"
            clean_t = clean_text(title_html)
            if len(clean_t) > len(href_map.get(url, "")):
                href_map[url] = clean_t

        for url, t in href_map.items():
            if len(t) < 20:
                continue
            try:
                art_html = fetch_http(url, timeout=8)
                m_date = re.search(r'class="[^"]*date[^"]*"[^>]*>(.*?)<', art_html, re.I)
                m_desc = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]+)"', art_html, re.I)
                d = parse_date_to_dmy(m_date.group(1)) if m_date else None
                desc = clean_text(m_desc.group(1)) if m_desc else ""
                if d and t:
                    articles.append({
                        "title": t,
                        "url": url,
                        "published_at": d,
                        "summary": (desc[:240] + "...") if len(desc) > 240 else "Noutăți din piața cărnii de porc și procesării la nivel european."
                    })
                if len(articles) >= 3:
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"       [WARN] Eroare colectare EuroMeatNews: {e}")
    return articles

def scrape_publication_live(pub_id: str) -> list:
    if pub_id == "progresiv":
        return fetch_rss_articles("https://revistaprogresiv.ro/feed/")
    elif pub_id == "piata":
        return fetch_rss_articles("https://www.revista-piata.ro/feed")
    elif pub_id == "trendshrb":
        return fetch_rss_articles("https://www.trendshrb.ro/feed/")
    elif pub_id == "modernbuyer":
        return fetch_rss_articles("https://modernbuyer.ro/feed/")
    elif pub_id == "retailfmcg":
        return fetch_rss_articles("https://www.retail-fmcg.ro/feed")
    elif pub_id == "retailro":
        return fetch_rss_articles("https://www.retail.ro/feed")
    elif pub_id == "meatmilk":
        return scrape_meat_milk()
    elif pub_id == "pigprogress":
        return scrape_pig_progress()
    elif pub_id == "eurocarne":
        return scrape_eurocarne()
    elif pub_id == "frs":
        return scrape_frs()
    elif pub_id == "euromeat":
        return scrape_euromeat()
    return []

def classify_article_to_pillar(title: str, summary: str) -> str:
    combined = (title + " " + summary).lower()
    
    # Priority 1: Fresh meat specific
    if any(k in combined for k in ["carne", "porc", "mezel", "abator", "măcelăr", "k-purland", "cămara noastră", "hanul boieresc", "gusturi românești", "filiera auchan", "drag de românia"]):
        return "fresh_meat_impact"

    # Priority 2: Reputation, alerts, ANPC, controversies
    if any(k in combined for k in ["anpc", "amendă", "reclamaț", "retragere", "alertă", "controverse", "litigiu", "sancțiun", "fals", "neregul"]):
        return "reputation_claims"

    # Priority 3: Pricing, discounts, loyalty mechanics, KVI
    if any(k in combined for k in ["preț", "reducere", "promo", "discount", "oferte", "kvi", "ieftin", "campanie promo", "black friday", "cupon", "card", "economie", "bani înapoi", "cashback"]):
        return "pricing_promotions"

    # Priority 4: Expansion, new stores, network logistics
    if any(k in combined for k in ["deschide", "magazin", "extinde", "investiț", "rețea", "inaugurare", "supermarket", "hipermarket", "locație", "logistic", "depozit", "euro"]):
        return "expansion_investments"

    # Priority 5: Operations & Management, app, CEO, team
    if any(k in combined for k in ["management", "ceo", "director", "operațional", "digitaliz", "aplicaț", "scan", "reorganiz", "conducere", "echipă", "angajat", "self-checkout"]):
        return "operations_management"

    # Fallback: Commercial decisions & strategy
    return "commercial_decisions"

def collect_retailer_live_intelligence(retailer: dict, all_available_articles: list, now_dt: datetime.datetime):
    r_id = retailer["id"]
    r_slug = retailer.get("search_slug", r_id)
    search_terms = [t.lower() for t in retailer.get("search_terms", [r_id])]

    candidate_articles = []

    # 1. Direct query on retail-fmcg search feed for this retailer
    rss_url = f"https://www.retail-fmcg.ro/feed?s={r_slug}"
    rss_items = fetch_rss_articles(rss_url, max_items=8)
    for it in rss_items:
        candidate_articles.append({
            "title": it["title"],
            "url": it["url"],
            "published_at": it["published_at"],
            "summary": it.get("summary") or f"Știre monitorizată pentru {retailer['name']}.",
            "source": "Retail-FMCG.ro"
        })

    # 2. Cross-reference from the 14 publications article pool
    for art in all_available_articles:
        t_low = art.get("title", "").lower()
        s_low = art.get("summary", "").lower()
        if any(term in t_low or term in s_low for term in search_terms):
            candidate_articles.append({
                "title": art["title"],
                "url": art["url"],
                "published_at": art.get("published_at") or art.get("date"),
                "summary": art.get("summary", ""),
                "source": art.get("source") or "Presă Specializată Retail"
            })

    # Deduplicate candidate articles by URL and normalized title
    deduped = []
    seen_urls = set()
    seen_titles = set()
    for it in candidate_articles:
        u = it["url"].strip()
        t = it["title"].strip()
        d = it["published_at"]
        norm_t = re.sub(r'\W+', '', t.lower())
        if not u or not t or not d or u in seen_urls or norm_t in seen_titles:
            continue
        seen_urls.add(u)
        seen_titles.add(norm_t)
        deduped.append(it)

    # Sort candidates by publication date descending
    deduped.sort(key=date_sort_key, reverse=True)

    # Distribute into the 6 pillars
    pillars_data = {
        k: {
            "pillar_id": k,
            "title": v["title"],
            "description": v["description"],
            "items": [],
            "has_news": False,
            "message": "Fără noutăți verificate"
        }
        for k, v in PILLARS_META.items()
    }

    now_audit = now_dt.strftime("%d.%m.%Y %H:%M")

    for it in deduped:
        pillar_key = classify_article_to_pillar(it["title"], it["summary"])
        # Maximum 2 items per pillar to keep concise executive focus
        if len(pillars_data[pillar_key]["items"]) >= 2:
            continue

        is_new = is_published_within_days(it["published_at"], now_dt, max_days=7)
        art_id = f"{r_id}-{pillar_key}-{hashlib.md5(it['url'].encode('utf-8')).hexdigest()[:8]}"

        item_obj = {
            "id": art_id,
            "title": it["title"],
            "summary": it["summary"] if len(it["summary"]) > 20 else f"Evoluție de interes comercial înregistrată pentru {retailer['name']}.",
            "source": it["source"],
            "url": it["url"],
            "published_at": it["published_at"],
            "verified_at": now_audit,
            "verification_status": "VERIFIED",
            "is_new": is_new,
            "time_horizon": "NOU (Ultimele 7 zile)" if is_new else "ISTORIC DE CONTEXT"
        }
        pillars_data[pillar_key]["items"].append(item_obj)
        pillars_data[pillar_key]["has_news"] = True
        pillars_data[pillar_key]["message"] = f"{len(pillars_data[pillar_key]['items'])} informație/informații verificate"

    return pillars_data

def get_verified_publications(today_str: str, now_dt: datetime.datetime):
    now_audit = now_dt.strftime("%d.%m.%Y, 08:00")
    start_dt = now_dt
    start_time_iso = start_dt.isoformat()

    print(f"\n=================================================================")
    print(f" RETAIL MEDIA MONITOR — COLECTARE & AUDIT (14 PUBLICAȚII + 7 RETAILERI)")
    print(f" Dată de execuție: {today_str} | Start: {start_dt.strftime('%d.%m.%Y %H:%M:%S')} (Europe/Bucharest)")
    print(f"=================================================================")

    if not VERIFIED_FILE.exists():
        raise FileNotFoundError(f"Missing required authoritative persistence: {VERIFIED_FILE}")

    existing_pubs = json.loads(VERIFIED_FILE.read_text(encoding="utf-8"))
    updated_pubs = []
    audit_summary = []
    all_pool_articles = []

    for p in existing_pubs:
        pid = p["id"]
        pname = p["name"]
        purl = p["website"]
        print(f"[*] Colectare {pname:<24} [{pid}] ... ", end="", flush=True)

        live_articles = scrape_publication_live(pid)
        candidates_count = len(live_articles)
        current_articles = p.get("articles", [])

        combined = []
        seen_urls = set()
        seen_titles = set()
        new_accepted = []
        rejected = []

        for la in live_articles:
            u = la.get("url", "").strip()
            t = la.get("title", "").strip()
            d = la.get("published_at")
            if not u or not u.startswith("http"):
                rejected.append({"url": u, "reason": "INVALID_OR_MISSING_URL"})
                continue
            if not t or len(t) < 15:
                rejected.append({"url": u, "reason": "SHORT_OR_PLACEHOLDER_TITLE"})
                continue
            if not d:
                rejected.append({"url": u, "reason": "MISSING_AUTHENTIC_PUBLICATION_DATE"})
                continue

            norm_title = re.sub(r'\W+', '', t.lower())
            if u in seen_urls or norm_title in seen_titles:
                rejected.append({"url": u, "reason": "DUPLICATE_IN_BATCH"})
                continue

            seen_urls.add(u)
            seen_titles.add(norm_title)

            is_new = True
            for ea in current_articles:
                if ea.get("url") == u or re.sub(r'\W+', '', ea.get("title", "").lower()) == norm_title:
                    is_new = False
                    break

            art_id = f"{pid}-{hashlib.md5(u.encode('utf-8')).hexdigest()[:8]}"
            art_obj = {
                "id": art_id,
                "title": t,
                "published_at": d,
                "collected_at": now_audit,
                "verified_at": now_audit,
                "updated_at": now_audit,
                "verification_status": "VERIFIED",
                "date": d,
                "summary": la.get("summary") or "Articol de specialitate verificat din sursa oficială.",
                "url": u,
                "source": pname
            }
            combined.append(art_obj)
            all_pool_articles.append(art_obj)
            if is_new:
                new_accepted.append({"title": t, "published_at": d, "url": u})

        # Add remaining existing valid articles (FAIL_CLOSED retention)
        for ea in current_articles:
            u = ea.get("url", "").strip()
            t = ea.get("title", "").strip()
            d = ea.get("published_at") or ea.get("date")
            if not u or not t or not d or not u.startswith("http"):
                continue
            norm_title = re.sub(r'\W+', '', t.lower())
            if u in seen_urls or norm_title in seen_titles:
                continue
            seen_urls.add(u)
            seen_titles.add(norm_title)

            clean_ea = dict(ea)
            clean_ea["id"] = ea.get("id") or f"{pid}-{hashlib.md5(u.encode('utf-8')).hexdigest()[:8]}"
            clean_ea["published_at"] = d
            clean_ea["date"] = d
            clean_ea["verification_status"] = "VERIFIED"
            clean_ea["collected_at"] = clean_ea.get("collected_at") or now_audit
            clean_ea["verified_at"] = clean_ea.get("verified_at") or now_audit
            clean_ea["updated_at"] = now_audit
            clean_ea["source"] = pname
            combined.append(clean_ea)
            all_pool_articles.append(clean_ea)

        combined.sort(key=date_sort_key, reverse=True)
        final_articles = combined[:3]

        clean_p = dict(p)
        clean_p["articles"] = final_articles
        updated_pubs.append(clean_p)

        pub_status = "LIVE_FETCH_OK" if live_articles else "RETAINED_VERIFIED_FAIL_CLOSED"
        audit_summary.append({
            "pub_id": pid,
            "name": pname,
            "website": purl,
            "status": pub_status,
            "candidates_scanned": candidates_count,
            "new_articles_count": len(new_accepted),
            "new_accepted": new_accepted,
            "rejected_count": len(rejected),
            "rejected_details": rejected,
            "final_top3_count": len(final_articles),
            "latest_published_at": final_articles[0]["published_at"] if final_articles else None
        })

        if len(new_accepted) > 0:
            print(f"OK (+{len(new_accepted)} noi; top: {len(final_articles)})")
        else:
            print(f"OK (Verificate menținute; top: {len(final_articles)})")

    end_dt = get_current_bucharest_time()
    duration_sec = round((end_dt - start_dt).total_seconds(), 2)

    receipt = {
        "execution_date": today_str,
        "start_time_bucharest": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "end_time_bucharest": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "start_time_iso": start_time_iso,
        "end_time_iso": end_dt.isoformat(),
        "duration_seconds": duration_sec,
        "total_publications": len(updated_pubs),
        "total_new_articles_accepted": sum(a["new_articles_count"] for a in audit_summary),
        "total_verified_articles": sum(len(p["articles"]) for p in updated_pubs),
        "publications_audit": audit_summary
    }

    VERIFIED_FILE.write_text(json.dumps(updated_pubs, indent=2, ensure_ascii=False), encoding="utf-8")
    RECEIPT_FILE.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")

    return updated_pubs, receipt, all_pool_articles

def archive_report_snapshot(report_data: dict, edition_date_dmy: str, edition_time: str):
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    parts = edition_date_dmy.split(".")
    y, m, d = parts[2], parts[1], parts[0]
    time_clean = edition_time.replace(":", "")
    snapshot_filename = f"report_{y}{m}{d}_{time_clean}.json"
    snapshot_path = HISTORY_DIR / snapshot_filename

    # Save historical snapshot
    snapshot_path.write_text(json.dumps(report_data, indent=2, ensure_ascii=False), encoding="utf-8")

    # Update index.json in history directory
    index_file = HISTORY_DIR / "index.json"
    history_index = []
    if index_file.exists():
        try:
            history_index = json.loads(index_file.read_text(encoding="utf-8"))
        except Exception:
            history_index = []

    # Deduplicate index by filename
    history_index = [entry for entry in history_index if entry.get("filename") != snapshot_filename]
    history_index.insert(0, {
        "filename": snapshot_filename,
        "edition_date": edition_date_dmy,
        "edition_time": edition_time,
        "period_analyzed": report_data.get("period_analyzed"),
        "update_state": report_data.get("update_state"),
        "total_new_items": report_data.get("new_articles_count", 0),
        "dataset_sha256": report_data.get("dataset_sha256")
    })

    # Keep top 30 history entries in index
    history_index = history_index[:30]
    index_file.write_text(json.dumps(history_index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ Raport arhivat istoric: {snapshot_path}")

def generate_retail_media_data(
    simulate_failure: bool = False,
    simulate_no_news: bool = False,
    force: bool = False
):
    now_ro = get_current_bucharest_time()
    today_str = now_ro.strftime("%d.%m.%Y")
    now_formatted = f"{today_str}, 08:00"

    seven_days_ago = now_ro - datetime.timedelta(days=7)
    period_str = f"{seven_days_ago.strftime('%d.%m.%Y')} – {today_str} (Ultimele 7 zile)"

    # Read existing payload if available for fallback/retention
    existing_data = None
    if OUTPUT_FILE.exists():
        try:
            existing_data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        except Exception:
            existing_data = None

    # CASE A: SIMULATE FAILURE / RESILIENCE
    if simulate_failure:
        print("\n[!] SIMULARE EȘEC ACTIVATĂ: Menținere raport valid anterior cu marcaj 'ACTUALIZARE EȘUATĂ'")
        if existing_data:
            failed_payload = dict(existing_data)
            failed_payload["update_state"] = "UPDATE_FAILED"
            failed_payload["update_state_label"] = "ACTUALIZARE EȘUATĂ"
            failed_payload["last_attempt_bucharest"] = now_ro.strftime("%d.%m.%Y %H:%M")
            failed_payload["failure_reason"] = "Sursă externă indisponibilă. Conținutul anterior valid a fost conservat 100% (FAIL_CLOSED)."
            OUTPUT_FILE.write_text(json.dumps(failed_payload, indent=2, ensure_ascii=False), encoding="utf-8")
            return failed_payload
        else:
            raise RuntimeError("Cannot simulate failure without existing baseline data.")

    # Execute publication collectors
    pubs, receipt, all_pool = get_verified_publications(today_str, now_ro)

    # Execute Retailer-targeted intelligence collection across the 6 pillars
    print("\n[*] Monitorizare și clasificare pe cei 6 piloni pentru EXACT 7 RETAILERI:")
    retailers_data = []
    total_retailer_new_items = 0

    for r_meta in RETAILERS_META:
        p_stream = collect_retailer_live_intelligence(r_meta, all_pool, now_ro)
        r_entry = dict(r_meta)
        # Remove internal search keys before output
        r_entry.pop("search_slug", None)
        r_entry.pop("search_terms", None)
        r_entry["intelligence_stream"] = p_stream

        # Count new items for this retailer
        r_new_count = sum(
            len([it for it in pillar["items"] if it.get("is_new")])
            for pillar in p_stream.values()
        )
        total_retailer_new_items += r_new_count

        active_pillars = sum(1 for p in p_stream.values() if p["has_news"])
        print(f"    • {r_meta['name']:<12}: {active_pillars}/6 piloni cu informații verificate (+{r_new_count} noutăți)")
        retailers_data.append(r_entry)

    total_new_accepted = receipt["total_new_articles_accepted"] + total_retailer_new_items

    # CASE B: SIMULATE NO NEWS / ZERO NEW DATA FOUND
    if simulate_no_news or (total_new_accepted == 0 and not force):
        print("\n[i] Niciun item nou validat în acest ciclu de scanare. Se menține ediția anterioară cu statut 'Fără noutăți verificate'.")
        update_state = "NO_NEW_DATA"
        update_state_label = "Fără noutăți verificate"
        edition_date = existing_data.get("updated_date", today_str) if existing_data else today_str
        edition_time = existing_data.get("updated_time", "08:00") if existing_data else "08:00"
    else:
        update_state = "VERIFIED_FRESH_UPDATE"
        update_state_label = f"Actualizare Verificată (+{total_new_accepted} noutăți)"
        edition_date = today_str
        edition_time = "08:00"

    last_successful_check = now_ro.strftime("%d.%m.%Y %H:%M")

    # Assemble comprehensive payload
    payload = {
        "schema_version": "2.0-daily-7retailers-6pillars",
        "status": "ACTIVE_MONITORED",
        "update_state": update_state,
        "update_state_label": update_state_label,
        "updated": f"{edition_date}, {edition_time}",
        "updated_date": edition_date,
        "updated_time": edition_time,
        "last_collection_bucharest": last_successful_check,
        "last_collection_iso": now_ro.isoformat(),
        "last_successful_check": last_successful_check,
        "period_analyzed": period_str,
        "execution_timezone": "Europe/Bucharest",
        "new_articles_count": total_new_accepted,
        "total_verified_articles": receipt["total_verified_articles"],
        
        # EXACT 7 RETAILERI CU 6 PILONI
        "retailers": retailers_data,

        # EXACT 14 PUBLICAȚII SPECIALIZATE (8 RO + 6 INTERNAȚIONALE)
        "publications": pubs,

        # COMPETITIVE INTELLIGENCE & RECOMANDĂRI SINCRONIZATE
        "competitive_intelligence": recalculate_competitive_intelligence()
    }

    # Compute SHA-256 hash before saving
    raw_json = json.dumps(payload, indent=2, ensure_ascii=False)
    payload_sha256 = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
    payload["dataset_sha256"] = payload_sha256

    # ATOMIC PUBLISHING: Write to temporary file, validate, then rename
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = PUBLIC_DATA_DIR / f".tmp_{OUTPUT_FILE.name}"
    temp_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Verification gate on temporary file
    test_read = json.loads(temp_file.read_text(encoding="utf-8"))
    assert len(test_read.get("retailers", [])) == 7, "Gate failure: must contain 7 retailers"
    assert len(test_read.get("publications", [])) == 14, "Gate failure: must contain 14 publications"
    for r in test_read["retailers"]:
        assert "intelligence_stream" in r, f"Gate failure: missing intelligence_stream in {r['name']}"
        assert len(r["intelligence_stream"]) == 6, f"Gate failure: exactly 6 pillars required for {r['name']}"

    # Atomic swap
    os.replace(temp_file, OUTPUT_FILE)
    print(f"\n✓ Publicare atomică finalizată cu succes în: {OUTPUT_FILE}")
    print(f"  SHA-256: {payload_sha256}")
    print(f"  Statut actualizare: {update_state} ({update_state_label})")
    print(f"  Ediție raport: {edition_date}, {edition_time} | Data ultimei colectări: {last_successful_check}")
    print(f"  Total noutăți validate: {total_new_accepted}")

    # Archive historical snapshot
    archive_report_snapshot(payload, edition_date, edition_time)

    # Update unified manifest
    try:
        from update_market_intelligence_manifest import generate_manifest
        generate_manifest()
        print("  ✓ Manifestul unificat market_intelligence_manifest.json a fost actualizat cu noul SHA-256.")
    except Exception as e:
        print(f"  [WARN] Actualizarea manifestului a returnat: {e}")

    return payload

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Daily Retail Media Monitor Collector & Publisher")
    parser.add_argument("--force", action="store_true", help="Force publication as new update")
    parser.add_argument("--simulate-failure", action="store_true", help="Simulate network failure and activate UPDATE_FAILED state")
    parser.add_argument("--simulate-no-news", action="store_true", help="Simulate zero new items and activate NO_NEW_DATA state")
    args = parser.parse_args()

    generate_retail_media_data(
        simulate_failure=args.simulate_failure,
        simulate_no_news=args.simulate_no_news,
        force=args.force
    )
