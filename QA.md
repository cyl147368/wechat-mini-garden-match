# WeChat Mini Garden Match QA Report

Generated: 2026-06-12T09:20:48.931Z

## Deliverables

- Release project: `/Users/chenyulin/Documents/Codex/2026-06-11/hi-2/outputs/wechat-mini-garden-match-release`
- Release zip: `/Users/chenyulin/Documents/Codex/2026-06-11/hi-2/outputs/wechat-mini-garden-match-release.zip` (10.5 KB)
- Full project zip: `/Users/chenyulin/Documents/Codex/2026-06-11/hi-2/outputs/wechat-mini-garden-match.zip` (20.3 KB)

## Checksums

- `wechat-mini-garden-match-release.zip`: `fba69a64f6400c0dcf2d2f7a2766cf434bdd02592f6aa0fb029752aebaaf2cc2`
- `wechat-mini-garden-match.zip`: `2b7154b43cd7817d9e4fb5f154de50161cd1e8229334105239addb372485cd42`

## Release File List

- `game.js`
- `game.json`
- `js/logic.js`
- `project.config.json`

## Verification Commands

```bash
npm test
npm run doctor
npm run verify:release
npm run qa:report
unzip -t ../wechat-mini-garden-match-release.zip
unzip -t ../wechat-mini-garden-match.zip
```

## Scope

- Native WeChat Mini Game Canvas runtime.
- Single complete match-3 game: 花房订单.
- Different from the previous arcade collection in theme, game loop, progression, visual style, and input pattern.
- No npm runtime dependency, no CDN, no remote assets.
- Minimal release package contains only WeChat Mini Game runtime files.

## WeChat DevTools

- WeChat DevTools CLI launched the IDE HTTP service at `http://127.0.0.1:9420`.
- The release project was opened by CLI successfully and returned `✔ open`.

Open command:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/chenyulin/Documents/Codex/2026-06-11/hi-2/outputs/wechat-mini-garden-match-release --port 9420 --lang zh
```
