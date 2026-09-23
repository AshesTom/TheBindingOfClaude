#!/usr/bin/env python3
"""Assemble le jeu en un seul fichier HTML autonome (pour l'héberger en artifact).

Usage : python3 tools/bundle.py [sortie.html]
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'the-binding-of-claude.html'
html = (root / 'index.html').read_text(encoding='utf-8')
srcs = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join(f'// ---- {s}\n' + (root / s).read_text(encoding='utf-8') for s in srcs)
assert '</script' not in js

page = f"""<title>The Binding of Claude</title>
<style>
:root {{ color-scheme: dark; --ground: #0a0605; }}
html, body {{ height: 100%; }}
body {{
  margin: 0;
  background: var(--ground);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: 16px;
  box-sizing: border-box;
  overflow: hidden;
}}
canvas {{
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  background: #000;
  max-width: 100%;
  box-shadow: 0 0 48px rgba(217, 119, 87, 0.22);
  outline: none;
}}
</style>
<canvas id="game" width="640" height="360" tabindex="0" aria-label="The Binding of Claude"></canvas>
<script>
{js}
document.getElementById('game').addEventListener('pointerdown', (e) => e.currentTarget.focus());
</script>
"""
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page, encoding='utf-8')
print(out, len(page))
