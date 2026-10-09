# 图标、语言控件与快捷键体验修复方案

更新日期：2026-09-23  
状态：自动验证完成，等待用户手动验收

## 约束

1. Emoji 图标与名称共享同一作用域和生命周期：页面、标签、永久规则；恢复名称时同时恢复网页原图标。
2. 默认不覆盖图标，选择器展示当前网页 favicon；只有用户明确选择 Emoji 后才写入覆盖值。旧规则没有图标字段时保持兼容。
3. 图标数据只保存 Emoji 字符串，不保存或下载远程图片；页面内通过本地 SVG data URL 呈现，不增加网络请求和权限。
4. 语言选择仍是全局手动偏好，保存到 `chrome.storage.local`。Options 与 Onboarding 共用同一种紧凑分段按钮样式，任一页面修改都会影响所有扩展界面。
5. Onboarding 必须使用 manifest 实际的扩展图标，不再绘制字母占位图。
6. Chrome `suggested_key` 只是建议键，冲突时可能不分配。页面必须展示 `chrome.commands.getAll()` 返回的真实状态；不伪装为已绑定。
7. macOS 新安装建议键改为与硬刷新不冲突的 `Alt+Shift+R`。已安装用户的现有自定义绑定由 Chrome 管理，不强制覆盖。

## 实施拆分

| 工作包 | 内容 | 负责人 | 状态 |
| --- | --- | --- | --- |
| A | 名称+图标领域模型、存储兼容、解析优先级、content favicon 应用与恢复 | Luna Medium | 完成 |
| B | Overlay 扩宽 1.5 倍、输入字号 -5px、favicon/Emoji 选择器与双语文案 | Luna Medium | 完成 |
| C | Options/Onboarding 统一语言分段按钮、Onboarding 实际图标 | Luna Medium | 完成 |
| D | 快捷键真实状态、非冲突建议键、打开 Google 试用入口与双语提示 | Luna Medium | 完成 |
| E | 主线程整合、硬编码/兼容审计、自动化与生产构建 | 主线程 | 完成（50 项测试） |
| F | 用户在真实 Chrome 中手动验收快捷键与 favicon | 用户 | 等待 |

## 自动验证门槛

- 旧规则和旧 tab/page override 不含图标时仍能读取。
- page、tab、exact URL、URL pattern、host 解析时，名称与 Emoji 来自同一个命中来源。
- 恢复或 suppress 同时移除 Emoji favicon，网页原 favicon 重新生效。
- Overlay 的默认图标、Emoji 选择与保存 payload 有行为测试。
- Options 和 Onboarding 的语言按钮都能持久化并立即切换。
- Onboarding 只显示 Chrome 实际分配的快捷键；未分配时显示明确提示。
- `npm run typecheck`、完整测试和 `npm run build` 全部通过。

## 手动验收

1. 在有 favicon 的普通网页打开 Overlay，默认看到网页原图标。
2. 选择 Emoji，分别验证“当前页面 / 当前标签 / 永久规则”；刷新、关闭标签和匹配导航的行为应与名称完全一致。
3. 点击恢复原标题，名称和图标都恢复。
4. 在 Options 与 Onboarding 切换语言，重新打开其他扩展页面确认全局生效。
5. Onboarding 左上角图标与 Chrome 工具栏扩展图标一致。
6. 查看页面显示的实际快捷键；点击“在 Google 上测试”，在新标签中按快捷键验证。未分配时进入 Chrome 快捷键页面完成设置。

## 自动验证结果

- `npm run typecheck`：通过。
- `npm test`：10 个测试文件、50 项测试全部通过。
- `npm run build`：通过；`dist/` 已生成最新生产包。
