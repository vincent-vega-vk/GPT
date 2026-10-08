#!/usr/bin/env python3
"""Elenca i fatti scaduti o in scadenza (campo staleAfter) con le domande che li usano.

Uso:
  python3 tools/stale_report.py                    # report markdown su stdout
  python3 tools/stale_report.py --within 21        # include i fatti che scadono entro 21 giorni
  python3 tools/stale_report.py --out r.md --count-file n.txt
  python3 tools/stale_report.py --today 2026-10-22 # simula una data

Se è definita GITHUB_STEP_SUMMARY il report viene aggiunto anche al riepilogo del job.
Exit code sempre 0 (tranne con --fail-on-stale).
"""
import argparse
import datetime as dt
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--within", type=int, default=14)
    ap.add_argument("--today")
    ap.add_argument("--out")
    ap.add_argument("--count-file")
    ap.add_argument("--fail-on-stale", action="store_true")
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()

    facts = {}
    for p in sorted(glob.glob(os.path.join(DATA, "facts", "*.json"))):
        facts.update(json.load(open(p, encoding="utf-8")))
    idx_path = os.path.join(DATA, "facts-index.json")
    usage = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else {}

    stale, soon = [], []
    for k, f in facts.items():
        left = (dt.date.fromisoformat(f["staleAfter"]) - today).days
        if left < 0:
            stale.append((left, k))
        elif left <= a.within:
            soon.append((left, k))
    stale.sort(); soon.sort()

    def row(left, k):
        f = facts[k]
        n = len(usage.get(k, []))
        when = f"scaduto da {-left} g" if left < 0 else f"scade tra {left} g"
        note = f" — _{f['note']}_" if f.get("note") else ""
        return (f"- **{f['label']}** (`{k}`): {f['value']}\n"
                f"  - {when} (valido fino al {f['staleAfter']}), verificato il {f['checked']}, "
                f"affidabilità: {f['confidence']}, usato in {n} elementi{note}\n"
                f"  - fonte: {f['source']}")

    lines = [f"# Quota Quest: fatti da riverificare ({today.isoformat()})", ""]
    lines.append(f"Fatti tracciati: **{len(facts)}** · scaduti: **{len(stale)}** · in scadenza entro {a.within} giorni: **{len(soon)}**")
    lines.append("")
    if stale:
        lines += ["## Scaduti", ""] + [row(l, k) for l, k in stale] + [""]
    if soon:
        lines += ["## In scadenza", ""] + [row(l, k) for l, k in soon] + [""]
    if not stale and not soon:
        lines.append("Nessun fatto da riverificare.")
    lines += ["", "Come aggiornare: modifica `data/facts/*.json` (value, asOf, checked, staleAfter, source, confidence), "
              "controlla le domande elencate in `data/facts-index.json`, poi `python3 tools/validate.py && python3 tools/build.py`.",
              "Procedura completa per un agente: `tools/REFRESH_PROMPT.md`."]
    text = "\n".join(lines) + "\n"

    if a.out:
        open(a.out, "w", encoding="utf-8").write(text)
    else:
        sys.stdout.write(text)
    if a.count_file:
        open(a.count_file, "w").write(str(len(stale) + len(soon)))
    summ = os.environ.get("GITHUB_STEP_SUMMARY")
    if summ:
        with open(summ, "a", encoding="utf-8") as f:
            f.write(text)
    return 1 if (a.fail_on_stale and stale) else 0


if __name__ == "__main__":
    sys.exit(main())
