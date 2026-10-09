# Tab Rename 浏览器插件需求规格说明书

- 文档版本：0.1.0
- 状态：MVP 基线
- 日期：2026-09-16
- 目标平台：Chromium 桌面浏览器（首发以 Chrome 为验收基准）
- 参考调研：/Users/createsun/Project/ObsidianNote/📝 Project/Tab Rename 插件立项调研.md

## 1. 文档目的

本文定义 Tab Rename MVP 的用户问题、范围、交互、状态模型、功能及非功能需求、数据契约和验收标准，作为设计、开发和发布验收的共同依据。

文中的：

- “必须”表示 MVP 发布阻塞项。
- “应该”表示高优先级要求；若延期必须记录原因。
- “可以”表示实现自由度或后续增强。

## 2. 产品概述

### 2.1 一句话定位

一个本地优先、快速、稳定且可预测的浏览器标签页重命名工具，让用户清楚决定名称只作用于当前页面、当前标签会话，还是未来匹配的网页。

### 2.2 用户问题

浏览器原始标题经常过长、相似或缺少上下文。重度用户在同时处理后台系统、文档、商品、工单、PDF 和多个相似页面时，难以快速辨认标签。现有插件常见问题是：

- 只支持 URL 永久绑定，无法给同 URL 的两个标签分别命名。
- 持久化行为不明确，旧名称在未来意外出现。
- 动态网站会抢回标题，或插件为保持标题造成高 CPU、卡死。
- 修改来自哪条规则不可见，用户难以理解和撤销。
- 快捷键、输入法和浏览器受限页面体验不完整。

### 2.3 MVP 目标

1. 用户能在数秒内为当前标签命名。
2. 临时、会话、永久三种意图在创建前可见，应用后可解释。
3. 同一 URL 的多个标签可在会话模式下拥有不同名称。
4. 动态网页修改标题时，插件以低开销恢复用户名称。
5. 所有用户数据保存在本机，可查看、暂停、删除、导入和导出。

### 2.4 非目标

MVP 不包含：

- Firefox、Safari 和移动浏览器正式支持。
- AI 生成标题。
- 登录、云服务、团队共享或第三方后端。
- 跨设备同步。
- favicon、颜色或标签分组定制。
- URL 前缀快捷规则和用户自定义规则排序；URL 模式与正则捕获由当前规则编辑器支持。
- 批量重命名当前所有标签。
- 修改浏览器原生标签条右键菜单；Chromium 扩展 API 不提供该能力。
- 绕过 chrome://、Chrome Web Store、新标签页等浏览器受保护页面限制。

## 3. 目标用户与场景

### 3.1 目标用户

- 同时打开大量相似页面的开发者、研究者和知识工作者。
- 管理多个商品、工单、客户或后台页面的运营、客服人员。
- 同时阅读多个 PDF 或文档，需要以个人上下文区分标签的用户。

### 3.2 核心场景

#### 场景 A：当前页面临时备注

用户把当前商品页命名为“待比价”，导航到下一页面后不再沿用该名称。

#### 场景 B：同 URL 多标签区分

用户打开两个 URL 相同的后台标签，分别命名为“生产账号”和“测试账号”。名称只属于各自标签，标签关闭后消失。

#### 场景 C：建立永久规则

用户把一个精确 URL 永久命名为“周报”，或把整个域名永久命名为“公司后台”。以后匹配页面自动应用名称。

#### 场景 D：动态页面守护

邮件或聊天网站更新未读数并重写原标题，插件保持用户自定义名称，同时不引发明显性能问题。

#### 场景 E：发现并撤销规则

用户看到旧名称自动出现，可以立即知道它来自哪个规则，并暂停、编辑、删除或仅在当前标签临时覆盖。

## 4. 核心概念与不变量

### 4.1 原始标题

原始标题是页面在没有插件自定义名称时提供的标题。内容脚本必须在第一次应用自定义名称前记录它；页面后续产生的新标题也应更新为最新原始标题，但不得覆盖当前生效的自定义名称。

### 4.2 三种命名模式

