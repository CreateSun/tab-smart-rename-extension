# 商店英文描述与语言发布说明

本文件是发布操作说明，不是用户可见的商店详细描述。更新本地 Markdown 不会自动更新 Chrome Web Store；需在开发者控制台保存对应字段。

## 本次线上检查状态（2026-09-30）

扩展 ID：`coejidmnhlldfnlfknmnpcplgfjllpgm`。对应[商店页面](https://chromewebstore.google.com/detail/coejidmnhlldfnlfknmnpcplgfjllpgm)；编辑入口为 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole)，进入后按此 ID 找到该扩展。

线上商店目前仍显示版本 `0.1.0`、名称 `Tab Rename`、旧摘要和单张中文截图；英文详情也尚未验证为已发布。本地已准备 `0.1.1` 元数据、中英文详情、全球英文 5 图、简体中文本地化 5 图及双语应用界面。填写商店详情与上传新包是两件事；同步名称、摘要和应用内品牌需要上传 `0.1.1` 包。

本次工作只更新本地发布材料，**尚未上传图片或扩展包，也未保存或发布商品详情变更**。本地文案和素材准备完成，不代表线上更新完成。

后续操作：重新打开控制台并进入上述扩展，上传 `release/Tab-Rename-v0.1.1.zip`，保存中英文详情，上传全球英文 5 图、简体中文本地化 5 图及两张宣传图。随后绑定已验证官网，核对两个语言预览，按照控制台提示提交审核或发布，并回到商店页面确认实际展示结果。

## 添加英文商品详情

1. 打开该扩展在 Chrome Web Store 开发者控制台中的 Store listing（商品详情）。
2. 在页面顶部语言下拉中选择 English（en）。语言选项对应扩展包内的 `_locales` 目录；当前源码已有 `en` 和 `zh_CN`，本次线上检查也已看到 `en` 可选。
3. 将 [`STORE_LISTING_en.md`](STORE_LISTING_en.md) 的 Detailed description 正文粘贴到英文详细描述字段，不包含 Privacy fields 和 Publisher notes。英文名称和简短说明来自 `_locales/en/messages.json`。
4. 切回简体中文确认中文描述仍保留。分别保存、预览，按照控制台提示完成提交；不要把英文直接追加到中文描述字段。

依据：[Chrome 官方：Localize your listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize-your-listing)。

## 图片放置

- 全球截图使用 `screenshots/` 下的英文 5 图；简体中文语言项使用 `screenshots/zh-CN/` 下的本地化 5 图。
- 全球截图在没有适用本地化截图时展示；如果某个语言已上传旧的本地化截图，需要同步检查并替换，否则用户可能仍先看到旧图。
- 小型宣传图块和 Marquee 宣传图不能按语言本地化，应使用适合全球展示的设计。截图可以按语言上传。
- 第一张是明确标注的场景对比图；第 2–5 张均由 `0.1.1` 真实构建自动捕获并记录来源。详细文件映射见中文上架资料及图片交付说明。

依据：[Chrome 官方：本地化图片与展示顺序](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize-screenshots-and-promotional-video)。

## 当前语言能力（源码核查）

| 部分 | 当前行为 | 依据 |
| --- | --- | --- |
| 扩展名称、简短说明、快捷键说明 | 英文、简体中文，由 Chrome 根据浏览器界面 locale 自动选择 | `manifest.json` 中的 `__MSG_...__`；`_locales/en/messages.json`、`_locales/zh_CN/messages.json` 各 3 项 |
| 默认／回退语言 | `en`（英语）；历史状态缺失语言或出现不支持值时也回退到 `en` | `manifest.json` 的 `default_locale`；`src/domain/types.ts`、`src/storage/state.ts` |
| 重命名界面、规则管理、欢迎页、右键菜单及错误提示 | 支持英语和简体中文；默认英语；用户在永久规则页手动切换，保存到本地，不按 IP、网页或系统语言自动切换 | `src/shared/i18n.ts`、`src/ui/options.ts`、`src/ui/onboarding.ts`、`src/content/overlay.ts`、`src/background/index.ts` |
| 宣传网站（独立于扩展） | 优先读取已保存选择；无保存值时，`navigator.language` 以 `zh` 开头用中文，否则英文；可点击中／EN 手动切换并保存 | `landingpage/app.js` 第 26–38 行 |

Chrome 包元数据的消息查找顺序为：浏览器 locale → 去掉地区的语言 → 扩展 `default_locale`。应用内界面使用保存的手动选择，这里不是按访问网站的语言或用户 IP 判断。依据：[Chrome 官方：Search for messages](https://developer.chrome.com/docs/extensions/reference/api/i18n#search-for-messages)。

## 文案一致性注意事项

英文文案已删除旧版“never flickers”的绝对承诺，明确精确 URL 忽略 fragment、域名不包含子域名，并如实说明中文界面。现有中文上架文案中的“不闪烁”等同类说法应在发布前保持一致。

源码 `src/background/index.ts` 注册了 Tally 卸载反馈地址。英文文案披露了这一点，避免声称任何时候都没有网络访问。重命名功能本身在本地处理标题、URL 和规则；第三方反馈页的访问及用户主动提交的信息属于另一个场景，不能依据本地功能推断第三方页面的数据处理行为。
