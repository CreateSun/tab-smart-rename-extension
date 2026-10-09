# Tab Rename 0.1.1 — Chrome Web Store 提交清单

## 已准备

- [x] 可上传扩展包：`release/Tab-Rename-v0.1.1.zip`（`manifest.json` 位于 ZIP 根目录）。
- [x] 128×128 商店图标。
- [x] 全球英文 5 张、简体中文本地化 5 张 1280×800 截图。
- [x] 440×280 Small promo tile 和可选的 1400×560 Marquee tile。
- [x] 中英文商品说明、逐项权限理由、隐私表单答案、审核员测试步骤。
- [x] `npm run check`：TypeScript、11 个测试文件共 74 项 Vitest 测试和生产构建均通过。

## 提交前必须由你完成

- [ ] 将 `PRIVACY.md` 部署到稳定、公开、无需登录的 HTTPS URL，并在无痕窗口验证；将 URL 填入开发者控制台。
- [ ] 在 Chrome 稳定版中从 `dist/` 手动加载扩展，完成管理页、页面内命名层、权限拒绝/授权、导航、刷新、同 URL 多标签、受保护页面和快捷键的验收。
- [ ] 完成 Edge/Brave 冒烟，并记录 PDF 与 file URL 的结果（项目规格明确要求此验收）。
- [ ] 确认开发者账号、身份验证、付款资料和发布地区设置；这些均属于 Chrome Web Store 控制台账户侧操作，不能由本地项目代填。
- [ ] 将已验证的 `https://tab-rename.pages.dev/` 设为 Official URL / Homepage URL，避免线上“提供方”为纯数字且无官网信任信号。
- [ ] 在控制台按 [`../store-assets/STORE_LISTING_zh-CN.md`](../store-assets/STORE_LISTING_zh-CN.md) 粘贴文案、权限说明和测试步骤，上传列出的 ZIP 与 PNG。

## 已知发布阻塞项

`docs/IMPLEMENTATION_STATUS.md` 仍将真实浏览器 E2E、压力测试及跨浏览器冒烟标为“下一阶段必须完成”；这些不是素材缺失，但在完成前不应声称产品已经达到可公开发布的验收标准。

商店资产规格根据 Chrome Developers 的“Store listing”文档于 2026-09-17 核对：128×128 商店图标、至少一张 1280×800 截图（最多 5 张）、必填 440×280 Small promo tile，1400×560 Marquee tile 可选。