| 模式 | 用户文案 | 作用边界 | 结束条件 | 是否落盘 |
|---|---|---|---|---|
| Page | 仅当前页面 | 当前 tab 当前文档/URL | 主框架导航到不同 URL、刷新或关闭 tab | 否 |
| Tab session | 当前标签 | 当前 tab 实例 | tab 关闭；刷新和导航后继续生效 | 仅 session storage；浏览器重启后不保证恢复 |
| Permanent rule | 永久规则 | 精确 URL 或域名 | 用户暂停/删除规则 | 是，local storage |

约束：

- Page 模式只做临时覆盖，不创建规则。
- Tab session 使用 tabId 作为运行时关联键；tabId 不能写入永久规则。
- Permanent rule 必须显式选择“精确 URL”或“整个域名”。
- MVP 不允许把生命周期和作用域任意排列组合，避免用户难以预测行为。

### 4.3 生效优先级

唯一优先级为：

1. Page override
2. Tab session override
3. 精确 URL 永久规则
4. 域名永久规则
5. 页面原始标题

同一层出现多个候选永久规则时，最后更新的启用规则生效。正常 UI 应阻止创建重复 matcher；导入产生重复项时按 updatedAt 判定并在导入结果中报告。

### 4.4 域名匹配语义

- 精确 URL 匹配采用规范化 URL：移除 fragment，保留 scheme、host、port、path 和 query。
- 域名规则按 hostname 精确匹配；example.com 默认不包含 sub.example.com，二者需分别建规则。
- hostname 比较不区分大小写，并按浏览器 URL API 的标准化结果存储。
- 非 http/https 页面不允许创建永久规则。

### 4.5 单一决策路径

所有入口必须调用同一规则解析逻辑：

用户操作/导航/标题变化 → 读取当前页面事实和 overrides/rules → 解析唯一 effective name → 内容脚本应用 → UI 展示来源。

Popup、快捷键、右键菜单不得各自实现另一套优先级或存储逻辑。

## 5. 功能需求

### FR-01 打开重命名界面

- 用户点击扩展图标必须打开 popup。
- 必须提供一个 manifest command 打开 popup；建议默认快捷键为 Alt+Shift+R（macOS 为 Option+Shift+R），最终默认值需在实现阶段检查与 Chrome 保留/常见快捷键冲突。
- 必须注册网页内容区域的右键菜单“重命名此标签页…”，点击后应打开可完成同等操作的扩展界面或最小输入流程。
- 首次使用时必须说明快捷键可在 chrome://extensions/shortcuts 修改。

### FR-02 Popup 信息与输入

Popup 必须显示：

- 当前原始标题，过长时截断并可查看完整值。
- 名称输入框，打开时自动聚焦并全选当前有效名称；若无自定义名称则全选原始标题。
- 模式选择：仅当前页面、当前标签、永久规则。
- 选择永久规则时显示作用域：精确 URL、整个域名。
- 当前有效名称的来源，例如“当前标签命名”或“来自域名规则 example.com”。
- 保存、恢复原标题、管理规则入口。

交互要求：

- Enter 保存，Escape 关闭且不保存。
- 输入法处于 composition 状态时，Enter 只能确认候选，不能提交。
- 去除首尾空白后为空的名称不能保存；长度上限 256 个 Unicode code points。
- 保存成功后立即更新当前标签并关闭 popup；失败时 popup 保留并显示可操作错误。
- 模式和永久作用域的默认值必须显式可见；MVP 默认“当前标签”，不得静默记忆成永久规则。

### FR-03 Page 临时命名

- 保存后只覆盖当前 tab 当前页面。
- 页面自身改写标题时，名称仍应保持。
- 同 URL 的刷新、主框架重新加载、前进后退或跳转均结束 Page override；如果重新命中永久规则，则应用永久规则。
- 关闭 tab 后不保留。

### FR-04 Tab session 命名

- 保存后绑定当前 tab；该 tab 的刷新、SPA 路由变化及跨 URL 导航后继续保持。
- 同 URL 的不同 tab 可使用不同名称，互不影响。
- tab 关闭时必须删除关联数据。
- 浏览器正常退出、扩展更新或 service worker 重启不得把它转成永久规则。
- 如 chrome.storage.session 在某个 Chromium 版本不可用，实现可以内存降级，但必须在兼容性说明中写明重启/worker 回收语义。

### FR-05 永久规则

