#!/usr/bin/env bash
# starlight-blog 0.25.2 builds hrefs from entry.id, which keeps the .md/.mdx
# extension under Astro 5.18 + Starlight 0.37 → post links 404. The proper fix
# (starlight-blog 0.26 + Starlight 0.38) requires Astro 6. Until that
# migration, patch every href/compare site to strip the extension.
# Idempotent — wired as postinstall, safe to re-run.
set -u

python3 - <<'PYEOF'
import glob, re

STRIP = ".replace(/\\.(md|mdx)$/, '')"

subs = {
    'libs/content.ts': [
        ('if (entry.id === stripLeadingSlash', 'if (entry.id' + STRIP + ' === stripLeadingSlash'),
        ('if (locale) return entry.id === stripLeadingSlash', 'if (locale) return entry.id' + STRIP + ' === stripLeadingSlash'),
        # both sides stripped: incoming slug from Starlight route id also carries .md
        ("=== stripLeadingSlash(stripTrailingSlash(slug))) return true",
         "=== stripLeadingSlash(stripTrailingSlash(slug))" + STRIP + ") return true"),
        ("=== stripLeadingSlash(stripTrailingSlash(getPathWithLocale(slug, undefined)))",
         "=== stripLeadingSlash(stripTrailingSlash(getPathWithLocale(slug, undefined)))" + STRIP),
        ('getPathWithLocale(prevEntry.id, locale)', 'getPathWithLocale(prevEntry.id' + STRIP + ', locale)'),
        ('getPathWithLocale(nextEntry.id, locale)', 'getPathWithLocale(nextEntry.id' + STRIP + ', locale)'),
    ],
    'libs/rss.ts': [
        ('getPathWithLocale(entry.id, locale)', 'getPathWithLocale(entry.id' + STRIP + ', locale)'),
    ],
    'libs/page.ts': [
        ('getPathWithLocale(entry.id, locale)', 'getPathWithLocale(entry.id' + STRIP + ', locale)'),
    ],
    'components/Preview.astro': [
        ('getPathWithLocale(entry.id, locale)', 'getPathWithLocale(entry.id' + STRIP + ', locale)'),
    ],
}

patched = 0
for d in glob.glob('node_modules/.pnpm/starlight-blog@0.25.2*/node_modules/starlight-blog'):
    changed = False
    for rel, pairs in subs.items():
        path = f'{d}/{rel}'
        try:
            src = open(path).read()
        except FileNotFoundError:
            continue
        out = src
        for old, new in pairs:
            if new in out:
                continue  # already patched
            out = out.replace(old, new)
        if out != src:
            open(path, 'w').write(out)
            changed = True
    if changed:
        patched += 1

print(f'patch-starlight-blog: {patched} instance(s) patched (0 = already patched or absent)')
PYEOF
exit 0
