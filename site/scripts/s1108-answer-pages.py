#!/usr/bin/env python3
"""s1108: add query-shaped answer pages from each server's own keyword list.

Every new page is backed by a real server (name, tagline, tools, cases) from
data/content/a.json + b.json, so the JobPage template renders real tool calls.
No invented volumes: us_volume = null. Existing paths are never touched except
by the ctr_patch file (handled separately).
"""
import json
import os
import re
import sys

ROOT = os.path.expanduser("~/mcp-servers-work/showcase")
SITE = os.path.join(ROOT, "site")
PAGES = os.path.join(SITE, "src", "data", "pages.json")
OUT = os.path.expanduser("~/mcp-servers/data/s1108/pages_added.json")

STOP = {"in", "with", "and", "for", "the", "a", "an", "to", "of", "my", "your", "from", "on", "by", "ai", "mcp", "claude", "server"}


def servers():
    out = []
    for f in ("a.json", "b.json"):
        out += json.load(open(os.path.join(ROOT, "data", "content", f)))["servers"]
    return out


def slug_from(kw, limit=6):
    words = [w for w in re.sub(r"[^a-z0-9 ]", " ", kw.lower()).split() if w]
    words = [w for w in words if w not in STOP]
    return "-".join(words[:limit])


SMALL = {"in", "and", "or", "the", "a", "an", "to", "of", "for", "with", "on", "by", "from", "vs"}


def title_for(kw, name):
    """Keyword -> sentence-case question or statement, 'claude'/'chatgpt' capitalised."""
    k = kw.strip().rstrip("?").lower()
    k = re.sub(r"\s+(in|with|using)\s+(claude|cursor|chatgpt|ai)$", "", k)
    words = []
    for i, w in enumerate(k.split()):
        if w in ("claude", "chatgpt", "cursor", "ai", "mcp", "pdf", "pdfs", "csv", "xlsx", "docx", "macrs", "hmrc", "kst", "vat", "uk", "us", "eu", "roi", "zapier"):
            words.append({"claude": "Claude", "chatgpt": "ChatGPT", "cursor": "Cursor", "ai": "AI", "mcp": "MCP",
                          "pdf": "PDF", "pdfs": "PDFs", "csv": "CSV", "xlsx": "XLSX", "docx": "DOCX",
                          "macrs": "MACRS", "hmrc": "HMRC", "kst": "KST", "vat": "VAT", "uk": "UK", "us": "US",
                          "eu": "EU", "roi": "ROI", "zapier": "Zapier"}[w])
        elif i == 0 or w not in SMALL:
            words.append(w.capitalize())
        else:
            words.append(w)
    t = " ".join(words)
    if re.match(r"^(Can|Does|Is|How|What|Why|Which|Where)\b", t):
        t += "?"
    return t


def meta_for(s, kw=None, limit=152, idx=0):
    tag = s["tagline"].strip().rstrip(".")
    tag = tag[0].upper() + tag[1:]
    chips = [c for c in (s.get("outcome_chips") or []) if isinstance(c, str)]
    lead = "Yes."
    tail = chips[idx % len(chips)] if chips else "Free tier, no key."
    m = f"{lead} {tag}. It runs in Claude and Cursor over MCP. {tail}"
    if len(m) > limit:
        m = m[: limit - 1].rsplit(" ", 1)[0] + "."
    return m


def title_tag(h1, s, limit=64):
    """Title tag: H1 + a benefit from the tagline, kept under ~64 chars, brand appended."""
    brand = " | McpStamp"
    room = limit - len(brand)
    if len(h1) <= room:
        tail = s["tagline"].strip().rstrip(".").split(",")[0]
        cand = f"{h1}: {tail[0].lower() + tail[1:]}"
        if len(cand) <= room:
            return cand + brand
    return h1[: room - 1].rstrip() + brand


def main():
    pages = json.load(open(PAGES))
    taken = {p["path"] for p in pages}
    added, skipped = [], []

    # (a) URLs that already earned impressions but 404 today.
    fixed = [
        ("/can-claude/merge-pdfs/", "can claude merge pdfs", "Can Claude merge PDFs?", "pdf"),
        ("/can-claude/create-a-zip-archive/", "can claude create a zip archive", "Can Claude create a zip archive?", "zip"),
        ("/can-claude/read-a-scanned-receipt/", "can claude read a scanned receipt", "Can Claude read a scanned receipt?", "receipts"),
        ("/can-claude/track-receipts-for-expenses/", "can claude track receipts for expenses", "Can Claude track receipts for expenses?", "receipts"),
    ]
    byid = {s["id"]: s for s in servers()}
    for path, kw, h1, sid in fixed:
        if path in taken or sid not in byid:
            continue
        s = byid[sid]
        added.append({
            "path": path, "title": f"{h1} | {{brand}}", "h1": h1,
            "meta_description": meta_for(s, kw), "primary_keyword": kw, "intent": "informational",
            "priority": 0.8, "servers": [sid], "us_volume": None, "page_type": "answer",
        })
        taken.add(path)

    # (b) one page per server per distinct keyword, cap 2 keywords per server.
    for s in servers():
        if not s["keywords"]:
            continue
        made = 0
        for kw in s["keywords"]:
            if made >= 2:
                break
            slug = slug_from(kw)
            if not slug or len(slug) < 6:
                continue
            path = f"/can-claude/{slug}/"
            if path in taken:
                skipped.append((path, "exists"))
                continue
            h1 = title_for(kw, s["name"])
            added.append({
                "path": path, "title": title_tag(h1, s), "h1": h1,
                "meta_description": meta_for(s, kw, idx=made), "primary_keyword": kw, "intent": "informational",
                "priority": 0.72, "servers": [s["id"]], "us_volume": None, "page_type": "answer",
            })
            taken.add(path)
            made += 1

    # de-dupe h1/path among the additions
    seen, keep = set(), []
    for p in added:
        if p["path"] in seen:
            continue
        seen.add(p["path"])
        keep.append(p)

    pages.extend(keep)
    json.dump(pages, open(PAGES, "w"), indent=2, ensure_ascii=False)
    json.dump({"added": len(keep), "pages": keep}, open(OUT, "w"), indent=1, ensure_ascii=False)
    print("added", len(keep), "total pages", len(pages))
    for p in keep[:5]:
        print(" ", p["path"], "|", p["title"][:70])
    print("skipped-existing", len(skipped))


if __name__ == "__main__":
    main()