- 用户可以为当前页面创建精确 URL 规则或域名规则。
- 新建规则默认启用，并立即应用到所有已打开且匹配、又没有更高优先级 override 的标签。
- 编辑规则后，所有受影响的打开标签必须重新解析。
- 暂停规则后，受影响标签必须回退到下一优先级或原始标题。
- 删除规则前必须二次确认；删除后立即重新解析受影响标签。
- 对重复 matcher 的新建操作应转为编辑现有规则，并清楚提示。

### FR-06 恢复原标题

- Popup 必须提供“恢复原标题”。
- 若当前生效来源是 Page/Tab session，只清除该 override，然后重新解析永久规则。
- 若来源是永久规则，用户必须选择：仅为当前标签建立临时原始标题覆盖，或前往管理页暂停/删除规则。不得静默删除全局规则。
- 当用户要求“忽略当前规则”时，MVP 可以用 Page override 的 suppress 标记表达，且导航后失效。

### FR-07 标题守护

- 内容脚本必须观察 title 元素的添加和文本变化；页面改写后重新应用有效名称。
- 不得通过固定周期轮询 document.title 保持名称。
- 不得观察整个 document subtree 的所有 mutation 后无差别处理。
- 同一标签的连续变化必须去重、合并；建议 100–250ms 内最多执行一次解析/应用。
- 插件写入目标标题后产生的 mutation 不得形成自激循环。
- 页面没有 title 元素时可以创建 title，但必须避免重复创建。
- SPA 主框架 history 导航时必须重新计算 Page override 是否失效、永久规则是否变化。

### FR-08 管理页

管理页必须提供：

- 永久规则列表：名称、类型、matcher、启用状态、更新时间。
- 按名称或 matcher 搜索。
- 新建、编辑、暂停/启用、删除规则。
- 清楚展示规则优先级说明。
- JSON 导入、导出。
- “站点暂停”列表的查看和恢复。
- 当前版本与隐私说明。

MVP 不要求拖拽排序、批量选择或复杂分页；规则超过 200 条时列表仍应可正常使用。

### FR-09 导入与导出

- 导出文件必须包含 schemaVersion、exportedAt 和 rules，不包含浏览历史、Page/Tab session overrides 或诊断信息。
- 导入前必须校验 JSON 结构、字段类型、名称长度、URL/matcher 合法性。
- 导入采用合并策略，不清空现有规则；同 matcher 冲突时默认保留 updatedAt 较新的记录，并汇总新增、更新、跳过、错误数量。
- 导入必须是原子的：文件存在结构级错误时不写入任何数据；单条数据错误则跳过该条并在确认后一次提交其余合法数据。
- 未知 schemaVersion 必须拒绝导入并保留现有数据。

### FR-10 站点暂停与受限页面

- 用户可对当前 hostname 暂停插件；暂停后清除该站点当前标签的插件标题，并不再守护或应用永久规则。
- 站点暂停是本地永久设置，可在管理页恢复。
- chrome://、edge://、about:、Chrome Web Store、新标签页、扩展页面等不可注入页面必须显示“浏览器限制，无法修改”，而不是通用失败。
- file:// 页面在没有用户授予文件 URL 权限时必须给出明确提示；MVP 不主动要求该权限。
- 无 hostname 或非 http/https 页面可允许 Page/Tab session（若注入能力允许），但不能创建域名/URL 永久规则。

### FR-11 安装与升级

- 首次安装打开一个简短 onboarding 页面，说明三种模式、入口、受限页面和本地存储承诺。
- 升级不得丢失有效规则。
- 存储 schemaVersion 变化必须执行显式迁移；迁移失败时保留原数据备份并停用规则写入，提示用户导出/重试，不得静默清空。

### FR-12 错误与反馈

- 用户可理解的错误至少包括：受限页面、无权限、标签已关闭、内容脚本不可达、导入格式错误、存储失败。
- 错误提示必须说明下一步，例如刷新页面、打开权限、换到普通网页或进入管理页。
- 控制台日志不得包含完整页面标题、完整 URL query 或用户自定义名称；生产构建默认不输出调试日志。

## 6. 状态与数据契约

### 6.1 永久存储建议结构

以下结构是模块间契约；字段变更需提升 schemaVersion 并提供迁移。

