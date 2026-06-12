"use strict";

var assert = require("assert");
var Logic = require("../js/logic");
var Game = require("../game");

function makeContext() {
  var ctx = {
    calls: [],
    fillStyle: "",
    strokeStyle: "",
    font: "",
    lineWidth: 1,
    textAlign: "left",
    textBaseline: "alphabetic",
    beginPath: function () { this.calls.push("beginPath"); },
    closePath: function () { this.calls.push("closePath"); },
    fill: function () { this.calls.push("fill"); },
    stroke: function () { this.calls.push("stroke"); },
    fillRect: function () { this.calls.push("fillRect"); },
    rect: function () { this.calls.push("rect"); },
    moveTo: function () { this.calls.push("moveTo"); },
    lineTo: function () { this.calls.push("lineTo"); },
    quadraticCurveTo: function () { this.calls.push("quadraticCurveTo"); },
    arc: function () { this.calls.push("arc"); },
    save: function () { this.calls.push("save"); },
    restore: function () { this.calls.push("restore"); },
    translate: function () { this.calls.push("translate"); },
    rotate: function () { this.calls.push("rotate"); },
    scale: function () { this.calls.push("scale"); },
    setTransform: function () { this.calls.push("setTransform"); },
    fillText: function () { this.calls.push("fillText"); },
    measureText: function (text) { return { width: String(text).length * 8 }; },
    createLinearGradient: function () {
      return { addColorStop: function () {} };
    }
  };
  return ctx;
}

var ctx = makeContext();
var state = Logic.startLevel(0, 2026);
var layout = Game.computeLayout(375, 667);
Game.render(ctx, state, layout, {});
assert.ok(ctx.calls.indexOf("fillText") !== -1, "render should draw text");
assert.ok(ctx.calls.indexOf("fillRect") !== -1, "render should paint background");

var centerCell = Game.cellFromPoint(layout, layout.boardX + layout.cell / 2, layout.boardY + layout.cell / 2);
assert.deepStrictEqual(centerCell, { x: 0, y: 0 }, "cell hit testing");

var button = layout.buttons[0];
assert.strictEqual(Game.buttonFromPoint(layout, button.x + button.w / 2, button.y + button.h / 2), "restart", "button hit testing");

var storage = null;
var mockCtx = makeContext();
var mockCanvas = {
  width: 0,
  height: 0,
  style: {},
  getContext: function () {
    return mockCtx;
  }
};
var mockWx = {
  createCanvas: function () { return mockCanvas; },
  getSystemInfoSync: function () { return { windowWidth: 360, windowHeight: 640, pixelRatio: 2 }; },
  getStorageSync: function () { return storage; },
  setStorageSync: function (key, value) { storage = value; },
  onTouchStart: function () {},
  onTouchEnd: function () {},
  onHide: function () {},
  onShow: function () {},
  onWindowResize: function () {}
};

var runtime = Game.createRuntime({ wx: mockWx, canvas: mockCanvas, state: state });
assert.strictEqual(mockCanvas.width, 720, "canvas should use device pixel ratio");
assert.strictEqual(mockCanvas.height, 1280, "canvas should use device pixel ratio");
assert.ok(runtime.layout.boardSize > 200, "layout should allocate a playable board");
runtime.tap({ x: runtime.layout.boardX + runtime.layout.cell / 2, y: runtime.layout.boardY + runtime.layout.cell / 2 });
assert.deepStrictEqual(runtime.selected, { x: 0, y: 0 }, "tap should select a board cell");

console.log("render contract tests passed");
