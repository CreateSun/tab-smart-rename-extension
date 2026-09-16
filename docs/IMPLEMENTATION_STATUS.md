# MVP 实施状态

更新日期：2026-09-16

## 已实施

- Manifest V3 可构建扩展、popup、options、onboarding、快捷键和右键入口。
- Page、Tab session、精确 URL、域名规则的数据模型与统一优先级解析。
- `chrome.storage.local` 永久状态、`chrome.storage.session` 标签状态及关闭标签清理。
- 动态标题 MutationObserver 守护、150ms 合并、插件写入去环、无 title 创建。
- SPA history/hash/popstate 导航后的 Page override 清理与重新解析。
- 规则新建、编辑、启停、删除、搜索、JSON 导入导出和重复 matcher 更新。
- 站点暂停的数据与解析能力、暂停列表恢复能力。
- 受限 URL 判断、名称 Unicode code point 上限、IME composition 提交保护。
- optional host permissions；只有用户授权后才动态注册全站自动应用 content script。
- 本地隐私说明、权限说明及首日架构决策。
- Domain、storage、content 共 10 个自动化测试。

## 下一阶段必须完成

- Popup 增加“暂停当前站点/恢复”入口，并完成打开标签即时回退验收。
- 导入合法与非法规则混合时增加预览、错误明细和用户确认，再原子提交。
- 将 popup、options、onboarding 全部接入简体中文/英文本地化。
- 管理页编辑从浏览器 prompt 改为可访问表单，并补齐字段级错误。
- 增加 application/background 的消息 payload、sender、tab 竞态自动化测试。
- 增加 Chrome E2E：三种模式、同 URL 多 tab、导航/刷新、权限拒绝、规则变更和 service worker 重启。
- 运行 30 秒每 50ms title mutation 压力测试及 100 标签手工压力测试。
- 完成 Chrome 稳定版手工矩阵，并在 Edge/Brave 冒烟；记录 PDF、file URL 和默认快捷键结果。
- 补充扩展图标、商店发布资产与最终兼容版本号。

## 当前验证基线

- `npm run typecheck` 通过。
- `npm test`：3 个测试文件、10 个测试通过。
- `npm run build` 通过，产物位于 `dist/`。
- `npm audit --audit-level=low`：0 个已知漏洞。

在上述“下一阶段必须完成”项和需求 AC-01 至 AC-11 的真实浏览器验收全部通过前，不应标记为 MVP 可发布。