~~~ts
type StoredStateV1 = {
  schemaVersion: 1;
  rules: RenameRule[];
  pausedHosts: string[];
  settings: {
    guardDebounceMs: number; // 默认 150，MVP UI 不开放修改
    onboardingCompleted: boolean;
  };
};

type RenameRule = {
  id: string;                // UUID
  name: string;              // 1..256 Unicode code points
  match: ExactUrlMatch | HostMatch;
  enabled: boolean;
  createdAt: string;         // ISO 8601 UTC
  updatedAt: string;         // ISO 8601 UTC
};

type ExactUrlMatch = {
  kind: "exact-url";
  value: string;             // normalized URL, without fragment
};

type HostMatch = {
  kind: "host";
  value: string;             // normalized hostname
};
~~~

### 6.2 会话存储建议结构

~~~ts
type SessionState = {
  tabOverrides: Record<string, {
    name: string;
    createdAt: string;
  }>;
};
~~~

Page override 优先保存在内容脚本内存，并携带创建时的 document/URL 标识；不得持久化。若实现为 service worker 运行时映射，必须在导航事件上可靠删除。

### 6.3 导出格式

~~~json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-16T00:00:00.000Z",
  "rules": []
}
~~~

### 6.4 权限预算

Manifest 权限必须最小化并在 README 解释用途。预期权限：

- storage：保存规则、设置和 session overrides。
- activeTab：用户主动操作时访问当前标签。
- scripting：按需注入或与内容脚本通信。
- contextMenus：网页右键入口。
- tabs：读取标签状态、向已打开匹配标签应用规则；若实现证明不需要则移除。

host_permissions 应优先使用 optional_host_permissions，由 onboarding 或首次启用自动规则时清楚请求。若永久规则自动应用在技术上必须使用 <all_urls>，发布前必须用实现验证其必要性，并在商店文案解释。不得仅为方便扩大权限。

## 7. 非功能需求

### NFR-01 性能

- 没有标题变化、导航或用户操作时，不执行周期任务；闲置 CPU 应接近无扩展基线。
- 任何内容脚本不得使用 setInterval 轮询标题。
- 在 100 个普通网页标签、其中 20 个应用名称的测试中，浏览器静置 5 分钟不得出现持续增长的定时器、消息或内存趋势。
- 单标签每秒 20 次 title mutation、持续 30 秒时，插件必须保持最终名称且浏览器可交互，不产生无限消息循环。
- 用户点击保存后，普通页面的自定义名称应在 200ms 内可见；跨所有已打开标签更新可在 1 秒内最终一致。

### NFR-02 稳定性

- 插件错误不得导致页面脚本异常、标签崩溃或阻断页面导航。
- service worker 被回收再唤醒后，永久规则解析保持一致。
- 关闭标签与异步写入竞态必须安全处理，不能把 override 错配给复用的 tabId。
- 所有消息都应验证发送方、payload 和 tab 状态；重复消息应幂等。

### NFR-03 隐私与安全

- MVP 不包含网络请求，不加载远程脚本，不上传标题、URL、规则或使用数据。
- 不采集遥测；若未来增加，必须默认关闭、单独征得同意并更新本规格和隐私政策。
- 用户输入通过 textContent/document.title 应用，禁止作为 HTML 注入。
- 导入文件视为不可信输入；限制文件大小（建议 1 MiB）、规则数（建议 5000）和字段长度，避免资源耗尽。
- 导出仅包含规则，不包含完整浏览历史或临时标签状态。

### NFR-04 可访问性与本地化

- Popup 和管理页必须支持纯键盘操作、可见焦点、语义 label 和屏幕阅读器名称。
- 文本与背景对比度达到 WCAG 2.1 AA。
- 初版 UI 至少提供简体中文和英文；存储值使用稳定英文枚举，不存本地化文案。
- 必须针对中文、日文、韩文 IME 的组合输入测试 Enter 提交行为。

### NFR-05 兼容性

- 发布基线：当前稳定版 Chrome 与前两个稳定大版本；具体版本号在首次发布时写入 README。
- 应在 Edge、Brave 至少完成核心冒烟测试，但 MVP 不承诺所有 Chromium 派生浏览器完全兼容。
- 页面覆盖至少测试静态 HTML、SPA、频繁更新 title 的页面、PDF 查看器和无 title 页面。

### NFR-06 可维护性

