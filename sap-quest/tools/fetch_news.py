#!/usr/bin/env python3
"""Scarica i feed RSS/Atom elencati in data/news_sources.json e scrive data/news.json.

Uso:
  python3 tools/fetch_news.py                       # scarica dalla rete
  python3 tools/fetch_news.py --from-file x.xml:Nome  # test offline (ripetibile)

Regole:
- Solo link http/https (mai javascript:, data: ecc.): il contenuto dei feed è esterno e non fidato.
- Se nessuna fonte risponde, il file esistente NON viene toccato (exit 0, con avviso).
- Il file viene riscritto solo se le notizie sono cambiate, così le automazioni non fanno commit inutili.
"""
import argparse
import datetime as dt
import email.utils
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
UA = "Mozilla/5.0 (compatible; QuotaQuestBot/1.0; +https://github.com/vincent-vega-vk/GPT)"
TAG = re.compile(r"<[^>]+>")
SPACE = re.compile(r"\s+")


def strip_ns(tag):
    return tag.rsplit("}", 1)[-1]


def child(el, name):
    for c in el:
        if strip_ns(c.tag) == name:
            return c
    return None


def children(el, name):
    return [c for c in el if strip_ns(c.tag) == name]


def text_of(el):
    """Testo completo di un nodo, anche se contiene markup annidato; '' se il nodo manca."""
    return "".join(el.itertext()) if el is not None else ""


def clean_text(s, limit=None):
    s = html.unescape(TAG.sub(" ", s or ""))
    s = SPACE.sub(" ", s).strip()
    if limit and len(s) > limit:
        s = s[:limit].rsplit(" ", 1)[0].rstrip(" ,;:.-") + "…"
    return s


def safe_url(u):
    u = (u or "").strip()
    return u if re.match(r"^https?://[^\s]+$", u, re.I) else None


def norm_link(u):
    u = re.sub(r"[?&]utm_[^&]+", "", u)
    return u.rstrip("?&/").lower()


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        d = None
    if d is None:
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def parse_feed(xml_bytes, source_name):
    """Restituisce una lista di dict {title, link, date, source, summary} da RSS 2.0 o Atom."""
    root = ET.fromstring(xml_bytes)
    items = []
    kind = strip_ns(root.tag)
    if kind == "rss" or kind == "RDF":
        channel = child(root, "channel")
        if channel is None:
            channel = root
        entries = children(channel, "item") or children(root, "item")
        for it in entries:
            title = clean_text(text_of(child(it, "title")))
            link = safe_url(text_of(child(it, "link")))
            date = parse_date(text_of(child(it, "pubDate")) or text_of(child(it, "date")))
            desc = clean_text(text_of(child(it, "description")), 220)
            outlet = clean_text(text_of(child(it, "source"))) or source_name
            items.append(dict(title=title, link=link, date=date, source=outlet, summary=desc))
    elif kind == "feed":
        for it in children(root, "entry"):
            title = clean_text(text_of(child(it, "title")))
            link = None
            for l in children(it, "link"):
                if l.get("rel") in (None, "alternate"):
                    link = safe_url(l.get("href"))
                    break
            date = parse_date(text_of(child(it, "published")) or text_of(child(it, "updated")))
            sm = child(it, "summary")
            if sm is None:
                sm = child(it, "content")
            desc = clean_text(text_of(sm), 220)
            items.append(dict(title=title, link=link, date=date, source=source_name, summary=desc))
    else:
        raise ValueError(f"formato feed non riconosciuto: {kind}")
    # Google News mette " - Testata" in coda al titolo
    for i in items:
        m = re.match(r"^(.*)\s+-\s+([^-]{2,40})$", i["title"])
        if m and i["source"] == source_name and "news.google" in (i["link"] or ""):
            i["title"], i["source"] = m.group(1), m.group(2)
        if i["source"] and i["title"].endswith(" - " + i["source"]):
            i["title"] = i["title"][: -len(i["source"]) - 3]
    return [i for i in items if i["title"] and i["link"]]


def download(url, tries=3):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            time.sleep(1.5 * (k + 1))
    raise last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from-file", action="append", default=[], help="percorso.xml[:NomeFonte] (test offline)")
    ap.add_argument("--out", default=os.path.join(DATA, "news.json"))
    args = ap.parse_args()

    cfg_path = os.path.join(DATA, "news_sources.json")
    cfg = {"sources": [], "maxItems": 30}
    if os.path.exists(cfg_path):
        with open(cfg_path, encoding="utf-8") as fh:
            cfg = json.load(fh)
    max_items = int(cfg.get("maxItems", 30))

    jobs = []
    if args.from_file:
        for spec in args.from_file:
            path, _, name = spec.partition(":")
            jobs.append((name or os.path.basename(path), None, path, 50))
    else:
        for s in cfg["sources"]:
            jobs.append((s["name"], s["url"], None, int(s.get("limit", 10))))

    collected, ok_sources = [], 0
    for name, url, path, limit in jobs:
        try:
            if path:
                with open(path, "rb") as fh:
                    raw = fh.read()
            else:
                raw = download(url)
            got = parse_feed(raw, name)
            got.sort(key=lambda i: i["date"] or dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc), reverse=True)
            collected.extend(got[:limit])
            ok_sources += 1
            print(f"  ok   {name}: {len(got)} voci ({min(len(got), limit)} tenute)")
        except Exception as e:  # una fonte rotta non deve fermare le altre
            print(f"  warn {name}: {type(e).__name__}: {e}")

    if not ok_sources:
        print("Nessuna fonte raggiungibile: news.json lasciato invariato.")
        return 0

    seen_l, seen_t, items = set(), set(), []
    collected.sort(key=lambda i: i["date"] or dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc), reverse=True)
    for i in collected:
        kl, kt = norm_link(i["link"]), re.sub(r"\W+", "", i["title"].lower())[:80]
        if kl in seen_l or kt in seen_t:
            continue
        seen_l.add(kl); seen_t.add(kt)
        items.append({
            "title": i["title"], "link": i["link"], "source": i["source"],
            "date": i["date"].strftime("%Y-%m-%dT%H:%M:%SZ") if i["date"] else None,
            "summary": i["summary"],
        })
        if len(items) >= max_items:
            break

    old = {}
    if os.path.exists(args.out):
        try:
            with open(args.out, encoding="utf-8") as fh:
                old = json.load(fh)
        except json.JSONDecodeError:
            old = {}
    if old.get("items") == items:
        print(f"Nessuna novità ({len(items)} notizie): file invariato.")
        return 0
    out = {"fetchedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"Scritte {len(items)} notizie in {os.path.relpath(args.out, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
