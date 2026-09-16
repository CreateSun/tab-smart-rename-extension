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

macOS 建议键声明为 `Command+Shift+R`。该组合也是 Chrome 硬刷新的保留快捷键，Chrome 可能不分配给扩展；引导页通过 `chrome.commands.getAll()` 展示实际分配结果，并提供快捷键设置入口。
