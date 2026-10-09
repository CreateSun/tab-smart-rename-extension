# 实施决策记录

日期：2026-09-16

## ADR-001：Manifest V3 + TypeScript + 原生 UI

采用 Manifest V3、TypeScript 和原生 HTML/CSS。构建仅使用 esbuild；运行时不引入第三方依赖。模块边界遵循 `domain → application → browser adapters/UI`，规则优先级仅由 domain resolver 决定。

## ADR-002：主动权限与自动权限分离

主动点击扩展、快捷键或右键菜单时使用 `activeTab + scripting` 按需注入。跨导航自动应用永久规则需要用户显式授予 `http://*/*` 与 `https://*/*` optional host permissions；onboarding 和管理页提供授权入口。未授权时永久规则仍可在主动操作的当前页使用，但不能承诺后台自动应用。

## ADR-003：Page 边界与会话状态

Page override 存在 content-script 内存中，因此刷新、跨文档导航和关闭标签自然清除；hash/history 的同文档导航也由 URL 变化清除。Tab override 存入 `chrome.storage.session` 并以 tabId 关联，tab 关闭时删除。它不会迁移到 local storage，也不会成为永久规则。

## ADR-004：右键入口与兼容降级（已由 ADR-006 取代）

初始方案由右键菜单打开 popup 或兼容小窗口。全屏页内界面确定后，此方案废止，当前行为以 ADR-006 为准。

## ADR-005：浏览器与页面边界

首发最低版本暂定 Chrome 120。受限页面不尝试绕过平台限制；`file://` 不在 MVP 主动请求范围。PDF 是否可改名取决于浏览器查看器及注入权限，作为发布前手工兼容项保留。

## ADR-006：页面内全屏命名界面

工具栏图标、manifest command 和右键菜单统一由 background 调用 `openRenameOverlay(tabId)`，按需注入 content bundle。界面使用 closed Shadow DOM 与宿主页面隔离，但所有读写仍通过 background application service，content 不复制规则优先级或存储逻辑。受保护页面保持平台限制，不降级回扩展 popup。

初始 macOS 建议键曾声明为 `Command+Shift+R`，但该组合也是 Chrome 硬刷新的保留快捷键，Chrome 可能不分配给扩展。此决定已由 ADR-008 修订；引导页始终通过 `chrome.commands.getAll()` 展示实际分配结果，而不是展示 manifest 的建议值。

## ADR-007：应用内双语的手动选择与英文默认

首发支持英语（`en`）和简体中文（`zh_CN`），新安装和历史数据中缺失语言字段时一律回退到英语。语言是用户在“Permanent rules / 永久规则”页主动选择的偏好，持久化在 `chrome.storage.local`；不根据 IP、网页语言、浏览器 locale 或系统语言自动切换，以避免同一台设备上不同浏览上下文造成不可预期的界面变化。

`_locales` 继续用于 manifest 中的扩展元数据；应用内所有可见文案则由可类型检查的应用词典按已保存的语言渲染。这使用户选择可以覆盖 Chrome 包的自动 locale。语言切换后，管理页和引导页立即重新渲染；已打开的命名层下次打开时使用新语言；右键菜单在变更、安装和浏览器启动时刷新标题。缺少译文属于测试失败，不允许静默回退为混合语言界面。

## ADR-008：名称与图标同作用域，以及可验证的非冲突快捷键

Emoji 图标覆盖与名称共享页面、标签、永久规则三个作用域和相同生命周期。存储只保留短 Emoji 字符串；网页原 favicon 单独作为运行时事实读取，旧规则没有 `icon` 字段时不覆盖图标。恢复原标题或 suppress 规则时同步移除注入的 favicon。

新安装的建议快捷键统一改为 `Alt+Shift+R`，避免与 Chrome 的硬刷新组合冲突。建议键不等于已绑定键；Onboarding 只展示 `chrome.commands.getAll()` 返回的当前绑定，未分配时引导用户打开 `chrome://extensions/shortcuts`，并提供打开普通 Google 页面进行实际验证的入口。Chrome 将符号组合显示成英文按键名属于浏览器 UI 表示差异，不由扩展改写。
