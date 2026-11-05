# Tab Rename 0.1.3 提交说明

本版只新增用户反馈入口并同步隐私文案，核心重命名逻辑不变。上传时只使用 `0.1.3` 包，不要误选仍指向旧表单的 `0.1.2` 包。

## 1. Package（程序包）

- 上传：`release/Tab-Rename-v0.1.3.zip`
- 版本：`0.1.3`
- ZIP 根目录已包含 `manifest.json`；已排除 `.DS_Store` 和 `*.map`。
- SHA-256：`6a363ac5c9c604a925cfe98806a101be5645f3128049e902527fb70bbb20f59c`
- 包内反馈地址：`https://tally.so/r/BEK405`

## 2. Store listing（商品详情）

通用配置：

- Category：`Workflow & Planning`
- Official URL / Homepage：`https://tab-rename.pages.dev/`
- Support URL：`https://tally.so/r/BEK405`
- Store icon：`store-assets/listing/store-icon-128.png`
- Small promo tile：`store-assets/promo/promo-small-440x280.png`
- Marquee promo tile（可选）：`store-assets/promo/promo-marquee-1400x560.png`
- 截图沿用 0.1.1 素材，本版界面无视觉变更：`release/chrome-web-store-0.1.1/screenshots/`

English（全球默认商品详情）：

- Name：`Tab Rename - Predictable Tab Titles`
- Short description：`Spot the right doc, issue, or dashboard fast. Rename this page, this tab session, or every matching URL—locally.`
- Detailed description：复制 `store-assets/STORE_LISTING_en.md` 中 `Detailed description` 标题下、`Privacy fields` 标题前的正文。
- Screenshots：按文件名顺序上传 5 张英文图。

简体中文本地化：

- Name：`Tab Rename - 可预测的标签命名`
- Short description：`让相似的文档、工单和后台标签一眼可辨。可仅改当前页面、保留到标签关闭，或为匹配网址建立本地规则。`
- Detailed description：复制 `store-assets/STORE_LISTING_zh-CN.md` 中 `商品详情` 标题下、`隐私做法` 标题前的正文。
- Screenshots：按文件名顺序上传 5 张中文图。

注意：小型宣传图和 Marquee 图是全球素材，不要在中文本地化页面重复上传。

## 3. Privacy practices（隐私做法）

- Single purpose：`Help users assign recognizable names to browser tabs using locally stored rules with flexible URL matching.`
- User data：选择 `No user data collected`。
- Remote code：选择 `No, I am not using remote code`。
- Privacy policy URL：`https://tab-rename.pages.dev/privacy/`

关于新增反馈入口的口径：

- 扩展本身不采集、不上传标签名、URL、规则或设置。
- 卸载时由 Chrome 打开 Tally 反馈页；扩展内的反馈链接只有用户主动点击才会打开。
- 反馈 URL 只附带入口名称（`source`）和扩展版本号（`v`），不附带页面内容。
- 反馈由第三方 Tally 托管，是否提交由用户决定；这一点已写入隐私说明。审核若询问，按上述口径说明即可。

**提交前必须更新线上隐私页**：把本仓库更新后的 `PRIVACY.md` 部署到 `https://tab-rename.pages.dev/privacy/`。旧文案只提到卸载场景，没有覆盖新增的三个反馈入口。

## 4. Distribution（分发）

- Visibility：`Public`
- Regions：全部地区（除非你有业务上的地区限制）
- Pricing：免费，无应用内购买
- Ads：无
- Mature content：无

## 5. 0.1.3 相对 0.1.2 的变更

- 新增四个反馈入口：规则页 footer、规则说明对话框、错误/受阻状态、欢迎页 footer。
- 原有卸载反馈页切换到新的 Tally 表单 `BEK405`，并带 `source`、`v` 参数。
- 新安装默认快捷键调整为 macOS `Command+Shift+E`、Windows/Linux `Ctrl+Shift+E`，避开 `Cmd+Shift+R` 和 DevTools/VS Code 常用的 `Cmd+Shift+P`。
- 引导页在快捷键未分配时改为更友好的说明，并提供“设置快捷键”按钮。
- 隐私文案从“无网络请求”调整为“扩展不主动联网 · 无遥测 · 反馈仅在你点击时打开”。
- 版本号同步更新：`manifest.json`、`package.json`、`package-lock.json`、中英文页脚。

## 6. 提交前最后检查

- [ ] 只上传 `Tab-Rename-v0.1.3.zip`；旧 `Tab-Rename-v0.1.2.zip` 仍是旧表单地址，不要上传。
- [ ] 在 Chrome 稳定版从 ZIP 或 `dist/` 加载扩展，打开规则页、规则说明、欢迎页，逐个点击反馈链接，确认都在新标签页打开 `tally.so/r/BEK405`。
- [ ] 在全新 Chrome 配置文件中安装，确认默认快捷键为 `⌘⇧E` 且可用；若与本机软件冲突，引导页应显示“尚未设置”的友好提示，并可一键打开快捷键设置。
- [ ] 在 Tally 后台确认测试回复里能看到 `source` 和 `v=0.1.3`。
- [ ] 拒绝一次网站权限、导入一个错误 JSON、跑一次未命中的规则测试，确认三类错误状态都会出现“报告这个问题/发送反馈”链接。
- [ ] 确认 `https://tab-rename.pages.dev/privacy/` 已更新为本版 `PRIVACY.md`。
- [ ] 在英文和简体中文两个语言预览中分别核对名称、摘要、详情与截图。
- [ ] 确认官网、隐私和支持链接在未登录窗口中都能打开。
- [ ] 保存所有页面后再点击提交审核；提交后回到商店页确认展示语言和图片顺序。

## 7. 不需要上传

- `store-assets/source/` 中的 SVG 与截图来源记录。
- `tests/`、`src/`、`scripts/`、`dist/` 文件夹。
- 旧版 `Tab-Rename-v0.1.0.zip`、`Tab-Rename-v0.1.1.zip`、`Tab-Rename-v0.1.2.zip`。
