#!/usr/bin/env python3
"""Assemble le jeu en un seul fichier HTML autonome.

Usage : python3 tools/bundle.py [sortie.html]
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'the-adventure-of-claude.html'
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css' / 'style.css').read_text(encoding='utf-8')
srcs = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join(f'// ---- {s}\n' + (root / s).read_text(encoding='utf-8') for s in srcs)
assert '</script' not in js

page = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Adventure of Claude</title>
<style>
{css}
body {{ padding-inline: 16px; box-sizing: border-box; }}
canvas {{ max-width: 100%; }}
</style>
</head>
<body>
<canvas id="game" width="480" height="270" tabindex="0" aria-label="The Adventure of Claude"></canvas>
<script>
{js}
document.getElementById('game').addEventListener('pointerdown', (e) => e.currentTarget.focus());
</script>
</body>
</html>
"""
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page, encoding='utf-8')
print(out, len(page))
