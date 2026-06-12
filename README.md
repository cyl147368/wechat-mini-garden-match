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
