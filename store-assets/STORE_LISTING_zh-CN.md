# Chrome Web Store 上架资料（简体中文）

适用版本：`0.1.0`  
默认语言：简体中文（zh-CN）  
建议分类：生产力工具（Productivity）

## 商品详情

**名称**：Tab Renamer - 免费标签页重命名工具

**简短说明**（Manifest，少于 132 个字符）

一键重命名浏览器标签页。支持精确 URL、URL 正则和域名三种匹配规则，数据仅保存在本地。

**详细说明**

Tab Renamer 帮助你整理杂乱的浏览器标签页——给每个标签一个一目了然的名称。

在普通网页上按快捷键或点击工具栏图标，即可在页面内打开重命名界面。根据需求选择保存范围：

• 仅当前页面 —— 导航到其他页面后名称自动消失。
• 当前标签会话 —— 刷新、页内跳转后名称仍保留，关闭标签后清除。
• 永久规则 —— 保存在本地，每次打开匹配页面时自动应用。

三种专业匹配模式，让规则精准覆盖你的场景：

• 精确 URL —— 只匹配一个完整地址，适合固定页面。
• URL 正则 —— 使用 {1} 占位符或正则捕获组匹配动态 URL，并将捕获值自动填入标签名称。
• 域名 —— 为某个域名下的所有页面统一命名。

规则遵循固定优先级（精确 URL > URL 正则 > 域名），当前页面和标签会话命名始终优先于规则。命名结果清晰可预测，不会出现闪烁。

更多特性：
- 管理页面集中管理所有规则：搜索、编辑、启用、禁用、删除、导入和导出。
- 键盘优先设计：Enter 保存、Esc 关闭、快捷键打开。
- 右键菜单入口，快速操作。
- 数据只在本机运行——不发送网络请求、不使用遥测、不上传任何数据。
- 完全免费，无广告，无内购。

当你明确授权网站访问权限后，永久规则可以在导航后自动应用。你可以随时在浏览器扩展设置中撤销该权限。

受 Chrome 平台限制，`chrome://`、Chrome Web Store、新标签页、其他扩展页面等受保护页面无法修改；文件 URL 和 PDF 的可用性取决于浏览器设置与查看器实现。

## 隐私做法（Privacy practices）

**单一用途说明**

帮助用户为浏览器标签页设置易识别的名称，通过灵活的 URL 匹配规则在用户选择的范围内保存和应用命名。

**数据使用**

选择"不收集用户数据"（No user data collected）。扩展会在浏览器本地处理当前标签页标题和网址；它们不会传输给开发者或第三方。

**远程代码**

选择"否，我不使用远程代码"（No, I am not using remote code）。扩展不加载、下载或执行远程代码。

**隐私政策 URL**

发布前请将项目中的 [`PRIVACY.md`](../PRIVACY.md) 发布到一个稳定的公开 HTTPS 地址，并将该地址填入控制台。当前仓库远程地址为：

`https://github.com/CreateSun/tab-smart-rename-extension`

若该仓库的默认分支公开且包含该文件，可使用：

`https://github.com/CreateSun/tab-smart-rename-extension/blob/main/PRIVACY.md`

提交前务必在无登录状态打开链接确认可访问；若默认分支不是 `main`，请替换分支名。

## 权限理由（逐项粘贴）

| Manifest 权限 | 控制台中的理由 |
| --- | --- |
| `activeTab` | 仅当用户点击扩展图标、使用快捷键或网页右键入口时，临时访问当前选中的标签页，以显示重命名界面并修改该页标题。 |
| `scripting` | 仅在用户主动操作当前标签页时，按需注入本地标题守护与重命名界面脚本。不会注入受保护页面。 |
| `storage` | 在浏览器本地保存永久规则及当前标签会话命名；不向任何服务器发送这些数据。 |
| `contextMenus` | 在普通网页的右键菜单中提供"重命名当前标签页"入口。 |
| `tabs` | 读取标签页标识、网址和标题，以便将本地规则应用到匹配标签、处理导航与关闭标签，并展示规则状态；这些信息不会离开浏览器。 |
| `http://*/*`（可选） | 仅在用户明确启用"授权自动应用"后使用，使永久规则能在 HTTP 网站导航后自动应用。 |
| `https://*/*`（可选） | 仅在用户明确启用"授权自动应用"后使用，使永久规则能在 HTTPS 网站导航后自动应用。 |

## 审核员测试说明（Test instructions）

1. 安装扩展后，打开任意普通 `https://example.com` 页面。
2. 点击工具栏中的 Tab Renamer 图标；页面中应出现命名界面。输入"示例标签"，选择"只保留在当前标签"，按 Enter。浏览器标签标题应更新为"示例标签"。
3. 刷新页面；当前标签会话名称应仍然显示。关闭该标签后，该会话命名会自动清除。
4. 打开扩展的"管理"页，新建一条域名规则：匹配 `example.com`，名称为"Example"。回到 `https://example.com` 并主动打开扩展，规则应可应用。
5. 在管理页点击"授权自动应用"，在 Chrome 权限提示中允许后，永久规则可在用户已授权网站的导航后自动应用。拒绝授权不会影响手动重命名。
6. 打开 `chrome://settings` 或 Chrome Web Store；扩展应提示这是浏览器受保护页面，且不会修改页面。

无需账号、付款方式、测试账号或外部服务。

## 分发与内容声明

- 建议可见性：公开（Public）。若先行小范围验收，选择非公开（Unlisted）后再改为公开。
- 付费：免费，无应用内购买。
- 广告：无。
- 成人内容：无。
- 远程托管代码：无。
- 用户数据出售或共享：无。

## 上传文件映射

| Chrome Web Store 字段 | 使用文件 |
| --- | --- |
| Store icon | [`listing/store-icon-128.png`](listing/store-icon-128.png) |
| Screenshot 1 | [`screenshots/screenshot-01-rename-overlay.png`](screenshots/screenshot-01-rename-overlay.png) |
| Screenshot 2 | [`screenshots/screenshot-02-rules.png`](screenshots/screenshot-02-rules.png) |
| Screenshot 3 | [`screenshots/screenshot-03-onboarding.png`](screenshots/screenshot-03-onboarding.png) |
| Small promo tile | [`promo/promo-small-440x280.png`](promo/promo-small-440x280.png) |
| Marquee promo tile（可选） | [`promo/promo-marquee-1400x560.png`](promo/promo-marquee-1400x560.png) |
| Extension package | [`../release/Tab-Rename-v0.1.0.zip`](../release/Tab-Rename-v0.1.0.zip) |
