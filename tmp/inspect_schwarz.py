from fresh_meat_bi.collector import fetch_endpoint
import re, json

s, m, t = fetch_endpoint("https://auchan.ro/cataloage", timeout=8)
print("Auchan cataloage status:", s, len(t))
links = re.findall(r'href=\"([^\"]*(?:catalog|pliant|leaflet|revista)[^\"]*)\"', t, re.I)
print("Auchan links:", set(links))
pdf_links = re.findall(r'href=\"([^\"]*\.pdf[^\"]*)\"', t, re.I)
print("Auchan PDF links:", set(pdf_links))
