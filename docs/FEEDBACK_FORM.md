# Tally 反馈表单模板

扩展现在会在以下位置打开 `https://tally.so/r/BEK405`（定义在 `src/shared/feedback.ts`）。同一份表单通过 URL 参数区分入口：

| `source` 值 | 出现位置 |
|---|---|
| `uninstall` | 卸载扩展时由 Chrome 打开 |
| `onboarding_footer` | 首次安装的欢迎页底部 |
| `options_footer` | 永久规则页底部 |
| `options_rule_guide` | 规则说明对话框底部 |
| `options_permission` | 权限被拒、规则保存后无法自动应用 |
| `options_import` | 导入失败或存在错误行 |
| `options_rule_test` | 规则测试未命中 |

扩展只附带两个参数，不包含页面标题、URL、规则内容或任何标签名：

```
https://tally.so/r/BEK405?source=options_footer&v=0.1.3
```

---

## 1. 表单基础设置

- **表单名称**：Tab Rename feedback / Tab Rename 反馈
- **状态**：先设私有，发布前用 `Preview` 和手机各走一遍
- **提交后**：显示自定义感谢页（不要自动跳转商店）
- **通知**：开启邮件通知，收件人用专用别名（如 `tabrename+feedback@你的域名`），不要用个人主邮箱
- **数据留存**：在 Tally 后台确认导出方式（CSV / Google Sheets），每月归档一次

## 2. 字段设计

| 顺序 | 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| 1 | `source` | Hidden | — | 由 URL 参数填充，用于区分入口 |
| 2 | `v` | Hidden | — | 扩展版本，便于定位回归问题 |
| 3 | 你刚才想做什么？ | Long text | ✅ | 让用户先讲目标，而不是先讲方案 |
| 4 | 实际发生了什么？ | Long text | ✅ | 期望 vs 实际 |
| 5 | 使用的是哪种命名方式？ | Multiple choice | | 仅当前页面 / 当前标签 / 永久规则 / 不确定 |
| 6 | 涉及哪类页面？ | Multiple choice | | 普通网页 / Chrome 受保护页面 / 本地文件 / PDF / 其他 |
| 7 | 可以联系你吗？ | Email | | 明确写“选填，仅用于追问这个问题” |
| 8 | 其他补充 | Long text | | 截图、复现步骤 |

**不要加**：自动读取当前 URL、标签名、规则内容的字段；也不要要求用户提供账号密码、公司内网地址。第 6 题只问页面类型，不问具体网址。

## 3. 中英文案

**表单说明（英文）**

> Thanks for trying Tab Rename. Tell us what you were trying to do and what happened. We read every reply, but cannot promise a personal response. Please do not paste passwords, private URLs, or other sensitive data.

**表单说明（中文）**

> 感谢使用 Tab Rename。请告诉我们你刚才想做什么、实际发生了什么。每条反馈都会被阅读，但无法保证逐一回复。请不要粘贴密码、内网地址或其他敏感信息。

**Email 字段标签**

- EN: `Can we follow up? (optional, only for this issue)`
- 中文: `可以联系你吗？（选填，仅用于追问这个问题）`

**感谢页**

- EN: `Thanks — your feedback helps us decide what to fix next.`
- 中文: `谢谢，你的反馈会直接影响我们下一步修什么。`

## 4. 隐藏字段配置

1. 在 Tally 表单中插入 **Hidden Fields** 区块。
2. 添加两个字段，名称必须是 `source` 和 `v`。
3. 确认表单允许通过同名 URL 参数预填（Tally 的 Hidden Fields 支持 query 参数；如后台有 prefill 开关，请打开并实测一次）。
4. 用下面两个链接各提交一条测试数据，确认回复里能看到 `source`：
   - `https://tally.so/r/BEK405?source=options_footer&v=0.1.3`
   - `https://tally.so/r/BEK405?source=uninstall&v=0.1.3`

如果 Tally 当前套餐不支持隐藏字段，退一步只在表单里加一个“你从哪里打开这个页面？”的下拉题，让用户自选；但优先用隐藏字段，用户不该回答这种问题。

## 5. 发布前检查

- [ ] 从扩展的四个入口各点击一次，确认打开同一表单且来源正确
- [ ] 手机宽度下表单可填写、按钮可点击
- [ ] 提交通知能到达专用邮箱别名
- [ ] 感谢页不诱导评分、不自动跳转
- [ ] `PRIVACY.md`、商店文案、商店“数据使用”声明均已说明第三方反馈页
- [ ] Chrome Web Store 的 Support URL 指向该表单或一个包含该链接的说明页

## 6. 收到反馈后怎么用

按 `source` 分三组看，不要只看总量：

| 来源组 | 说明什么 |
|---|---|
| `options_permission` / `options_import` / `options_rule_test` | 具体功能卡点，优先修 |
| `options_footer` / `options_rule_guide` | 主动找反馈的用户，需求类信号 |
| `uninstall` | 流失原因，用来验证前两组是否真的解决了问题 |

如果某个入口三个月没有一条反馈，先确认链接是否真的可点，再考虑是否保留。
