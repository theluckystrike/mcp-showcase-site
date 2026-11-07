"""s1107 lane DIR: build data/readiness-servers.json for the /r/<slug>/ report pages.

Source: the s1102m registry scan (engine 1.2.0), read-only:
  python3 site/scripts/readiness-servers.py ~/mcpstamp-work/s1102m/scan [slug-map-out.json]
Population = the 33,003 servers that responded over HTTPS, built with the same filters as build_index120.py
(engine 1.2.0 rows, no engine-refused URLs, none of our own hosts, reachable, no rows on hosts that returned 429).
Published set (cap 5,000): company reverse-DNS namespaces (com.*, ai.*, io.* except io.github.*), with a quota per grade
equal to the grade's share of that group (so the grade mix matches the group), ranked inside each grade by tool count.
Hosts are re-resolved at build time; private, reserved or unresolvable hosts are left out.
"""
import collections, concurrent.futures as cf, ipaddress, json, os, re, socket, sys

SCAN = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/mcpstamp-work/s1102m/scan')
SLUG_OUT = os.path.expanduser(sys.argv[2]) if len(sys.argv) > 2 else None
sys.path.insert(0, SCAN)
import rows_lib as L  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'data', 'readiness-servers.json')
CAP = 5000
ENGINE = '1.2.0'
OUR_HOSTS = ('mcp.zovo.one', 'lipmichal.workers.dev', 'mcpstamp.com')


def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def company(name):
    ns = name.split('/')[0]
    return ns.startswith('com.') or ns.startswith('ai.') or (ns.startswith('io.') and not ns.startswith('io.github.'))


def ours(host):
    return L.is_ours(host) or any(host == o or host.endswith('.' + o) for o in OUR_HOSTS)


reg = {s['url']: s for s in json.load(open(os.path.join(SCAN, 'servers.json')))['servers']}
meta = {c['id']: c for c in json.load(open(os.path.join(SCAN, 'tmp', 'checks-120.json')))}
CHECK_IDS = list(meta)

rows, rl = [], set()
for kind, r in L.iter_results(os.path.join(SCAN, 'results-120.jsonl')):
    if kind != 'scanned':
        if kind == 'rate_limited' or (kind == 'skipped' and r.get('rate_limited')):
            rl.add(L.host_of(r['url']))
        continue
    if r['engine'] != ENGINE or r.get('error_code') == 'blocked_host':
        continue
    if ours(L.host_of(r['url'])) or not r.get('reachable'):
        continue
    rows.append(r)
rows = [r for r in rows if L.host_of(r['url']) not in rl]
N = len(rows)
assert N == 33003, f'population {N} != 33,003 in INSIGHTS.md'

scores = sorted(r['score'] for r in rows)
import bisect  # noqa: E402


def below(score):
    return bisect.bisect_left(scores, score)


AUTH_RANK = {'oauth': 0, 'other': 1, 'none': 2, 'unknown': 3}
grp = [r for r in rows if company(r['name'])]
by = collections.defaultdict(list)
for r in grp:
    by[r['grade']].append(r)
quota = {g: round(CAP * len(v) / len(grp)) for g, v in by.items()}
while sum(quota.values()) > CAP:
    quota[max(quota, key=quota.get)] -= 1
for g in by:
    by[g].sort(key=lambda r: (-(r.get('tool_count') or 0), AUTH_RANK.get(r.get('auth'), 9), -r['score'], r['name']))

# Re-resolve hosts of the candidates (quota + spare) and drop private, reserved or unresolvable hosts.
pre = [r for g in by for r in by[g][:quota[g] + 200]]


def host_ok(h):
    try:
        ipaddress.ip_address(h.strip('[]'))
        return False  # IP literal
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(h, 443, proto=socket.IPPROTO_TCP)
    except Exception:
        return None
    return all(ipaddress.ip_address(i[4][0].split('%')[0]).is_global for i in infos)


socket.setdefaulttimeout(5)
hosts = sorted(set(L.host_of(r['url']) for r in pre))
with cf.ThreadPoolExecutor(32) as ex:
    hp = dict(zip(hosts, ex.map(host_ok, hosts)))
for _ in range(2):  # retry hosts with no DNS answer (timeouts under load), fewer at a time
    retry = [h for h, v in hp.items() if v is None]
    with cf.ThreadPoolExecutor(4) as ex:
        hp.update(zip(retry, ex.map(host_ok, retry)))
sel = []
for g in by:
    sel += [r for r in by[g] if hp.get(L.host_of(r['url'])) is True][:quota[g]]
drop = {'private': sum(1 for v in hp.values() if v is False), 'no_dns': sum(1 for v in hp.values() if v is None)}


def strip_mcp(t):
    t = re.sub(r'\s+', ' ', t or '').strip()
    t = re.sub(r'(?i)[\s\-_:|]*(mcp(\s+server)?|server)$', '', t).strip(' -_:|')
    return t


def dashes(t):
    # Typographic only: em and en dashes and double hyphens in third-party text become a plain hyphen.
    return re.sub(r'\s*(\u2014|\u2013|--+)\s*', ' - ', t or '').strip()


