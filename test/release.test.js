"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var outputRoot = path.resolve(root, "..");
var releaseDir = path.join(outputRoot, "wechat-mini-garden-match-release");
var releaseZip = path.join(outputRoot, "wechat-mini-garden-match-release.zip");
var fullZip = path.join(outputRoot, "wechat-mini-garden-match.zip");

function walk(dir, base, files) {
  fs.readdirSync(dir).forEach(function (name) {
    var full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, files);
    else files.push(path.relative(base, full).replace(/\\/g, "/"));
  });
}

assert.ok(fs.existsSync(releaseDir), "release directory missing");
assert.ok(fs.existsSync(releaseZip), "release zip missing");
assert.ok(fs.existsSync(fullZip), "full zip missing");

var files = [];
walk(releaseDir, releaseDir, files);
files.sort();
assert.deepStrictEqual(files, [
  "game.js",
  "game.json",
  "js/logic.js",
  "project.config.json"
], "release should contain only runtime files");

var project = JSON.parse(fs.readFileSync(path.join(releaseDir, "project.config.json"), "utf8"));
assert.strictEqual(project.compileType, "game", "release must be a mini game");
assert.strictEqual(project.appid, "touristappid", "release should import without a private appid");
assert.strictEqual(project.setting.packNpmManually, false, "release should not require npm build");

var game = JSON.parse(fs.readFileSync(path.join(releaseDir, "game.json"), "utf8"));
assert.strictEqual(game.deviceOrientation, "portrait", "game should be portrait");

var gameSource = fs.readFileSync(path.join(releaseDir, "game.js"), "utf8");
assert.ok(gameSource.indexOf("花房订单") !== -1, "release should contain new game identity");
assert.strictEqual(gameSource.indexOf("霓虹贪吃蛇"), -1, "old game content should not leak");
assert.strictEqual(gameSource.indexOf("合成 2048"), -1, "old game content should not leak");
assert.strictEqual(gameSource.indexOf("极速躲避"), -1, "old game content should not leak");
assert.strictEqual(gameSource.indexOf("http://"), -1, "release should not use remote assets");
assert.strictEqual(gameSource.indexOf("https://"), -1, "release should not use remote assets");

console.log("release tests passed");
