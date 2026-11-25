#!/usr/bin/env python3
"""Generate localized Fluid landing pages from editorial copy and the existing site."""

import argparse
from html import escape
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
FLUID = ROOT / "public/fluid"
BASE = "https://monitorlizards.studio"
COPY = json.loads(Path(__file__).with_name("fluid-site-copy.json").read_text())
ENGLISH_PAGES = ("", "guide", "research", "privacy", "support", "roadmap")
ASSET_VERSION = "20261125"


def route(tag):
    return "/fluid/" if tag == "en" else f"/fluid/{tag}/"


def alternates():
    links = [
        f'<link rel="alternate" hreflang="{tag}" href="{BASE}{route(tag)}">'
        for tag in COPY
    ]
    links.append(f'<link rel="alternate" hreflang="x-default" href="{BASE}/fluid/">')
    return "\n".join(links)


def sitemap():
    pages = ["/fluid/" + (page + "/" if page else "") for page in ENGLISH_PAGES]
    pages.extend(route(tag) for tag in COPY if tag != "en")
    urls = "\n".join(f"  <url><loc>{BASE}{page}</loc></url>" for page in pages)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f'{urls}\n</urlset>\n')


def switcher(tag, *, landing=True):
    native = COPY[tag]
    links = []
    for offer, labels in COPY.items():
        current = ' aria-current="page"' if landing and offer == tag else ''
        links.append(
            f'<li><a href="{route(offer)}" lang="{offer}" hreflang="{offer}"{current}>'
            f'{escape(labels["native"])}</a></li>'
        )
    return (
        f'<details class="language-picker"><summary>{escape(native["language"])}'
        f'</summary><ul>{"".join(links)}</ul></details>'
    )


def replace_region(html, name, value, marker):
    region = f"<!-- {name} -->\n{value}\n<!-- /{name} -->"
    pattern = rf"<!-- {name} -->.*?<!-- /{name} -->"
    if re.search(pattern, html, re.S):
        return re.sub(pattern, lambda _: region, html, count=1, flags=re.S)
    if html.count(marker) < 1:
        raise ValueError(f"Unable to find insertion point for {name}")
    return html.replace(marker, region + "\n" + marker, 1)


def motion_control(tag):
    label = escape(COPY[tag]["backgroundMotion"])
    return (
        '<button class="motion-control" type="button" data-motion-toggle '
        f'aria-pressed="false" disabled>{label}</button>'
    )


def hero_composition(tag, svg):
    hint = escape(COPY[tag]["playfieldHint"], quote=True)
    position = escape(COPY[tag]["position"], quote=True)
    controls = []
    number = 0
    for row in range(3):
        for column in range(3):
            if (row, column) == (1, 1):
                controls.append('<span aria-hidden="true"></span>')
                continue
            active = (row, column) == (2, 2)
            number += 1
            controls.append(
                '<button class="playfield-position" type="button" disabled '
                f'data-playfield-position="{row} {column}" '
                f'aria-label="{position} {number}" aria-pressed="{str(active).lower()}"></button>'
            )
    caption = '<span>IN THE PRESENT. N STEPS BACK.</span>' if tag == "en" else ""
    return (
        f'<div class="composition" data-composition>{svg}'
        f'<div class="playfield" role="group" aria-label="{hint}">'
        f'{"".join(controls)}'
        '<span class="playfield-cue" data-playfield-cue data-row="2" data-column="2" '
        'aria-hidden="true"><svg viewBox="0 0 54 54" focusable="false">'
        '<circle cx="27" cy="27" r="27" fill="#d6d6d6"/></svg></span></div>'
        f'<div class="art-caption"><span>{hint}</span>{caption}</div></div>'
    )