- 规则规范化和解析必须为无浏览器依赖的纯函数，可单元测试。
- 所有入口依赖同一 application service，禁止复制匹配逻辑。
- 存储读写集中在单一模块并执行 schema 校验。
- 内容脚本只负责采集页面标题变化与应用决策，不自行拥有永久规则真相。

## 8. 建议模块边界

这不是框架要求，而是职责约束：

| 模块 | 拥有 | 不拥有 |
|---|---|---|
| domain | URL 规范化、匹配、优先级、effective name 解析 | 浏览器 API、UI、存储 I/O |
| application | 创建/更新/清除命名，协调规则与标签重新解析 | DOM 操作、具体存储实现 |
| storage | schema、迁移、原子读写、导入导出 | 规则优先级、UI |
| background | 浏览器事件、commands/contextMenus、tab 生命周期、消息路由 | DOM、组件状态 |
| content | 原始 title 捕获、MutationObserver、应用/恢复 title | 永久规则存储、优先级决策 |
| popup/options | 呈现状态和收集用户意图 | 直接写 storage、独立规则解析 |

依赖方向：UI/background/content → application ports → domain；storage 和浏览器适配器实现 ports。domain 不反向依赖任何浏览器层。

## 9. 关键流程

### 9.1 保存当前标签命名

1. Popup 获取当前 tab、原始标题、当前 effective name 与来源。
2. 用户输入名称并选择“当前标签”。
3. Application 校验输入，在 session storage 写入 tab override。
4. Resolver 计算 effective name。
5. Background 通知对应 content script 应用。
6. Content 返回成功回执；Popup 成功后关闭。

### 9.2 永久域名规则在导航后应用

1. 浏览器发出主框架导航/标签更新事件。
2. Background 获取规范化 URL 和 hostname。
3. Resolver 排除 paused host，按优先级计算规则。
4. Background 把决策发给 content script；重复决策不重复写 DOM。
5. 内容脚本记录页面原始标题并应用名称。

### 9.3 页面抢回标题

1. Observer 捕获 title 变化，先把非插件目标值记为最新原始标题。
2. 若存在 effective custom name，合并连续变化后恢复目标值。
3. 插件自身写入产生的 mutation 被目标值比较拦截，不继续发消息。
4. 若 host 已暂停或没有有效名称，不恢复页面标题。

### 9.4 清除永久规则

1. 管理页确认用户意图并删除规则。
2. Application 找出可能受影响的已打开标签并重新解析。
3. 各标签回退到更高/更低层 override、其他规则或最新原始标题。
4. 某个标签已关闭或不可达时记录为非阻塞结果，不回滚规则删除。

## 10. 验收标准

### AC-01 基本改名

- Given 普通网页可注入，When 用户输入“生产账号”并选择当前标签保存，Then 200ms 内当前标签显示该名称，刷新与跨 URL 导航后仍保持，其他同 URL 标签不变。

### AC-02 Page 生命周期

- Given 用户选择仅当前页面保存，When 页面脚本修改 title，Then 自定义名称恢复；When 用户刷新或导航，Then该临时名称消失并重新计算永久规则。

### AC-03 永久 URL 与域名规则

- Given 同域不同路径两个页面，When 为其中一个创建精确 URL 规则，Then 只有规范化 URL 完全匹配者生效。
- Given 为 example.com 创建域名规则，Then example.com 的路径/query 均匹配，sub.example.com 不匹配。

### AC-04 优先级可解释

- Given 域名规则、精确 URL 规则和当前标签 override 同时存在，Then 当前标签 override 生效；清除后精确 URL 生效；暂停后域名规则生效；Popup 每一步均显示正确来源。

### AC-05 恢复行为

- Given 当前名称来自永久规则，When 点击恢复原标题，Then 系统不静默删除规则，并让用户选择只忽略当前页面或进入规则管理。

### AC-06 动态标题与性能

- Given 测试页面每 50ms 修改一次 title 持续 30 秒，When tab 有自定义名称，Then 最终持续显示自定义名称，无无限循环，页面仍可交互，停止变化后无周期工作。

### AC-07 IME

- Given 用户使用中文/日文/韩文 IME，When 在候选阶段按 Enter，Then popup 不提交；compositionend 后再次 Enter 才保存。

