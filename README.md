# 花房订单

一个原生微信小游戏 Canvas 项目。玩法是关卡制三消：玩家交换相邻花格，三连或更多会收集材料，完成当前花房订单即可进入下一关。整体视觉是柔和花园工坊风格。

## 玩法

- 滑动或点击两个相邻花格进行交换。
- 只有形成三连或更多时才会消耗步数。
- 消除后会自动下落补格，并支持连锁消除。
- 完成订单目标后点“下一关”。
- 步数用完后点“重来”。

## 打开

在仓库根目录运行：

```bash
npm run build:release
npm run open:devtools
```

也可以手动导入构建后的 sibling release 目录：

```text
../wechat-mini-garden-match-release
```

## 微信登录与云存档

- 将 `project.config.json` 里的 `appid` 从 `touristappid` 改成你的真实小游戏 AppID；游客号只能离线体验，不能使用云开发。
- 在微信开发者工具开通云开发并创建环境，把环境 ID 填入 `js/cloud-config.js` 的 `envId`。
- 上传部署 `cloudfunctions/playerState` 云函数，并在云端安装 `wx-server-sdk`。
- 创建 `game_player_state` 数据库集合，权限建议设为“仅创建者可读写”。
- 画面右上角的“微信登录/离线存档”入口由用户点击触发 `wx.getUserProfile`，云函数使用 `getWXContext().OPENID` 隔离用户存档；`wx.login` code 会随云请求上送，云端只保存摘要。
- 如果 AppID、env 或云函数未配置，画面会显示“离线存档”，进度只保存在本机，不再静默伪装成联网。

## 验证

```bash
npm test
npm run doctor
npm run verify:release
npm run qa:report
unzip -t ../wechat-mini-garden-match-release.zip
unzip -t ../wechat-mini-garden-match.zip
```

验证记录见 `QA.md`。