def localized_page(tag, original_svg):
    data = COPY[tag]
    label = {key: escape(value, quote=True) for key, value in data.items()}
    title = f'Fluid: Dual N-Back · {label["title"]}'
    canonical = BASE + route(tag)
    english = label["english"]
    mixed_links = "".join(
        f'<a href="/fluid/{key}/" hreflang="en">{label[key]} ({english})</a>'
        for key in ("guide", "research", "support", "privacy")
    )
    return f"""<!doctype html>
<html lang="{tag}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'">
<title>{title}</title>
<meta name="description" content="{label['description']}">
<link rel="canonical" href="{canonical}">
{alternates()}
<meta property="og:type" content="website"><meta property="og:title" content="{title}">
<meta property="og:description" content="{label['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{BASE}/fluid/assets/social.png">
<link rel="icon" href="/fluid/assets/icon.png">
<link rel="stylesheet" href="/fluid/assets/site.css?v={ASSET_VERSION}">
<script src="/fluid/assets/site.js?v={ASSET_VERSION}" defer></script>
</head><body class="localized-landing">
<a class="skip" href="#main">{label['skip']}</a>
<div class="wrap">
<header class="topbar">
<a class="wordmark" href="{route(tag)}"><img src="/fluid/assets/fluid.svg" width="66" height="40" alt="Fluid"></a>
<nav><a href="#get-fluid">{label['get']}</a></nav>
{switcher(tag)}
</header>
<main id="main">
<section class="hero">
<div class="hero-copy"><p class="eyebrow">Fluid · Dual N-Back</p>
<h1>{label['title']}</h1>
<p class="lede">{label['description']}</p>
<div class="actions"><a class="button primary" href="#get-fluid">{label['get']} <span aria-hidden="true">↓</span></a></div>
{motion_control(tag)}</div>
{hero_composition(tag, original_svg)}
</section>
<div class="strip"><span>{label['practice']}</span><span>{label['position']}</span><span>{label['sound']}</span><span>{label['progress']}</span></div>
<section class="section" id="the-practice"><div class="section-head"><h2>{label['learn']}</h2><p>{label['learnIntro']}</p></div>
<div class="utility-links"><a href="/fluid/guide/" hreflang="en">{label['guide']} ({english})</a></div></section>
<section class="section" id="get-fluid"><div class="section-head"><h2>{label['get']}</h2></div>
<div class="platforms"><div class="platform"><div><h3>Steam</h3><p>macOS · Windows</p></div><span class="platform-status">{label['soon']}</span></div>
<div class="platform"><div><h3>App Store</h3><p>iPhone · iPad</p></div><span class="platform-status">{label['soon']}</span></div></div></section>
</main>
<footer><p>© 2026 Monitor Lizards</p><nav>{mixed_links}</nav></footer>
</div></body></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = {}
    for page in ENGLISH_PAGES:
        path = FLUID / page / "index.html"
        html = path.read_text()
        html = re.sub(r'site\.css(?:\?v=\d+)?"', f'site.css?v={ASSET_VERSION}"', html)
        if page == "":
            start = html.index('<div class="composition"')
            svg = re.search(r'<svg\b.*?</svg>', html[start:], re.S).group()
            composition = hero_composition("en", svg)
            if '<!-- fluid-hero-composition -->' in html:
                html = replace_region(html, "fluid-hero-composition", composition, "</section>")
            else:
                end = html.index("</section>", start)
                html = (html[:start] + '<!-- fluid-hero-composition -->\n' + composition
                        + '\n<!-- /fluid-hero-composition -->\n' + html[end:])
            html = re.sub(r'site\.js(?:\?v=\d+)?"', f'site.js?v={ASSET_VERSION}"', html)
            html = re.sub(r'<button\b[^>]*\bdata-motion-toggle\b[^>]*>.*?</button>',
                          lambda _: motion_control("en"), html, count=1)
            html = replace_region(html, "fluid-alternate-links", alternates(), "</head>")
        html = replace_region(
            html, "fluid-language-switch", switcher("en", landing=not page), "</header>"
        )
        expected[path] = html
    for tag in COPY:
        if tag != "en":
            expected[FLUID / tag / "index.html"] = localized_page(tag, svg)
    expected[FLUID / "sitemap.xml"] = sitemap()
    for path, content in expected.items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                parser.error(f"Out of date: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_text(content)
    print(f"{len(COPY)} language options; {len(expected) - 1} pages and sitemap checked")


if __name__ == "__main__":
    main()