### AC-08 受限页面

- Given 当前页面为 chrome:// 或 Web Store，When 用户打开 popup 或调用快捷键，Then 显示明确平台限制，不创建任何规则或残留 override。

### AC-09 导入原子性

- Given 不支持的 schemaVersion 或无法解析的 JSON，When 导入，Then现有规则完全不变并显示原因。
- Given 文件包含合法与单条非法规则，When 用户确认导入结果，Then合法规则一次写入，非法规则跳过并汇总。

### AC-10 暂停站点

- Given example.com 有永久规则，When 用户暂停该站点，Then所有已打开 example.com 标签恢复原始标题且后续 title 变化不被守护；重新启用后规则重新应用。

### AC-11 重启与清理

- Given 永久规则和当前标签 override 同时存在，When 浏览器重启，Then永久规则恢复；当前标签 override 不得被提升为永久规则。
- Given tab 被关闭，Then其 session override 被删除，不影响随后新建或 tabId 被复用的标签。

## 11. 测试要求

### 11.1 自动化测试

- Domain 单元测试：URL 规范化、host 边界、优先级、重复规则、禁用规则、paused host。
- Storage 单元测试：schema 校验、迁移、导入冲突、原子提交、上限。
- Content 单元/组件测试：无 title、页面 mutation、插件 mutation 去环、原始标题更新。
- 浏览器 E2E：三种模式、刷新/导航、同 URL 多 tab、快捷键、暂停站点、规则编辑/删除、service worker 重启。

### 11.2 手工兼容矩阵

至少覆盖：

- 静态网页。
- Gmail 或等价的频繁 title 更新测试页。
- WhatsApp Web 或等价 SPA 压力页。
- Notion/Google Docs 等 SPA。
- 浏览器 PDF 查看器。
- chrome://、Web Store、新标签页。
- Chrome 稳定版；Edge/Brave 冒烟。
- 100 标签压力场景。

## 12. 发布门槛

只有满足以下条件才可标记 MVP 可发布：

- 所有“必须”需求完成，AC-01 至 AC-11 通过。
- 自动化测试、类型检查、lint 和生产构建通过。
- Chrome 稳定版完整手工矩阵通过；Edge/Brave 核心流程无阻塞问题。
- 30 秒动态标题压力测试无自激循环、持续 CPU 或标签崩溃。
- 权限已逐项解释，未使用远程代码，隐私政策与实际行为一致。
- 安装包可从全新浏览器 profile 安装、完成 onboarding、创建/导出/导入规则。
- 已知限制写入 README 和商店描述。

## 13. MVP 后候选项

按验证信号而非预设承诺排序：

1. URL 前缀与正则规则、冲突可视化。
2. Emoji/上传 favicon，并支持独立清除。
3. 批量标签编辑与工作集。
4. 可选 chrome.storage.sync 或端到端加密同步。
5. Firefox 移植。
6. 高级诊断与用户明确同意的匿名性能遥测。
7. Safari 版本。
8. AI 标题建议。

## 14. 开发前待确认事项

以下事项不阻塞规格定稿，但应在编码首日做技术 spike 并记录决策：

1. Chromium 当前版本中，通过 contextMenus 点击后打开 popup/side panel 的最佳可用交互；若不能直接打开 popup，采用独立小窗口或页面内安全输入框。
2. activeTab + optional_host_permissions 能否同时满足永久规则自动应用；以最小权限为目标验证。
3. PDF 查看器和 file:// 的可注入边界，不把浏览器限制承诺成产品能力。
4. Page override 对 hash change、history navigation、BFCache 恢复的统一“页面边界”判定。
5. chrome.storage.session 在支持基线中的生命周期与访问权限；不得让 worker 回收丢失用户仍在使用的 tab override。
6. 默认快捷键在 Chrome、Edge、Brave 和 macOS/Windows/Linux 上的冲突情况。

## 15. 成功指标（发布后验证，不属于功能验收）

- 改名操作成功率 ≥99.5%。
- 无已知可复现的扩展引发标签崩溃。
- 4–6 周自然安装 ≥500。
- 周留存 ≥25%。
- 至少 20 位用户每周完成 5 次以上改名。
- Page/Tab/Permanent 三种模式均有真实使用，且用户能正确理解来源和撤销方式。
