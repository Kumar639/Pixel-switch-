#!/usr/bin/env python3
"""Configure production URLs for PixelSwitch static SEO files.
Usage: python configure-site.py https://www.example.com
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent

def validate_base(value: str) -> str:
    value = value.rstrip('/')
    parsed = urlparse(value)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        raise SystemExit('Use an absolute URL, for example: https://www.example.com')
    return value

def absolutize_json(value, base):
    if isinstance(value, dict):
        return {key: absolutize_json(item, base) for key, item in value.items()}
    if isinstance(value, list):
        return [absolutize_json(item, base) for item in value]
    if isinstance(value, str) and value.startswith('/'):
        return base + value
    return value

def update_html(path: Path, base: str):
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    page_path = '/' if path.name == 'index.html' else f'/{path.name}'
    canonical = soup.select_one('link[rel="canonical"]')
    if canonical:
        canonical['href'] = base + page_path
    og_url = soup.select_one('meta[property="og:url"]')
    if og_url:
        og_url['content'] = base + page_path
    for selector in ('meta[property="og:image"]', 'meta[name="twitter:image"]'):
        node = soup.select_one(selector)
        if node:
            node['content'] = base + '/social-preview.svg'
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            payload = json.loads(script.string or '')
        except json.JSONDecodeError:
            continue
        script.string = json.dumps(absolutize_json(payload, base), separators=(',', ':'), ensure_ascii=False)
    path.write_text(str(soup), encoding='utf-8')

def update_sitemap(base: str):
    path = ROOT / 'sitemap.xml'
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'https://your-domain\.example', base, text)
    path.write_text(text, encoding='utf-8')
    robots = ROOT / 'robots.txt'
    robots.write_text(f'User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n', encoding='utf-8')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python configure-site.py https://www.example.com')
    site = validate_base(sys.argv[1])
    for html in ROOT.glob('*.html'):
        update_html(html, site)
    update_sitemap(site)
    print(f'Configured PixelSwitch for {site}')
