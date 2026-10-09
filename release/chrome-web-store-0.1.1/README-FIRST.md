# Tab Rename 0.1.1 提交说明

这个目录只收录本次 Chrome Web Store 更新需要上传或粘贴的最终材料。不要上传同级目录中的 `0.1.0` 历史包。

## 1. Package（程序包）

- 上传：`extension/Tab-Rename-v0.1.1.zip`
- 版本：`0.1.1`
- ZIP 根目录已包含 `manifest.json`。

## 2. Store listing（商品详情）

通用配置：

- Category：`Workflow & Planning`
- Official URL / Homepage：`https://tab-rename.pages.dev/`
- Support URL：`https://github.com/CreateSun/tab-smart-rename-extension/issues`
- Store icon：`icon/store-icon-128.png`
- Small promo tile：`promo/promo-small-440x280.png`
- Marquee promo tile（可选）：`promo/promo-marquee-1400x560.png`

English（全球默认商品详情）：

- Name：`Tab Rename - Predictable Tab Titles`
- Short description：`Spot the right doc, issue, or dashboard fast. Rename this page, this tab session, or every matching URL—locally.`
- Detailed description：复制 `copy/STORE_LISTING_en.md` 中 `Detailed description` 标题下、`Privacy fields` 标题前的正文。
- Screenshots：按文件名顺序上传 `screenshots/global-en/` 中 5 张图。

简体中文本地化：

- Name：`Tab Rename - 可预测的标签命名`
- Short description：`让相似的文档、工单和后台标签一眼可辨。可仅改当前页面、保留到标签关闭，或为匹配网址建立本地规则。`
- Detailed description：复制 `copy/STORE_LISTING_zh-CN.md` 中 `详细说明` 标题下、`隐私做法` 标题前的正文。
- Screenshots：按文件名顺序上传 `screenshots/zh-CN/` 中 5 张图。

注意：小型宣传图和 Marquee 图是全球素材，不要在中文本地化页面重复上传。

## 3. Privacy practices（隐私做法）

- Single purpose：`Help users assign recognizable names to browser tabs using locally stored rules with flexible URL matching.`
- User data：选择 `No user data collected`。
- Remote code：选择 `No, I am not using remote code`。
- Privacy policy URL：`https://tab-rename.pages.dev/privacy/`

逐项权限理由和审核员测试步骤在 `copy/STORE_LISTING_zh-CN.md` 中，直接复制对应表格和列表。

重要：隐私 URL 当前可公开访问，但应先部署本次新增的 Tally 可选卸载反馈说明，再提交审核。

## 4. Distribution（分发）

- Visibility：`Public`
- Regions：全部地区（除非你有业务上的地区限制）
- Pricing：免费，无应用内购买
- Ads：无
- Mature content：无

## 5. 提交前最后检查

- 只上传 `0.1.1`，不要误选旧的 `0.1.0` ZIP。
- 在英文和简体中文两个语言预览中分别核对名称、摘要、详情与截图。
- 确认第一张图是 Before / After 场景图，后四张依次是重命名、规则管理、URL 模式和欢迎页。
- 确认官网、隐私和支持链接在未登录窗口中都能打开。
- 保存所有页面后再点击提交审核；提交后回到商店页确认展示语言和图片顺序。

## 不需要上传

- `source/` 中的 SVG 与截图来源记录。
- 测试文件、源代码、`dist/` 文件夹。
- 旧版 `0.1.0` ZIP。