def head(t):
    # Brand part of a long registry title: "Nefesh - Real-Time Human State ..." -> "Nefesh", "AFG: agents hire ..." -> "AFG".
    m = re.split(r'\s+[-|]\s+|:\s+', t, maxsplit=1)
    return m[0].strip() if len(m) > 1 and len(m[0].strip()) >= 2 else t


def display(r, s):
    for t in ((s or {}).get('title'), (r.get('server') or {}).get('title')):
        t = strip_mcp(head(dashes(t)))
        if t and len(t) <= 48 and not re.search(r'[<>]', t):
            return t
    seg = r['name'].split('/')[-1]
    toks = [x for x in re.split(r'[-_.]+', seg) if x]
    while len(toks) > 1 and toks[-1].lower() in ('mcp', 'server'):
        toks.pop()
    while len(toks) > 1 and toks[0].lower() in ('mcp', 'server'):
        toks.pop(0)
    out = ' '.join(toks) or seg
    return out[:1].upper() + out[1:] if out.islower() else out


fixes = []  # deduped fix strings
fix_ix = {}


def fx(t):
    if t not in fix_ix:
        fix_ix[t] = len(fixes)
        fixes.append(t)
    return fix_ix[t]


out_rows, slugs, seen = [], {}, {}
sel.sort(key=lambda r: (-r['score'], r['name']))
for r in sel:
    s = reg.get(r['url']) or {}
    slug = slugify(r['name'])
    if slug in seen:
        raise SystemExit(f'slug collision {slug}: {seen[slug]} / {r["name"]}')
    seen[slug] = r['name']
    slugs[r['name']] = slug
    blocks_by_check = collections.defaultdict(list)
    for st in L.STORES:
        for b in r['blockers'][st]:
            blocks_by_check[b].append(st)
    bad = [c for c in r['checks'] if c['status'] in ('fail', 'warn')]
    bad.sort(key=lambda c: (0 if c['id'] in blocks_by_check else 1, 0 if c['status'] == 'fail' else 1, -meta.get(c['id'], {}).get('weight', 0)))
    tools = r.get('tool_count') or 0
    auth = r.get('auth') or 'unknown'
    out_rows.append({
        'slug': slug, 'name': r['name'], 'title': display(r, s), 'url': r.get('display_url') or r['url'],
        'desc': dashes(re.sub(r'\s+', ' ', s.get('description') or '').strip())[:300],
        'repo': s.get('repository') or '', 'web': s.get('websiteUrl') or '', 'ver': s.get('version') or (r.get('server') or {}).get('version') or '',
        'score': r['score'], 'grade': r['grade'], 'auth': auth, 'tools': tools, 'proto': r.get('protocol_version') or '',
        'below': below(r['score']),
        # st: one letter per store in STORES order (r ready, n not ready, u unverified); sb/su: blocking and unverified check ids.
        'st': ''.join('u' if r['status'][st] == 'unverified' else r['status'][st][0] for st in L.STORES),
        'sb': {st: r['blockers'][st] for st in L.STORES if r['blockers'][st]},
        'su': {st: r['unver'][st] for st in L.STORES if r['unver'][st]},
        # bad: [check id, f|w, measured detail, index into fixes or -1]; the stores a check blocks come from sb.
        'bad': [[c['id'], c['status'][0], (c.get('detail') or '')[:240], fx(c['fix']) if c.get('fix') else -1] for c in bad],
        # ok/sk: bit masks over CHECK_IDS (passed, not run).
        'ok': sum(1 << CHECK_IDS.index(c['id']) for c in r['checks'] if c['status'] == 'pass'),
        'sk': sum(1 << CHECK_IDS.index(c['id']) for c in r['checks'] if c['status'] == 'skip'),
        'date': (r.get('checked_at') or '')[:10],
        **({'noindex': True} if tools == 0 and auth in ('none', 'unknown') else {}),
    })

doc = {
    'generated': '2026-11-07', 'engine': ENGINE, 'population': N, 'company_group': len(grp),
    'grade_population': dict(collections.Counter(r['grade'] for r in rows)),
    'grade_company': dict(collections.Counter(r['grade'] for r in grp)),
    'quota': quota, 'dropped_hosts': drop,
    'check_ids': CHECK_IDS, 'checks': {i: {'title': c['title'], 'group': c['group'], 'blocks': c['blocks']} for i, c in meta.items()},
    'fixes': fixes, 'rows': out_rows,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(doc, f, separators=(',', ':'), ensure_ascii=False)
if SLUG_OUT:
    os.makedirs(os.path.dirname(SLUG_OUT), exist_ok=True)
    json.dump(slugs, open(SLUG_OUT, 'w'), indent=0, ensure_ascii=False)
print(json.dumps({'population': N, 'company': len(grp), 'quota': quota, 'published': len(out_rows), 'dropped_hosts': drop,
                  'grades': dict(collections.Counter(r['grade'] for r in out_rows)), 'noindex': sum(1 for r in out_rows if r.get('noindex')),
                  'fixes': len(fixes), 'bytes': os.path.getsize(OUT)}))
