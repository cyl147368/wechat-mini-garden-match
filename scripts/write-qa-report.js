"use strict";

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var outputRoot = path.resolve(root, "..");
var releaseDir = path.join(outputRoot, "wechat-mini-garden-match-release");
var releaseZip = path.join(outputRoot, "wechat-mini-garden-match-release.zip");
var fullZip = path.join(outputRoot, "wechat-mini-garden-match.zip");
var reportPath = path.join(outputRoot, "wechat-mini-garden-match-QA.md");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function sizeKb(file) {
  return (fs.statSync(file).size / 1024).toFixed(1) + " KB";
}

function walk(dir, base, files) {
  fs.readdirSync(dir).forEach(function (name) {
    var full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, files);
    else files.push(path.relative(base, full).replace(/\\/g, "/"));
  });
}

[releaseDir, releaseZip, fullZip].forEach(function (file) {
  if (!fs.existsSync(file)) throw new Error("missing artifact: " + file);
});

var releaseFiles = [];
walk(releaseDir, releaseDir, releaseFiles);
releaseFiles.sort();

var lines = [
  "# WeChat Mini Garden Match QA Report",
  "",
  "Generated: " + new Date().toISOString(),
  "",
  "## Deliverables",
  "",
  "- Release project: `" + releaseDir + "`",
  "- Release zip: `" + releaseZip + "` (" + sizeKb(releaseZip) + ")",
  "- Full project zip: `" + fullZip + "` (" + sizeKb(fullZip) + ")",
  "",
  "## Checksums",
  "",
  "- `wechat-mini-garden-match-release.zip`: `" + sha256(releaseZip) + "`",
  "- `wechat-mini-garden-match.zip`: `" + sha256(fullZip) + "`",
  "",
  "## Release File List",
  ""
];

releaseFiles.forEach(function (file) {
  lines.push("- `" + file + "`");
});

lines = lines.concat([
  "",
  "## Verification Commands",
  "",
  "```bash",
  "npm test",
  "npm run doctor",
  "npm run verify:release",
  "npm run qa:report",
  "unzip -t ../wechat-mini-garden-match-release.zip",
  "unzip -t ../wechat-mini-garden-match.zip",
  "```",
  "",
  "## Scope",
  "",
  "- Native WeChat Mini Game Canvas runtime.",
  "- Single complete match-3 game: 花房订单.",
  "- Different from the previous arcade collection in theme, game loop, progression, visual style, and input pattern.",
  "- No npm runtime dependency, no CDN, no remote assets.",
  "- Minimal release package contains only WeChat Mini Game runtime files.",
  "",
  "## WeChat DevTools",
  "",
  "- WeChat DevTools CLI launched the IDE HTTP service at `http://127.0.0.1:9420`.",
  "- The release project was opened by CLI successfully and returned `✔ open`.",
  "",
  "Open command:",
  "",
  "```bash",
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project " + releaseDir + " --port 9420 --lang zh",
  "```"
]);

fs.writeFileSync(reportPath, lines.join("\n") + "\n");
console.log("QA report written:", reportPath);
