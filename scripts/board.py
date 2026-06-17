#!/usr/bin/env python3
"""Pretty terminal render of the canna-br card backlog (folds backlog.jsonl)."""
import json, os, sys, shutil

LEDGER = os.path.join(os.path.dirname(__file__), "..", "backlog.jsonl")

# ANSI
def c(s, code): return f"\x1b[{code}m{s}\x1b[0m"
BOLD, DIM = "1", "2"
RESET = "\x1b[0m"

# stage  ->  (rank, label, icon, color, badge-bg)
STAGE = {
    "ItemCreated":   (0, "PARKING",   "•", "38;5;244", "48;5;238"),
    "ItemApproved":  (1, "TODO",      "○", "38;5;81",  "48;5;24"),
    "CodePulled":    (2, "CODING",    "◐", "38;5;221", "48;5;94"),
    "CodeCommitted": (3, "CODED",     "◑", "38;5;75",  "48;5;25"),
    "GreenPulled":   (4, "VERIFYING", "◓", "38;5;213", "48;5;90"),
    "Greened":       (5, "GREEN",     "✓", "38;5;120", "48;5;22"),
    "Blocked":       (9, "BLOCKED",   "✗", "38;5;210", "48;5;52"),
}
ORDER = ["ItemCreated","ItemApproved","CodePulled","CodeCommitted","GreenPulled","Greened","Blocked"]

def fold():
    cards = {}
    for line in open(os.path.abspath(LEDGER), encoding="utf-8"):
        line = line.strip()
        if not line: continue
        try: e = json.loads(line)
        except: continue
        t = e.get("type"); i = e.get("id")
        if not i: continue
        card = cards.setdefault(i, {"id": i, "title": "", "stage": None, "sha": "", "note": ""})
        if t == "ItemCreated":
            card["title"] = e.get("title", e.get("slug", i))
            card["slug"] = e.get("slug", "")
        if t in STAGE:
            # append-only log is chronological → last stage event wins
            # (a card Blocked then later Greened is GREEN now)
            card["stage"] = t
        if e.get("sha"): card["sha"] = e["sha"]
        if e.get("note"): card["note"] = e["note"]
    return cards

def main():
    cards = fold()
    width = min(shutil.get_terminal_size((100, 40)).columns, 110)
    inner = width - 4

    # header
    title = "  canna-br  ·  backlog"
    n = len(cards)
    green = sum(1 for c0 in cards.values() if c0["stage"] == "Greened")
    blocked = sum(1 for c0 in cards.values() if c0["stage"] == "Blocked")
    sub = f"{n} cards · {green} green · {blocked} blocked"
    top = "╭" + "─" * (width - 2) + "╮"
    bot = "╰" + "─" * (width - 2) + "╯"
    print()
    print(c(top, "38;5;108"))
    line = title + " " * (width - 2 - len(title) - len(sub) - 1) + sub + " "
    print(c("│", "38;5;108") + c(title, BOLD + ";38;5;150") +
          " " * (width - 2 - len(title) - len(sub) - 1) + c(sub, DIM) + c("│", "38;5;108"))
    print(c(bot, "38;5;108"))

    # group by stage, render in pipeline order
    by_stage = {}
    for card in cards.values():
        by_stage.setdefault(card["stage"], []).append(card)

    for st in ORDER:
        group = by_stage.get(st)
        if not group: continue
        rank, label, icon, col, bg = STAGE[st]
        badge = c(f" {icon} {label} ", BOLD + ";" + col + ";" + bg)
        print(f"\n{badge} " + c(f"({len(group)})", DIM))
        for card in sorted(group, key=lambda x: x["id"]):
            slug = card.get("slug") or card["id"]
            ttl = card["title"] or slug
            if len(ttl) > inner - 6:
                ttl = ttl[: inner - 9] + "…"
            bullet = c(f"  {icon}", col)
            print(f"{bullet} {c(slug, col)}")
            print(f"     {c(ttl, DIM)}")
            if st == "Blocked" and card.get("note"):
                note = card["note"]
                if len(note) > inner - 6: note = note[: inner - 9] + "…"
                print(f"     {c('↳ ' + note, '38;5;210')}")
    print()

if __name__ == "__main__":
    main()
