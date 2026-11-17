# s1118c S6: share card for /state-of-mcp-2026-11/.
# Run from site/: python3 scripts/og-state-of-mcp.py (needs Pillow)  ->  public/og/state-of-mcp-2026-11.png (1200 x 630)
# Every number is from ~/mcpstamp-work/s1102m/scan/readiness.json totals (generated 2026-11-02T11:25:22Z,
# engine 1.2.0), the same source as the page. Colors and fonts follow src/config/brand.ts.
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER, TEXT, MUTED, RULE, STAMP, ACCENT = '#eef0ea', '#1a1d22', '#4a4f57', '#d9ddd3', '#b42318', '#2b3c9e'
F = 'public/fonts/'


def font(name, size, weight=None, width=None):
    f = ImageFont.truetype(F + name, size)
    if weight is not None:
        axes = f.get_variation_axes()
        vals = []
        for a in axes:
            n = a['name'].decode() if isinstance(a['name'], bytes) else a['name']
            vals.append(weight if n == 'Weight' else (width if (n == 'Width' and width) else a['default']))
        f.set_variation_by_axes(vals)
    return f


img = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(img)
for y in range(32, H, 32):
    d.line([(0, y), (W, y)], fill=RULE, width=1)
d.line([(86, 0), (86, H)], fill='#e3a59f', width=2)
d.line([(92, 0), (92, H)], fill='#e3a59f', width=2)

mono = font('plexmono-600.woff2', 22)
mono_s = font('plexmono-600.woff2', 20)
head = font('archivo-var.woff2', 54, weight=800)
big = font('archivo-var.woff2', 168, weight=900)
body = font('publicsans-var.woff2', 27, weight=400)
lab = font('publicsans-var.woff2', 24, weight=600)

X = 130
# Stamp mark, top left.
d.rounded_rectangle([X, 62, X + 196, 112], radius=4, outline=STAMP, width=3)
d.text((X + 98, 87), 'MCPSTAMP', font=mono, fill=STAMP, anchor='mm')
d.text((X + 222, 87), 'STUDY  |  REGISTRY SCAN, 2 NOV 2026', font=mono_s, fill=MUTED, anchor='lm')

d.text((X, 150), 'State of MCP readiness', font=head, fill=TEXT)
d.text((X - 6, 214), '28.9%', font=big, fill=STAMP)
d.text((X, 410), 'of 33,003 responding remote MCP servers', font=body, fill=TEXT)
d.text((X, 446), 'pass every blocking check for Claude, ChatGPT,', font=body, fill=TEXT)
d.text((X, 482), 'Gemini and the MCP Registry.', font=body, fill=TEXT)

# Store bars, right column. Share of 33,003 responders.
stores = [('Claude', 37.2), ('ChatGPT', 29.7), ('Gemini', 60.8), ('Registry', 92.0)]
bx, bw, by = 790, 300, 268
d.text((bx, by - 44), 'Ready, by store', font=lab, fill=MUTED)
for i, (s, p) in enumerate(stores):
    y = by + i * 62
    d.text((bx, y), s, font=lab, fill=TEXT)
    d.text((bx + bw, y), f'{p:.1f}%', font=mono, fill=TEXT, anchor='ra')
    d.rectangle([bx, y + 34, bx + bw, y + 44], fill=RULE)
    d.rectangle([bx, y + 34, bx + round(bw * p / 100), y + 44], fill=ACCENT)

for x in range(X, W - 52, 18):
    d.line([(x, 540), (x + 9, 540)], fill='#9aa0a6', width=2)
d.text((X, 577), '34,728 URLS CHECKED', font=mono_s, fill=STAMP, anchor='lm')
d.text((W - 60, 577), 'MCPSTAMP.COM/STATE-OF-MCP-2026-11', font=mono_s, fill=MUTED, anchor='rm')

img.save('public/og/state-of-mcp-2026-11.png', optimize=True)
print('wrote public/og/state-of-mcp-2026-11.png')
