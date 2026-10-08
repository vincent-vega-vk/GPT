#!/usr/bin/env python3
"""Costruisce data/bundle.js (unico file caricato dal gioco) e data/facts-index.json.

Uso:
  python3 tools/build.py                 # genera bundle + indice
  python3 tools/build.py --dist _site    # in più copia i file pubblicabili in _site/
  python3 tools/build.py --artifact out.html   # pagina unica (CSS+JS+dati in linea) per Claude Artifact

Il bundle è deterministico: stessi input => stesso output (niente timestamp "adesso"),
così le automazioni committano solo quando cambia davvero qualcosa.
"""
import argparse
import glob
import json
import os
import re
import shutil
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
PLACEHOLDER = re.compile(r"\{\{([^{}]*)\}\}")


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def ex_id(level_id, ex, used):
    """ID stabile: dipende da tipo+testo della domanda, non da spiegazioni o valori dei fatti."""
    core = [ex.get("t", ""), ex.get("q", "")]
    if ex.get("t") == "match":
        core.append(json.dumps(ex.get("pairs"), ensure_ascii=False))
    h = format(zlib.crc32("|".join(core).encode("utf-8")) & 0xFFFFFFFF, "08x")[:6]
    cand = f"{level_id}-{h}"
    n = 2
    while cand in used:
        cand = f"{level_id}-{h}{n}"
        n += 1
    used.add(cand)
    return cand


def refs_in(obj):
    """Chiavi dei fatti citate in una struttura arbitraria."""
    found = set()
    def walk(x):
        if isinstance(x, str):
            for m in PLACEHOLDER.finditer(x):
                found.add(m.group(1).strip())
        elif isinstance(x, list):
            for i in x:
                walk(i)
        elif isinstance(x, dict):
            for i in x.values():
                walk(i)
    walk(obj)
    return found


def build():
    cur = load(os.path.join(DATA, "curriculum.json"))
    if not cur:
        sys.exit("curriculum.json mancante")

    facts = {}
    for path in sorted(glob.glob(os.path.join(DATA, "facts", "*.json"))):
        d = load(path, {})
        for k, v in d.items():
            if k in facts:
                sys.exit(f"chiave fatto duplicata: {k}")
            facts[k] = v

    worlds, assessment, index = [], {}, {}
    used = set()
    n_levels = n_ex = 0
    for w in cur["worlds"]:
        stem = f"{w['id']}-{w['slug']}"
        wd = load(os.path.join(DATA, "worlds", stem + ".json"))
        ad = load(os.path.join(DATA, "assessment", stem + ".json"))
        meta = {k: w[k] for k in ("id", "slug", "title", "subtitle", "icon", "scope")}
        if not wd:
            meta["levels"] = []
            meta["missing"] = True
            worlds.append(meta)
            continue
        levels = []
        for lv in wd["levels"]:
            lv = json.loads(json.dumps(lv))  # copia
            for key in refs_in(lv.get("lesson")):
                index.setdefault(key, []).append(f"{lv['id']}#lesson")
            for e in lv["ex"]:
                e["id"] = ex_id(lv["id"], e, used)
                for key in refs_in(e):
                    index.setdefault(key, []).append(e["id"])
                n_ex += 1
            levels.append(lv)
            n_levels += 1
        meta["levels"] = levels
        worlds.append(meta)
        if ad:
            items = []
            for j, e in enumerate(ad["items"], 1):
                e = json.loads(json.dumps(e))
                e["id"] = f"{w['id']}-as{j}"
                for key in refs_in(e):
                    index.setdefault(key, []).append(e["id"])
                items.append(e)
            assessment[w["id"]] = items

    news = load(os.path.join(DATA, "news.json"), {"fetchedAt": None, "items": []})
    dates = [f.get("checked", "") for f in facts.values()]
    if news.get("fetchedAt"):
        dates.append(news["fetchedAt"][:10])
    content_date = max(dates) if dates else ""

    bundle = {
        "meta": {
            "contentDate": content_date,
            "levels": n_levels,
            "exercises": n_ex,
            "assessmentItems": sum(len(v) for v in assessment.values()),
            "facts": len(facts),
            "audience": cur.get("audience", ""),
        },
        "worlds": worlds,
        "assessment": assessment,
        "facts": facts,
        "news": news,
    }
    out = os.path.join(DATA, "bundle.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("/* GENERATO da tools/build.py: non modificare a mano. */\n")
        f.write("window.SQ_DATA=")
        json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
        f.write(";\n")
    with open(os.path.join(DATA, "facts-index.json"), "w", encoding="utf-8") as f:
        json.dump({k: sorted(v) for k, v in sorted(index.items())}, f, ensure_ascii=False, indent=1)
        f.write("\n")
    size = os.path.getsize(out) / 1024
    print(f"bundle.js: {n_levels} livelli, {n_ex} esercizi, {bundle['meta']['assessmentItems']} domande assessment, "
          f"{len(facts)} fatti, {size:.0f} KB, contentDate={content_date}")
    return bundle


def dist(target):
    if os.path.isdir(target):
        shutil.rmtree(target)
    os.makedirs(os.path.join(target, "data"))
    shutil.copy(os.path.join(ROOT, "index.html"), target)
    shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(target, "assets"))
    shutil.copy(os.path.join(DATA, "bundle.js"), os.path.join(target, "data"))
    news = os.path.join(DATA, "news.json")
    if os.path.exists(news):
        shutil.copy(news, os.path.join(target, "data"))
    print(f"copiato in {target}/")


def _inline(text, closing):
    """Evita che il contenuto chiuda per errore il tag che lo contiene."""
    return text.replace("</" + closing, "<\\/" + closing).replace("<!--", "<\\!--")


def artifact(out_path):
    """Frammento HTML senza doctype/html/head/body: lo skeleton lo aggiunge la pubblicazione."""
    def read(*parts):
        with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
            return f.read()
    html = (
        "<title>Quota Quest</title>\n"
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800'
        '&family=Figtree:wght@400;500;600;700&display=swap">\n'
        "<style>\n" + _inline(read("assets", "style.css"), "style") + "\n</style>\n"
        '<div id="app"></div>\n'
        "<script>\n" + _inline(read("data", "bundle.js"), "script") + "\n</script>\n"
        "<script>\n" + _inline(read("assets", "engine.js"), "script") + "\n</script>\n"
        "<script>\n" + _inline(read("assets", "app.js"), "script") + "\n</script>\n"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"artifact: {out_path} ({len(html.encode('utf-8')) / 1024:.0f} KB)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist")
    ap.add_argument("--artifact")
    a = ap.parse_args()
    build()
    if a.dist:
        dist(a.dist)
    if a.artifact:
        artifact(a.artifact)
