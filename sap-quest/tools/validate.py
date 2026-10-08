#!/usr/bin/env python3
"""Valida i contenuti di SAP Quest.

Uso:
  python3 tools/validate.py                 # tutto
  python3 tools/validate.py --world w02     # un solo mondo (i fatti si caricano comunque tutti)
  python3 tools/validate.py --strict        # i warning diventano errori

Exit code 0 = nessun errore, 1 = errori.
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

PLACEHOLDER = re.compile(r"\{\{([^{}]*)\}\}")
KEY_RE = re.compile(r"^[a-z0-9_]+(\.[a-z0-9_]+)+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
BANNED = ("tutte le precedenti", "nessuna delle precedenti", "tutte le risposte", "tutte le opzioni",
          "all of the above", "nessuna di queste", "tutte quelle")
TYPES = {"mcq", "tf", "multi", "fill", "match", "order", "bucket"}
ASSESS_TYPES = {"mcq", "tf", "multi", "fill"}
CONF = {"primary", "secondary", "low"}
ABSOLUTES = re.compile(r"\b(sempre|mai|solo|soltanto|esclusivamente|tutti|tutte|nessun|nessuno|nessuna|ogni|unico|unica|garantisce|garantito|automaticamente)\b", re.I)


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def err(self, where, msg):
        self.errors.append(f"ERRORE  {where}: {msg}")

    def warn(self, where, msg):
        self.warnings.append(f"warning {where}: {msg}")


def load_json(path, rep):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        rep.err(path, "file mancante")
    except json.JSONDecodeError as e:
        rep.err(path, f"JSON non valido: {e}")
    return None


def is_str(x, lo=1, hi=10**6):
    return isinstance(x, str) and lo <= len(x.strip()) and len(x) <= hi


def valid_date(s):
    if not isinstance(s, str) or not DATE_RE.match(s):
        return False
    try:
        datetime.date.fromisoformat(s)
        return True
    except ValueError:
        return False


# ---------------------------------------------------------------- facts
def check_facts(path, facts, rep, prefix=None):
    out = {}
    if not isinstance(facts, dict):
        rep.err(path, "i fatti devono essere un oggetto {chiave: fatto}")
        return out
    for key, f in facts.items():
        w = f"{os.path.basename(path)}::{key}"
        if not KEY_RE.match(key):
            rep.err(w, "chiave non valida (minuscolo, cifre, _ e punti; es. w03.nome)")
        elif prefix and not key.startswith(prefix + "."):
            rep.err(w, f"la chiave deve iniziare con '{prefix}.'")
        if not isinstance(f, dict):
            rep.err(w, "il fatto deve essere un oggetto")
            continue
        for fld in ("label", "value", "source"):
            if not is_str(f.get(fld)):
                rep.err(w, f"campo '{fld}' mancante o vuoto")
        for fld in ("asOf", "checked", "staleAfter"):
            if not valid_date(f.get(fld)):
                rep.err(w, f"campo '{fld}' deve essere una data ISO AAAA-MM-GG")
        if f.get("confidence") not in CONF:
            rep.err(w, "confidence deve essere primary|secondary|low")
        src = f.get("source", "")
        if isinstance(src, str) and not re.match(r"^https?://[^\s]+\.[^\s]+$", src):
            rep.err(w, "source deve essere un URL http(s) reale")
        if valid_date(f.get("checked")) and valid_date(f.get("staleAfter")):
            if f["staleAfter"] < f["checked"]:
                rep.warn(w, "staleAfter precede checked: il fatto nasce già scaduto")
        if valid_date(f.get("asOf")) and valid_date(f.get("checked")) and f["asOf"] > f["checked"]:
            rep.err(w, "asOf non può essere successivo a checked")
        if f.get("confidence") == "low" and not f.get("note"):
            rep.warn(w, "confidence 'low' senza 'note' che spieghi il limite")
        out[key] = f
    return out


# ------------------------------------------------------------ exercises
def strings_of(ex):
    """Tutte le stringhe visibili di un esercizio (per placeholder/lunghezze)."""
    res = []
    for k in ("q", "exp"):
        if isinstance(ex.get(k), str):
            res.append((k, ex[k]))
    c = ex.get("ctx")
    if isinstance(c, dict):
        for k in ("who", "say"):
            if isinstance(c.get(k), str):
                res.append((f"ctx.{k}", c[k]))
    for i, o in enumerate(ex.get("o") or []):
        if isinstance(o, str):
            res.append((f"o[{i}]", o))
    for i, p in enumerate(ex.get("pairs") or []):
        if isinstance(p, list):
            for j, s in enumerate(p):
                if isinstance(s, str):
                    res.append((f"pairs[{i}][{j}]", s))
    for i, s in enumerate(ex.get("items") or []):
        if isinstance(s, str):
            res.append((f"items[{i}]", s))
        elif isinstance(s, list) and s and isinstance(s[0], str):
            res.append((f"items[{i}][0]", s[0]))
    for i, s in enumerate(ex.get("buckets") or []):
        if isinstance(s, str):
            res.append((f"buckets[{i}]", s))
    return res


def interpolate(s, facts):
    return PLACEHOLDER.sub(lambda m: facts.get(m.group(1).strip(), {}).get("value", "\u0000MISSING"), s)


def check_exercise(ex, where, rep, facts, allowed=TYPES, assessment=False):
    if not isinstance(ex, dict):
        rep.err(where, "esercizio non è un oggetto")
        return None
    t = ex.get("t")
    if t not in allowed:
        rep.err(where, f"tipo '{t}' non ammesso (ammessi: {', '.join(sorted(allowed))})")
        return None

    q = ex.get("q")
    if t == "match" and q is None:
        q = "Abbina"
    if not is_str(q, 3, 240):
        rep.err(where, "q mancante o oltre 240 caratteri")
    exp = ex.get("exp")
    if not is_str(exp, 20, 420):
        rep.err(where, "exp (spiegazione) mancante, <20 o >420 caratteri")
    if "diff" in ex and ex["diff"] not in (1, 2, 3):
        rep.err(where, "diff deve essere 1, 2 o 3")
    if assessment and ex.get("diff") not in (1, 2, 3):
        rep.err(where, "nell'assessment 'diff' (1-3) è obbligatorio")
    c = ex.get("ctx")
    if c is not None:
        if not (isinstance(c, dict) and is_str(c.get("who"), 1, 40) and is_str(c.get("say"), 3, 300)):
            rep.err(where, "ctx deve essere {who (<=40), say (<=300)}")

    # placeholder
    for name, s in strings_of(ex):
        for m in PLACEHOLDER.finditer(s):
            key = m.group(1).strip()
            if key not in facts:
                rep.err(where, f"segnaposto {{{{{key}}}}} in {name} senza fatto corrispondente")
        stripped = PLACEHOLDER.sub("", s)
        if "{{" in stripped or "}}" in stripped:
            rep.err(where, f"parentesi graffe non bilanciate in {name}")
        low = s.lower()
        for b in BANNED:
            if b in low:
                rep.err(where, f"formula vietata '{b}' in {name}")
        if "<" in s and ">" in s and re.search(r"</?[a-z]+[^>]*>", s):
            rep.err(where, f"HTML non ammesso in {name}")

    def opts(lo, hi):
        o = ex.get("o")
        if not (isinstance(o, list) and lo <= len(o) <= hi and all(is_str(x, 1, 90) for x in o)):
            rep.err(where, f"'o' deve essere una lista di {lo}-{hi} stringhe (max 90 car.; con segnaposto si conta il testo grezzo)")
            return None
        shown = [interpolate(x, facts).strip().lower() for x in o]
        if len(set(shown)) != len(shown):
            rep.err(where, "opzioni duplicate (anche dopo aver sostituito i segnaposto)")
        return o

    if t == "mcq":
        o = opts(3, 4)
        a = ex.get("a")
        if o is not None and not (isinstance(a, int) and not isinstance(a, bool) and 0 <= a < len(o)):
            rep.err(where, "'a' deve essere l'indice (int) dell'opzione corretta")
    elif t == "fill":
        o = opts(3, 4)
        a = ex.get("a")
        if isinstance(q, str) and q.count("___") != 1:
            rep.err(where, "fill: q deve contenere esattamente un '___'")
        if o is not None and not (isinstance(a, int) and not isinstance(a, bool) and 0 <= a < len(o)):
            rep.err(where, "'a' deve essere l'indice (int) dell'opzione corretta")
    elif t == "tf":
        if not isinstance(ex.get("a"), bool):
            rep.err(where, "tf: 'a' deve essere true/false")
    elif t == "multi":
        o = opts(4, 5)
        a = ex.get("a")
        if not (isinstance(a, list) and len(a) >= 2 and all(isinstance(i, int) and not isinstance(i, bool) for i in a)
                and len(set(a)) == len(a)):
            rep.err(where, "multi: 'a' deve essere una lista di >=2 indici distinti")
        elif o is not None:
            if any(i < 0 or i >= len(o) for i in a):
                rep.err(where, "multi: indice fuori range")
            elif len(a) >= len(o):
                rep.err(where, "multi: deve esserci almeno un'opzione sbagliata")
    elif t == "match":
        p = ex.get("pairs")
        if not (isinstance(p, list) and 4 <= len(p) <= 5 and all(
                isinstance(x, list) and len(x) == 2 and is_str(x[0], 1, 50) and is_str(x[1], 1, 70) for x in p)):
            rep.err(where, "match: 'pairs' = 4-5 coppie [sx(<=50), dx(<=70)]")
        else:
            ls = [interpolate(x[0], facts).lower() for x in p]
            rs = [interpolate(x[1], facts).lower() for x in p]
            if len(set(ls)) != len(ls) or len(set(rs)) != len(rs):
                rep.err(where, "match: elementi duplicati")
    elif t == "order":
        it = ex.get("items")
        if not (isinstance(it, list) and 3 <= len(it) <= 6 and all(is_str(x, 1, 80) for x in it)):
            rep.err(where, "order: 'items' = 3-6 stringhe (<=80) nell'ordine corretto")
        elif len({interpolate(x, facts).lower() for x in it}) != len(it):
            rep.err(where, "order: elementi duplicati")
    elif t == "bucket":
        b = ex.get("buckets")
        it = ex.get("items")
        okb = isinstance(b, list) and 2 <= len(b) <= 3 and all(is_str(x, 1, 30) for x in b)
        if not okb:
            rep.err(where, "bucket: 'buckets' = 2-3 stringhe (<=30)")
        if not (isinstance(it, list) and 4 <= len(it) <= 8 and all(
                isinstance(x, list) and len(x) == 2 and is_str(x[0], 1, 70) and isinstance(x[1], int)
                and not isinstance(x[1], bool) for x in it)):
            rep.err(where, "bucket: 'items' = 4-8 coppie [testo(<=70), indiceBucket]")
        elif okb:
            idx = [x[1] for x in it]
            if any(i < 0 or i >= len(b) for i in idx):
                rep.err(where, "bucket: indice bucket fuori range")
            elif set(idx) != set(range(len(b))):
                rep.err(where, "bucket: ogni bucket deve contenere almeno un elemento")
    return t


# ------------------------------------------------- bias di scrittura (mcq/fill)
def option_lengths(ex, facts):
    """(lunghezza opzione corretta, [lunghezze distrattori], testo corretto, [testi distrattori]) con i fatti sostituiti."""
    o = [interpolate(x, facts) for x in ex["o"]]
    a = ex["a"]
    others = [x for i, x in enumerate(o) if i != a]
    return len(o[a]), [len(x) for x in others], o[a], others


def check_bias(name, items, rep, facts, min_items, strict):
    """La risposta giusta non deve essere riconoscibile dalla forma (lunghezza, assoluti)."""
    rows = []
    for e in items:
        if isinstance(e, dict) and e.get("t") in ("mcq", "fill") and isinstance(e.get("o"), list) \
                and isinstance(e.get("a"), int) and 0 <= e["a"] < len(e["o"]) and all(isinstance(x, str) for x in e["o"]):
            rows.append(option_lengths(e, facts))
    n = len(rows)
    if n < min_items:
        return
    longest = sum(1 for c, o, _, _ in rows if c > max(o))
    shortest = sum(1 for c, o, _, _ in rows if c < min(o))
    ratio = sum(c / (sum(o) / len(o)) for c, o, _, _ in rows) / n
    fl, fs = longest / n, shortest / n
    emit = rep.err if strict else rep.warn
    if fl > 0.45:
        emit(name, f"bias di lunghezza: in {longest}/{n} domande a scelta ({fl:.0%}) la risposta giusta è la PIÙ LUNGA (atteso ~30%). "
                   "Allunga e rendi specifici i distrattori, usa distrattori 'quasi giusti' della stessa lunghezza")
    if fs > 0.45:
        emit(name, f"bias di lunghezza: in {shortest}/{n} domande ({fs:.0%}) la risposta giusta è la PIÙ CORTA")
    if ratio > 1.25 or ratio < 0.8:
        emit(name, f"lunghezza media corretta/distrattori = {ratio:.2f} (accettabile 0.80-1.25): distrattori troppo diversi dalla risposta giusta")
    abs_c = sum(1 for _, _, c, _ in rows if ABSOLUTES.search(c)) / n
    abs_d = sum(sum(1 for d in ds if ABSOLUTES.search(d)) / len(ds) for _, _, _, ds in rows) / n
    if abs_d - abs_c > 0.15:
        rep.warn(name, f"i distrattori contengono 'assoluti' (sempre/mai/solo/tutti...) molto più della risposta giusta ({abs_d:.0%} vs {abs_c:.0%}): si indovina dal tono")


# --------------------------------------------------------------- worlds
def check_world(w, wpath, rep, facts):
    wid = w["id"]
    name = os.path.basename(wpath)
    data = load_json(wpath, rep)
    if data is None:
        return None
    if data.get("id") != wid:
        rep.err(name, f"'id' deve essere '{wid}'")
    levels = data.get("levels")
    if not isinstance(levels, list):
        rep.err(name, "'levels' deve essere una lista")
        return None
    if len(levels) != w["levels"]:
        rep.err(name, f"servono esattamente {w['levels']} livelli, trovati {len(levels)}")

    seen_q = set()
    tf_true = tf_all = 0
    n_ex = 0
    for i, lv in enumerate(levels, 1):
        lid = f"{wid}-l{i:02d}"
        where = f"{name}::{lid}"
        if not isinstance(lv, dict):
            rep.err(where, "livello non è un oggetto")
            continue
        if lv.get("id") != lid:
            rep.err(where, f"id atteso '{lid}', trovato '{lv.get('id')}'")
        if not is_str(lv.get("title"), 3, 34):
            rep.err(where, "title mancante o oltre 34 caratteri")
        kind = lv.get("kind")
        last = i == len(levels)
        if kind not in ("lesson", "roleplay", "boss"):
            rep.err(where, "kind deve essere lesson|roleplay|boss")
        if last and kind != "boss":
            rep.err(where, "l'ultimo livello deve essere kind 'boss'")
        if not last and kind == "boss":
            rep.err(where, "solo l'ultimo livello può essere 'boss'")
        les = lv.get("lesson")
        if not isinstance(les, dict):
            rep.err(where, "lesson mancante")
        else:
            pts = les.get("points")
            if not (isinstance(pts, list) and 3 <= len(pts) <= 5 and all(is_str(p, 5, 240) for p in pts)):
                rep.err(where, "lesson.points = 3-5 stringhe (max 240)")
            if "ae" in les and not is_str(les["ae"], 5, 240):
                rep.err(where, "lesson.ae oltre 240 caratteri o vuoto")
            if not lv.get("kind") == "boss" and "ae" not in les:
                rep.warn(where, "manca lesson.ae (frase 'In trattativa')")
            for p in (pts if isinstance(pts, list) else []) + [les.get("ae", "")]:
                if isinstance(p, str):
                    for m in PLACEHOLDER.finditer(p):
                        if m.group(1).strip() not in facts:
                            rep.err(where, f"segnaposto {{{{{m.group(1)}}}}} nella lezione senza fatto")
        ex = lv.get("ex")
        lo, hi = (8, 10) if kind == "boss" else (4, 6)
        if not (isinstance(ex, list) and lo <= len(ex) <= hi):
            rep.err(where, f"'ex' deve avere {lo}-{hi} esercizi")
            continue
        types = []
        ctx_n = 0
        for j, e in enumerate(ex, 1):
            t = check_exercise(e, f"{where}::e{j}", rep, facts)
            if t:
                types.append(t)
                n_ex += 1
                if isinstance(e.get("ctx"), dict):
                    ctx_n += 1
                if t == "tf" and isinstance(e.get("a"), bool):
                    tf_all += 1
                    tf_true += 1 if e["a"] else 0
                qk = (e.get("q") or "").strip().lower()
                if qk in seen_q:
                    rep.err(f"{where}::e{j}", "domanda duplicata nel mondo")
                seen_q.add(qk)
        if kind != "boss" and len(ex) >= 5 and len(set(types)) < 3:
            rep.warn(where, "meno di 3 tipi di esercizio diversi")
        if kind == "roleplay" and ctx_n * 2 < len(ex):
            rep.warn(where, "livello roleplay con meno della metà degli esercizi con ctx")
        if kind == "boss" and ctx_n < 2:
            rep.warn(where, "il boss dovrebbe avere almeno 2 scenari con ctx")
    all_items = [e for lv in levels if isinstance(lv, dict) and isinstance(lv.get("ex"), list) for e in lv["ex"]]
    check_bias(name, all_items, rep, facts, min_items=12, strict=True)
    if tf_all >= 6:
        ratio = tf_true / tf_all
        if ratio > 0.65 or ratio < 0.35:
            rep.warn(name, f"vero/falso sbilanciati: {tf_true}/{tf_all} sono 'vero'")
    return {"levels": len(levels), "exercises": n_ex}


def check_assessment(w, apath, rep, facts, expected):
    name = os.path.basename(apath)
    data = load_json(apath, rep)
    if data is None:
        return None
    if data.get("id") != w["id"]:
        rep.err(name, f"'id' deve essere '{w['id']}'")
    items = data.get("items")
    if not (isinstance(items, list) and len(items) == expected):
        rep.err(name, f"servono esattamente {expected} domande")
        return None
    counts = {1: 0, 2: 0, 3: 0}
    seen = set()
    for j, e in enumerate(items, 1):
        check_exercise(e, f"{name}::a{j}", rep, facts, allowed=ASSESS_TYPES, assessment=True)
        if isinstance(e, dict):
            if e.get("diff") in counts:
                counts[e["diff"]] += 1
            qk = (e.get("q") or "").strip().lower()
            if qk in seen:
                rep.err(f"{name}::a{j}", "domanda duplicata")
            seen.add(qk)
    if counts != {1: 2, 2: 2, 3: 2}:
        rep.err(name, f"servono 2 domande per ciascun diff 1/2/3, trovate {counts}")
    check_bias(name, items, rep, facts, min_items=4, strict=False)
    return {"items": len(items)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--world")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    rep = Report()
    cur = load_json(os.path.join(DATA, "curriculum.json"), rep)
    if not cur:
        print("\n".join(rep.errors))
        return 1
    worlds = cur["worlds"]
    if args.world and args.world not in {w["id"] for w in worlds}:
        print(f"Mondo sconosciuto: {args.world}")
        return 1

    # --- fatti: sempre tutti
    all_facts = {}
    for path in sorted(glob.glob(os.path.join(DATA, "facts", "*.json"))):
        base = os.path.basename(path)[:-5]
        facts = load_json(path, rep)
        if facts is None:
            continue
        prefix = "sap" if base == "shared" else base.split("-")[0]
        got = check_facts(path, facts, rep, prefix=prefix)
        for k, v in got.items():
            if k in all_facts:
                rep.err(base, f"chiave fatto duplicata: {k}")
            all_facts[k] = v

    totals = {"levels": 0, "exercises": 0, "assess": 0}
    rows = []
    for w in worlds:
        if args.world and w["id"] != args.world:
            continue
        stem = f"{w['id']}-{w['slug']}"
        wr = check_world(w, os.path.join(DATA, "worlds", stem + ".json"), rep, all_facts)
        ar = check_assessment(w, os.path.join(DATA, "assessment", stem + ".json"), rep, all_facts,
                              cur.get("assessmentPerWorld", 6))
        if wr:
            totals["levels"] += wr["levels"]
            totals["exercises"] += wr["exercises"]
        if ar:
            totals["assess"] += ar["items"]
        rows.append((w["id"], wr, ar))

    # fatti con fonte debole
    weak = [k for k, v in all_facts.items() if v.get("confidence") == "low"]

    print("== SAP Quest - validazione ==")
    for wid, wr, ar in rows:
        print(f"  {wid}: livelli={wr['levels'] if wr else '-'} esercizi={wr['exercises'] if wr else '-'} "
              f"assessment={ar['items'] if ar else '-'}")
    print(f"  TOTALE livelli={totals['levels']} esercizi={totals['exercises']} assessment={totals['assess']} "
          f"fatti={len(all_facts)} (confidence low: {len(weak)})")
    for m in rep.warnings:
        print(m)
    for m in rep.errors:
        print(m)
    bad = len(rep.errors) + (len(rep.warnings) if args.strict else 0)
    print(f"-> {len(rep.errors)} errori, {len(rep.warnings)} warning")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
