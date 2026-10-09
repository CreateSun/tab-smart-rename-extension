// Run after npm run build. Uses a disposable profile; never touches the user's browser.
import { createRequire } from 'node:module';
import { cp, mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const modules = process.env.STORE_CAPTURE_MODULES;
const { chromium } = modules ? require(join(modules, 'playwright')) : require('playwright');
const root = resolve(import.meta.dirname, '..');
const work = await mkdtemp(join(tmpdir(), 'tab-rename-store-'));
const extension = join(work, 'extension');
const screenshotRoot = join(root, 'store-assets/screenshots');
const chineseScreenshotRoot = join(screenshotRoot, 'zh-CN');
await cp(join(root, 'dist'), extension, { recursive: true });
await mkdir(screenshotRoot, { recursive: true });
await mkdir(chineseScreenshotRoot, { recursive: true });

const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
// Only the disposable harness gets access to the local example page. UI/JS/CSS are unchanged.
manifest.host_permissions = ['http://127.0.0.1/*'];
await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));

const server = createServer((req, res) => {
  if (req.url === '/favicon.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#176c45"/><path d="M16 32h27m-9-10 10 10-10 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><title>Weekly review — Example workspace</title><link rel="icon" href="/favicon.svg"><style>body{margin:80px auto;max-width:940px;font:18px system-ui;color:#35443a;background:#f6f8f5}small{color:#718077}h1{font-size:48px}article{padding:24px;background:white;border:1px solid #d9e1db;border-radius:12px;margin:20px 0}</style></head><body><small>EXAMPLE WORKSPACE</small><h1>Weekly review</h1><p>A sample page for demonstrating Tab Rename.</p><article>Project notes</article><article>Tasks for the week</article><article>Links and references</article></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const localeCopy = {
  en: {
    language: 'en', output: screenshotRoot,
    ruleNames: ['Weekly review', 'Project issues', 'Documentation workspace'],
    tabNames: ['Weekly review', 'Issue $1', 'Product docs'],
    beforeEyebrow: 'WHEN SIMILAR TABS LOOK THE SAME',
    beforeTitle: 'Find the right tab before you lose your train of thought.',
    beforeLabel: 'BEFORE', afterLabel: 'AFTER TAB RENAME',
    beforeNote: 'Repeated prefixes hide the useful part.', afterNote: 'Put the distinguishing words first.',
    footer: 'Illustrative workflow · actual extension interface shown in the following screenshots',
    inputName: 'Weekly review', patternRuleName: 'Linear issue titles', patternTabName: 'Issue $1',
  },
  zh_CN: {
    language: 'zh_CN', output: chineseScreenshotRoot,
    ruleNames: ['每周复盘', '项目工单', '文档工作区'],
    tabNames: ['每周复盘', '工单 $1', '产品文档'],
    beforeEyebrow: '当相似标签看起来都一样',
    beforeTitle: '在一排相似标签里，<br>立刻找到正在做的那一个。',
    beforeLabel: '重命名前', afterLabel: '使用 TAB RENAME 后',
    beforeNote: '重复前缀遮住了真正有用的信息。', afterNote: '把关键差异放在标签最前面。',
    footer: '示意工作流 · 后续截图均来自真实扩展界面',
    inputName: '本周复盘', patternRuleName: 'Linear 工单标题', patternTabName: '工单 $1',
  },
};

const stamp = '2026-09-30T02:00:00.000Z';
const makeState = copy => ({
  schemaVersion: 1,
  rules: [
    ['weekly', copy.ruleNames[0], copy.tabNames[0], 'exact-url', 'https://example.com/weekly-review', true],
    ['issues', copy.ruleNames[1], copy.tabNames[1], 'url-pattern', 'https://linear.app/acme/issue/{1}', true],
    ['docs', copy.ruleNames[2], copy.tabNames[2], 'host', 'docs.example.com', false],
  ].map(([id, ruleName, name, kind, value, enabled]) => ({ id, ruleName, name, match: { kind, value }, enabled, createdAt: stamp, updatedAt: stamp })),
  settings: { guardDebounceMs: 150, onboardingCompleted: false, language: copy.language },
});

async function captureBeforeAfter(page, copy, path) {
  const before = [
    ['A', 'Acme Workspace — Issue ENG-421'], ['A', 'Acme Workspace — Issue ENG-422'],
    ['A', 'Acme Workspace — Issue ENG-423'], ['A', 'Acme Workspace — Issue ENG-424'],
  ];
  const after = [
    ['4', 'ENG-421 · Login timeout'], ['4', 'ENG-422 · Export CSV'],
    ['4', 'ENG-423 · Billing retry'], ['4', 'ENG-424 · Search empty state'],
  ];
  const rows = items => items.map(([icon, title], index) => `<li class="${index === 1 ? 'active' : ''}"><i>${icon}</i><span>${title}</span><b>×</b></li>`).join('');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1280px;height:800px;overflow:hidden}body{padding:64px 72px;background:#101312;color:#f4f5ed;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.eyebrow{margin:0 0 18px;color:#c7ff42;font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}h1{max-width:1000px;margin:0;font:650 52px/1.04 Georgia,"Times New Roman",serif;letter-spacing:-.045em}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px}.panel{padding:20px;border:1px solid #3b413d;border-radius:18px;background:#171b19}.label{display:flex;justify-content:space-between;gap:20px;align-items:baseline;margin:0 4px 16px}.label strong{color:#c7ff42;font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em}.label span{color:#a9b1ac;font-size:13px}.browser{display:grid;grid-template-columns:228px 1fr;min-height:346px;overflow:hidden;border-radius:12px;background:#eef1eb;color:#1c2821}.sidebar{padding:12px;background:#e2e7df;border-right:1px solid #cbd2ca}.traffic{display:flex;gap:6px;padding:4px 5px 16px}.traffic i{width:8px;height:8px;border-radius:50%;background:#aeb7af}.tabs{display:grid;gap:7px;margin:0;padding:0;list-style:none}.tabs li{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;min-height:52px;padding:8px;border-radius:8px;color:#536158;font-size:12px}.tabs li.active{background:#fff;color:#16241b;box-shadow:0 5px 15px rgba(31,50,39,.08)}.tabs i{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#196f49;color:#fff;font-style:normal;font-weight:800}.tabs span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tabs b{color:#89928c}.page{padding:34px}.page small{color:#728077;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em}.page h2{margin:18px 0 14px;font-size:30px}.line{height:12px;margin:12px 0;border-radius:8px;background:#d9dfd7}.line.short{width:62%}.footer{margin:20px 2px 0;color:#7f8a83;font:11px ui-monospace,SFMono-Regular,Menlo,monospace}
  </style></head><body><p class="eyebrow">${copy.beforeEyebrow}</p><h1>${copy.beforeTitle}</h1><div class="comparison"><section class="panel"><div class="label"><strong>${copy.beforeLabel}</strong><span>${copy.beforeNote}</span></div><div class="browser"><aside class="sidebar"><div class="traffic"><i></i><i></i><i></i></div><ul class="tabs">${rows(before)}</ul></aside><main class="page"><small>ACME WORKSPACE</small><h2>Issue details</h2><div class="line"></div><div class="line"></div><div class="line short"></div></main></div></section><section class="panel"><div class="label"><strong>${copy.afterLabel}</strong><span>${copy.afterNote}</span></div><div class="browser"><aside class="sidebar"><div class="traffic"><i></i><i></i><i></i></div><ul class="tabs">${rows(after)}</ul></aside><main class="page"><small>ACME WORKSPACE</small><h2>Issue details</h2><div class="line"></div><div class="line"></div><div class="line short"></div></main></div></section></div><p class="footer">${copy.footer}</p></body></html>`);
  await page.screenshot({ path });
}

let browser;
try {
  browser = await chromium.launchPersistentContext(join(work, 'profile'), {
    headless: process.env.STORE_CAPTURE_HEADLESS !== '0',
    executablePath: process.env.STORE_CAPTURE_CHROMIUM || chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Asia/Shanghai',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
  // URL.origin is null for chrome-extension URLs in Node.
  const base = worker.url().replace(/\/background\.js$/, '');
  const demoUrl = `http://127.0.0.1:${server.address().port}/weekly-review`;
  let switchPersisted = false;
  let renameChangedDocumentTitle = false;
  const patternTests = {};

  for (const [locale, copy] of Object.entries(localeCopy)) {
    await worker.evaluate(async state => chrome.storage.local.set({ storedState: state }), makeState(copy));
    const page = await browser.newPage();

    await captureBeforeAfter(page, copy, join(copy.output, 'screenshot-01-before-after.png'));

    await page.goto(demoUrl);
    await page.bringToFront();
    await worker.evaluate(async url => {
      const tab = (await chrome.tabs.query({})).find(tab => tab.url === url);
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { globalThis.__tabRenameOverlayPending = true; } });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    }, demoUrl);
    await page.locator('#tab-smart-rename-overlay-host').waitFor();
    await page.waitForTimeout(350);
    await page.keyboard.insertText(copy.inputName);
    await page.keyboard.press('ArrowRight');
    await page.screenshot({ path: join(copy.output, 'screenshot-02-rename-overlay.png') });
    if (locale === 'en') {
      await page.keyboard.press('Enter');
      await page.waitForFunction(title => document.title === title, copy.inputName);
      renameChangedDocumentTitle = true;
    }

    await page.goto(`${base}/options.html`);
    await page.waitForFunction(language => document.documentElement.lang === (language === 'zh_CN' ? 'zh-CN' : 'en'), copy.language);
    await page.locator('[role="switch"]').first().waitFor();
    await page.screenshot({ path: join(copy.output, 'screenshot-03-rules.png') });

    if (locale === 'en') {
      const toggle = page.locator('[role="switch"]').first();
      const before = await toggle.getAttribute('aria-checked');
      await toggle.click();
      await page.waitForFunction(expected => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === expected, before === 'true' ? 'false' : 'true');
      const storedEnabled = await worker.evaluate(async () => (await chrome.storage.local.get('storedState')).storedState.rules[0].enabled);
      if (storedEnabled !== (before !== 'true')) throw new Error('Switch failed to persist through the real background service');
      await toggle.click();
      switchPersisted = true;
    }

    await page.locator('#add').click();
    await page.locator('#rule-kind').selectOption('url-pattern');
    await page.locator('#rule-value').fill('https://linear.app/acme/issue/{1}');
    await page.locator('#rule-label').fill(copy.patternRuleName);
    await page.locator('#rule-name').fill(copy.patternTabName);
    await page.locator('#rule-test-toggle').click();
    await page.locator('#rule-test-url').fill('https://linear.app/acme/issue/ENG-42');
    await page.locator('#rule-test-run').click();
    await page.locator('#rule-test-result').waitFor();
    const testResult = (await page.locator('#rule-test-result').textContent())?.trim() || '';
    if (!testResult.includes('ENG-42')) throw new Error(`Pattern rule preview failed for ${locale}: ${testResult}`);
    patternTests[locale] = testResult;
    await page.screenshot({ path: join(copy.output, 'screenshot-04-pattern-rule.png') });

    await page.goto(`${base}/onboarding.html`);
    await page.waitForFunction(language => document.documentElement.lang === (language === 'zh_CN' ? 'zh-CN' : 'en') && document.querySelector('#shortcutStatus').textContent.length > 0, copy.language);
    await page.screenshot({ path: join(copy.output, 'screenshot-05-onboarding.png') });
    await page.close();
  }

  if (!switchPersisted || !renameChangedDocumentTitle) throw new Error('Real extension behavior checks did not complete');

  const promo = await browser.newPage();
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.goto(`file://${join(root, 'store-assets/source/promo-small-440x280.svg')}`);
  const bounds = await promo.locator('svg text').evaluateAll(nodes => nodes.map(node => { const b = node.getBoundingClientRect(); return { text: node.textContent, x: b.x, y: b.y, right: b.right, bottom: b.bottom }; }));
  if (bounds.some(b => b.x < 160 || b.right > 440 || b.y < 0 || b.bottom > 280)) throw new Error('Small promo text overlaps the icon area or escapes the canvas');
  await promo.screenshot({ path: join(root, 'store-assets/promo/promo-small-440x280.png') });
  await promo.setViewportSize({ width: 1400, height: 560 });
  await promo.goto(`file://${join(root, 'store-assets/source/promo-marquee-1400x560.svg')}`);
  const marqueeBounds = await promo.locator('svg text').evaluateAll(nodes => nodes.map(node => { const b = node.getBoundingClientRect(); return { text: node.textContent, x: b.x, y: b.y, right: b.right, bottom: b.bottom }; }));
  if (marqueeBounds.some(b => b.x < 0 || b.right > 1400 || b.y < 0 || b.bottom > 560)) throw new Error('Marquee promo text escapes the canvas');
  await promo.screenshot({ path: join(root, 'store-assets/promo/promo-marquee-1400x560.png') });

  // Remove superseded three-image filenames only after the new set is complete.
  for (const name of ['screenshot-01-rename-overlay.png', 'screenshot-02-rules.png', 'screenshot-03-onboarding.png']) {
    await rm(join(screenshotRoot, name), { force: true });
  }

  const hashes = {};
  for (const name of await readdir(join(root, 'dist'))) {
    if (/\.(js|html|css)$/.test(name)) hashes[name] = createHash('sha256').update(await readFile(join(root, 'dist', name))).digest('hex');
  }
  await writeFile(join(root, 'store-assets/source/capture-provenance.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), browser: browser.browser().version(), viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
    locales: ['en', 'zh_CN'], mode: 'real-unpacked-extension-plus-illustrative-before-after',
    harnessDifference: 'Temporary copy of manifest adds http://127.0.0.1/* host access only, to open the actual content overlay on a local example page.',
    checks: { switchPersisted, renameChangedDocumentTitle, patternTests, promoTextBounds: bounds, marqueeTextBounds: marqueeBounds }, buildSha256: hashes,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ screenshots: { globalEnglish: screenshotRoot, simplifiedChinese: chineseScreenshotRoot }, promo: ['440x280', '1400x560'], checks: 'Real extension switch persistence, document-title rename, and bilingual pattern previews passed', profile: work }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
