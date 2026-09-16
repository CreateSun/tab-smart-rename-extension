# Tab Rename

一个本地优先、可预测的 Chromium 标签页重命名扩展。当前实现基于 `REQUIREMENTS.md` 的 MVP 基线。

## 本地开发

运行 `npm install`，再运行 `npm run check`。随后在 Chrome 的 `chrome://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，加载本项目的 `dist/`。

## 权限

- `activeTab`：用户主动打开扩展时访问当前标签。
- `scripting`：主动操作时按需注入标题守护脚本。
- `storage`：保存永久规则、设置和当前标签会话命名。
- `contextMenus`：提供网页右键入口。
- `tabs`：读取标签状态并重新应用受影响规则。
- 可选网站权限：只有用户明确授权后，永久规则才能在导航和已打开匹配页面上自动应用。

扩展不包含远程代码、网络请求或遥测。详见 `PRIVACY.md`。

## 已知平台限制

`chrome://`、Chrome Web Store、新标签页、其他扩展页面等受保护页面无法注入。`file://` 取决于用户单独授予的文件 URL 权限；MVP 不主动请求。PDF 查看器行为取决于浏览器版本和查看器实现。
