# Store asset reproduction and acceptance

## Delivered files

- Global English screenshots:
  - `screenshots/screenshot-01-before-after.png`
  - `screenshots/screenshot-02-rename-overlay.png`
  - `screenshots/screenshot-03-rules.png`
  - `screenshots/screenshot-04-pattern-rule.png`
  - `screenshots/screenshot-05-onboarding.png`
- Simplified Chinese localized screenshots: the same five filenames under `screenshots/zh-CN/`.
- `promo/promo-small-440x280.png`
- `promo/promo-marquee-1400x560.png`

The ten localized screenshots and both promo images were captured by
`scripts/capture-store-assets.mjs` using a disposable, unpacked Chromium
extension profile. The harness only adds `http://127.0.0.1/*` access to its
temporary manifest so the real content overlay can be exercised on a local
example page; it does not change the extension UI or source code. Screenshot 1
is explicitly labelled as an illustrative before/after workflow. Screenshots
2–5 use the real built extension. Capture checks and the exact `dist` build
hashes are recorded in `source/capture-provenance.json`.

## Reproduce the captured screenshots and promo images

Run from the extension project root (`chrome-extension/`) after `npm run build`:

```sh
NODE=/Users/createsun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
MODULES=/Users/createsun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
STORE_CAPTURE_HEADLESS=0 STORE_CAPTURE_MODULES="$MODULES" \
  "$NODE" scripts/capture-store-assets.mjs
```

The script requires Playwright's Chromium/Chrome for Testing build because
current branded Chrome releases do not accept automated unpacked-extension
loading. If it is missing, run Playwright's `install chromium` command first.
The script verifies switch persistence through the real background service,
the document title after rename, bilingual URL-pattern previews, and promo text
bounds.

## Acceptance checks

All twelve listing images are the required dimensions and PNG24 RGB without
alpha: screenshots are 1280×800, the small promo is 440×280, and the marquee
promo is 1400×560.

```sh
for f in store-assets/screenshots/*.png store-assets/screenshots/zh-CN/*.png store-assets/promo/*.png; do
  file "$f"
done
```

`source/capture-provenance.json` must continue to match the SHA-256 values of
the current JavaScript, HTML, and CSS files in `dist/`. A build that changes
those files requires rerunning the capture script before publishing.
