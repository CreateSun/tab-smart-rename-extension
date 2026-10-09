# Chrome Web Store listing copy (English)

**Name:** Tab Rename - Predictable Tab Titles  
**Category:** Workflow & Planning  
**Short description:** Spot the right doc, issue, or dashboard fast. Rename this page, this tab session, or every matching URL—locally.

## Detailed description

When docs, issues, and dashboards all look alike, Tab Rename puts the useful words where you can see them. It is built for developers, researchers, writers, students, and operations teams who regularly work with many similar tabs.

Open the in-page rename interface from the toolbar, page context menu, or keyboard shortcut. Then choose exactly how long the name should last:

• Page-only — keep a name until you reload or navigate to another URL.
• Tab session — keep a name for the current tab, including reloads and navigation when the extension has access to the page. Closing the tab clears it.
• Permanent rule — save a rule locally and reuse it on matching webpages. Optional site access lets rules apply automatically after navigation.

For repeatable work, create local rules using three matching modes:

• Exact URL — targets a page by its address, ignoring the #fragment.
• URL pattern — uses {1} placeholders or regex capture groups to match dynamic URLs and insert captured values into the tab name.
• Domain — applies one name to pages on the same hostname. Subdomains are matched separately.

Rules follow a fixed priority: exact URL, then URL pattern, then domain. Page-only and tab-session names take priority over permanent rules. The extension reapplies your chosen name when a webpage updates its title.

Why it works well for crowded workflows:

- Keep production and test dashboards distinct even when their pages look the same.
- Put issue IDs, project names, or document context at the start of a tab title.
- Keep a chosen title when a dynamic webpage tries to rewrite it.
- Search, edit, test, pause, import, and export permanent rules in one place.
- Work quickly with a keyboard shortcut, Enter to save, and Esc to close.
- Export and import rules as JSON for local backups or transfer between browsers.
- Tab names, URLs, and rules are processed locally and are not uploaded to the developer. No account is required.
- Free to use, with no ads or in-app purchases.

If you grant optional site access, permanent rules apply automatically after navigation. You can revoke that permission at any time.

Language: the extension name, description, renaming interface, rule manager, onboarding, page context menu, and error messages are available in English and Simplified Chinese. The in-extension language can be changed manually.

Works on regular HTTP and HTTPS webpages. Chrome-protected pages (chrome://, Chrome Web Store, new tab, and other extension pages) cannot be modified. Local files and browser PDF viewers are not guaranteed to work.

Uninstalling may open an optional feedback page hosted by Tally. No tab names, URLs, or rules are included in that page's URL.

## Privacy fields

- **Single purpose:** Help users assign recognizable names to browser tabs using rules with flexible URL matching, stored locally in the browser.
- **User data:** No user data collected. Page titles, URLs, rules, and settings are processed and stored only in the browser.
- **Remote code:** No, this extension does not use remote code.
- **Permissions:** See the permission justification table in [`STORE_LISTING_zh-CN.md`](STORE_LISTING_zh-CN.md).

## Publisher notes (do not paste into the detailed description)

The name and short description above match `_locales/en/messages.json`. Paste only the content under **Detailed description** into the English description field. See [`PUBLISHING_LOCALIZATION.md`](PUBLISHING_LOCALIZATION.md) for language selection, screenshot placement, and the current UI language limitations.
