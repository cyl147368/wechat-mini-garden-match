"use strict";

var Logic = require("./js/logic");

var STORAGE_KEY = "wechat-mini-garden-match-state-v1";
var PI2 = Math.PI * 2;

var TILE_COLORS = {
  blossom: { fill: "#F7A6B8", shade: "#E85D83", ink: "#7D2941" },
  leaf: { fill: "#8BCB88", shade: "#3D9B68", ink: "#23553A" },
  sun: { fill: "#FFD66E", shade: "#E6A627", ink: "#765117" },
  water: { fill: "#82C7EA", shade: "#2C91C2", ink: "#164D6A" },
  berry: { fill: "#B69AE8", shade: "#7D5BC9", ink: "#493072" }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getWx() {
  return typeof wx !== "undefined" ? wx : null;
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch (err) {
    return fallback;
  }
}

function getSystemInfo(wxApi) {
  var info = wxApi && wxApi.getSystemInfoSync ? safe(function () {
    return wxApi.getSystemInfoSync();
  }, null) : null;
  info = info || {};
  var width = Number(info.windowWidth) || 375;
  var height = Number(info.windowHeight) || 667;
  var dpr = Number(info.pixelRatio) || 1;
  return {
    width: clamp(width, 240, 1200),
    height: clamp(height, 320, 1600),
    dpr: clamp(dpr, 1, 4)
  };
}

function createCanvas(wxApi) {
  if (wxApi && wxApi.createCanvas) return wxApi.createCanvas();
  if (typeof document !== "undefined" && document.createElement) {
    var domCanvas = document.createElement("canvas");
    document.body.appendChild(domCanvas);
    return domCanvas;
  }
  return {
    width: 375,
    height: 667,
    getContext: function () {
      return null;
    }
  };
}

function call(ctx, name, args) {
  if (ctx && typeof ctx[name] === "function") return ctx[name].apply(ctx, args || []);
  return undefined;
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  call(ctx, "beginPath");
  if (ctx && typeof ctx.moveTo === "function" && typeof ctx.lineTo === "function" && typeof ctx.quadraticCurveTo === "function") {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  } else {
    call(ctx, "rect", [x, y, w, h]);
  }
  call(ctx, "closePath");
}

function fillRounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  call(ctx, "fill");
}

function strokeRounded(ctx, x, y, w, h, r, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 1;
  roundedRect(ctx, x, y, w, h, r);
  call(ctx, "stroke");
}

function drawCircle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  call(ctx, "beginPath");
  if (ctx && typeof ctx.arc === "function") ctx.arc(x, y, radius, 0, PI2);
  else call(ctx, "rect", [x - radius, y - radius, radius * 2, radius * 2]);
  call(ctx, "fill");
}

function drawOval(ctx, x, y, rx, ry, color, rotation) {
  ctx.fillStyle = color;
  call(ctx, "save");
  call(ctx, "translate", [x, y]);
  call(ctx, "rotate", [rotation || 0]);
  call(ctx, "scale", [rx, ry]);
  call(ctx, "beginPath");
  if (ctx && typeof ctx.arc === "function") ctx.arc(0, 0, 1, 0, PI2);
  else call(ctx, "rect", [-1, -1, 2, 2]);
  call(ctx, "fill");
  call(ctx, "restore");
}

function setFont(ctx, size, weight) {
  ctx.font = (weight ? weight + " " : "") + Math.round(size) + "px sans-serif";
}

function textWidth(ctx, text) {
  if (ctx && typeof ctx.measureText === "function") {
    return ctx.measureText(String(text)).width;
  }
  return String(text).length * 10;
}

function fitText(ctx, text, maxWidth, size, minSize) {
  var out = clamp(size, minSize || 10, 80);
  setFont(ctx, out, "600");
  while (out > (minSize || 10) && textWidth(ctx, text) > maxWidth) {
    out -= 1;
    setFont(ctx, out, "600");
  }
  return out;
}

function drawText(ctx, text, x, y, options) {
  options = options || {};
  var size = fitText(ctx, text, options.maxWidth || 9999, options.size || 16, options.minSize || 10);
  setFont(ctx, size, options.weight || "600");
  ctx.fillStyle = options.color || "#263629";
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = options.baseline || "middle";
  call(ctx, "fillText", [String(text), x, y]);
}

function makeBackground(ctx, width, height) {
  var gradient = ctx && typeof ctx.createLinearGradient === "function" ?
    ctx.createLinearGradient(0, 0, width, height) :
    null;
  if (gradient && gradient.addColorStop) {
    gradient.addColorStop(0, "#F8F5EC");
    gradient.addColorStop(0.42, "#EAF5F1");
    gradient.addColorStop(1, "#E8F1FF");
    return gradient;
  }
  return "#F3F2EA";
}

function computeLayout(width, height) {
  var pad = clamp(width * 0.045, 14, 24);
  var top = clamp(height * 0.105, 66, 96);
  var orderH = clamp(height * 0.09, 58, 82);
  var boardSize = Math.min(width - pad * 2, height - top - orderH - 104);
  boardSize = clamp(boardSize, 220, 440);
  var boardX = (width - boardSize) / 2;
  var boardY = top + orderH + 4;
  var buttonY = boardY + boardSize + clamp(height * 0.025, 12, 24);
  var buttonH = clamp(height * 0.06, 40, 52);
  var gap = 10;
  var buttonW = (width - pad * 2 - gap * 2) / 3;
  return {
    width: width,
    height: height,
    pad: pad,
    top: top,
    orderY: top - 4,
    orderH: orderH,
    boardX: boardX,
    boardY: boardY,
    boardSize: boardSize,
    cell: boardSize / Logic.BOARD_SIZE,
    buttons: [
      { id: "restart", label: "重来", x: pad, y: buttonY, w: buttonW, h: buttonH },
      { id: "hint", label: "提示", x: pad + buttonW + gap, y: buttonY, w: buttonW, h: buttonH },
      { id: "next", label: "下一关", x: pad + (buttonW + gap) * 2, y: buttonY, w: buttonW, h: buttonH }
    ]
  };
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.y >= rect.y && point.x <= rect.x + rect.w && point.y <= rect.y + rect.h;
}

function cellFromPoint(layout, x, y) {
  if (x < layout.boardX || y < layout.boardY || x >= layout.boardX + layout.boardSize || y >= layout.boardY + layout.boardSize) {
    return null;
  }
  return {
    x: Math.floor((x - layout.boardX) / layout.cell),
    y: Math.floor((y - layout.boardY) / layout.cell)
  };
}

function buttonFromPoint(layout, x, y) {
  var point = { x: x, y: y };
  for (var i = 0; i < layout.buttons.length; i += 1) {
    if (pointInRect(point, layout.buttons[i])) return layout.buttons[i].id;
  }
  return null;
}

function drawHeader(ctx, state, layout) {
  var level = Logic.LEVELS[state.levelIndex % Logic.LEVELS.length];
  drawText(ctx, "花房订单", layout.pad, 30, { size: 24, color: "#263629", maxWidth: layout.width * 0.42, weight: "700" });
  drawText(ctx, level.title, layout.pad, 58, { size: 14, color: "#66756B", maxWidth: layout.width * 0.48, weight: "500" });

  var pillW = clamp(layout.width * 0.22, 76, 104);
  fillRounded(ctx, layout.width - layout.pad - pillW, 18, pillW, 34, 17, "#FFFFFF");
  strokeRounded(ctx, layout.width - layout.pad - pillW, 18, pillW, 34, 17, "#D8E2D9", 1);
  drawText(ctx, "步数 " + state.movesLeft, layout.width - layout.pad - pillW / 2, 35, {
    size: 15,
    color: "#2E684D",
    align: "center",
    maxWidth: pillW - 14
  });

  drawText(ctx, "分数 " + state.score, layout.width - layout.pad, 62, {
    size: 13,
    color: "#66756B",
    align: "right",
    maxWidth: layout.width * 0.32,
    weight: "500"
  });
}

function orderEntries(orders) {
  return Object.keys(orders).filter(function (key) {
    return orders[key] > 0;
  });
}

function drawOrders(ctx, state, layout) {
  var x = layout.pad;
  var y = layout.orderY + 10;
  var entries = orderEntries(state.orders);
  if (!entries.length) entries = ["done"];

  fillRounded(ctx, layout.pad, layout.orderY, layout.width - layout.pad * 2, layout.orderH, 8, "rgba(255,255,255,0.78)");
  strokeRounded(ctx, layout.pad, layout.orderY, layout.width - layout.pad * 2, layout.orderH, 8, "#D7E2DA", 1);
  drawText(ctx, "订单", x + 14, y + 14, { size: 14, color: "#526A58", maxWidth: 56 });

  var chipX = x + 70;
  var chipY = y;
  entries.forEach(function (type) {
    var label = type === "done" ? "已完成" : Logic.TYPE_LABELS[type] + " " + state.orders[type];
    var chipW = clamp(textWidth(ctx, label) + 34, 72, 118);
    if (chipX + chipW > layout.width - layout.pad - 8) {
      chipX = x + 14;
      chipY += 32;
    }
    var color = type === "done" ? { fill: "#E7F3DE", shade: "#6EA96A", ink: "#3F6840" } : TILE_COLORS[type];
    fillRounded(ctx, chipX, chipY, chipW, 26, 7, color.fill);
    drawCircle(ctx, chipX + 14, chipY + 13, 5, color.shade);
    drawText(ctx, label, chipX + 26, chipY + 13, { size: 12, color: color.ink, maxWidth: chipW - 32, weight: "700" });
    chipX += chipW + 8;
  });
}

function drawTileIcon(ctx, type, cx, cy, size) {
  var color = TILE_COLORS[type] || TILE_COLORS.blossom;
  if (type === "blossom") {
    for (var i = 0; i < 6; i += 1) {
      var angle = i * Math.PI / 3;
      drawOval(ctx, cx + Math.cos(angle) * size * 0.16, cy + Math.sin(angle) * size * 0.16, size * 0.14, size * 0.22, color.fill, angle);
    }
    drawCircle(ctx, cx, cy, size * 0.11, "#FFE7A3");
  } else if (type === "leaf") {
    drawOval(ctx, cx - size * 0.06, cy, size * 0.19, size * 0.31, color.fill, -0.65);
    drawOval(ctx, cx + size * 0.12, cy + size * 0.02, size * 0.16, size * 0.27, "#A9DE94", 0.7);
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1.5;
    call(ctx, "beginPath");
    call(ctx, "moveTo", [cx - size * 0.2, cy + size * 0.18]);
    call(ctx, "lineTo", [cx + size * 0.24, cy - size * 0.18]);
    call(ctx, "stroke");
  } else if (type === "sun") {
    for (var r = 0; r < 8; r += 1) {
      var ray = r * Math.PI / 4;
      ctx.strokeStyle = color.shade;
      ctx.lineWidth = 2;
      call(ctx, "beginPath");
      call(ctx, "moveTo", [cx + Math.cos(ray) * size * 0.22, cy + Math.sin(ray) * size * 0.22]);
      call(ctx, "lineTo", [cx + Math.cos(ray) * size * 0.34, cy + Math.sin(ray) * size * 0.34]);
      call(ctx, "stroke");
    }
    drawCircle(ctx, cx, cy, size * 0.22, color.fill);
    drawCircle(ctx, cx - size * 0.06, cy - size * 0.06, size * 0.06, "#FFF4B8");
  } else if (type === "water") {
    ctx.fillStyle = color.fill;
    call(ctx, "beginPath");
    if (ctx && typeof ctx.moveTo === "function" && typeof ctx.quadraticCurveTo === "function") {
      ctx.moveTo(cx, cy - size * 0.33);
      ctx.quadraticCurveTo(cx + size * 0.29, cy, cx + size * 0.16, cy + size * 0.22);
      ctx.quadraticCurveTo(cx, cy + size * 0.43, cx - size * 0.16, cy + size * 0.22);
      ctx.quadraticCurveTo(cx - size * 0.29, cy, cx, cy - size * 0.33);
    } else {
      call(ctx, "rect", [cx - size * 0.17, cy - size * 0.18, size * 0.34, size * 0.42]);
    }
    call(ctx, "fill");
    drawCircle(ctx, cx + size * 0.08, cy - size * 0.03, size * 0.05, "#DDF7FF");
  } else {
    drawCircle(ctx, cx - size * 0.1, cy - size * 0.06, size * 0.13, color.fill);
    drawCircle(ctx, cx + size * 0.08, cy - size * 0.1, size * 0.13, "#C9B4F0");
    drawCircle(ctx, cx + size * 0.02, cy + size * 0.1, size * 0.14, color.shade);
    drawOval(ctx, cx, cy - size * 0.29, size * 0.07, size * 0.15, "#74AF72", -0.6);
  }
}

function drawBoard(ctx, state, layout, selected, hint) {
  fillRounded(ctx, layout.boardX - 8, layout.boardY - 8, layout.boardSize + 16, layout.boardSize + 16, 8, "#F7FBF4");
  strokeRounded(ctx, layout.boardX - 8, layout.boardY - 8, layout.boardSize + 16, layout.boardSize + 16, 8, "#C9D8CB", 2);

  for (var y = 0; y < Logic.BOARD_SIZE; y += 1) {
    for (var x = 0; x < Logic.BOARD_SIZE; x += 1) {
      var px = layout.boardX + x * layout.cell;
      var py = layout.boardY + y * layout.cell;
      var gap = clamp(layout.cell * 0.08, 3, 6);
      var tileX = px + gap;
      var tileY = py + gap;
      var tileSize = layout.cell - gap * 2;
      var type = state.board[y][x];
      var color = TILE_COLORS[type] || TILE_COLORS.blossom;
      fillRounded(ctx, tileX, tileY, tileSize, tileSize, 7, "#FFFFFF");
      strokeRounded(ctx, tileX, tileY, tileSize, tileSize, 7, "#E0E9DF", 1);
      drawTileIcon(ctx, type, px + layout.cell / 2, py + layout.cell / 2, layout.cell);
      drawCircle(ctx, tileX + tileSize - 7, tileY + 7, clamp(layout.cell * 0.05, 2, 4), color.shade);
    }
  }

  if (selected) {
    strokeRounded(ctx, layout.boardX + selected.x * layout.cell + 3, layout.boardY + selected.y * layout.cell + 3, layout.cell - 6, layout.cell - 6, 8, "#315B44", 3);
  }

  if (hint && hint.from && hint.to) {
    [hint.from, hint.to].forEach(function (cell) {
      strokeRounded(ctx, layout.boardX + cell.x * layout.cell + 6, layout.boardY + cell.y * layout.cell + 6, layout.cell - 12, layout.cell - 12, 8, "#F1A93B", 3);
    });
  }
}

function drawButtons(ctx, state, layout) {
  layout.buttons.forEach(function (button) {
    var disabled = button.id === "next" && state.phase !== "won";
    fillRounded(ctx, button.x, button.y, button.w, button.h, 8, disabled ? "#E5E8E2" : "#FFFFFF");
    strokeRounded(ctx, button.x, button.y, button.w, button.h, 8, disabled ? "#D5D8D2" : "#BBD1C0", 1.5);
    drawText(ctx, button.label, button.x + button.w / 2, button.y + button.h / 2, {
      size: 15,
      color: disabled ? "#9AA19A" : "#315B44",
      align: "center",
      maxWidth: button.w - 14,
      weight: "700"
    });
  });
}

function drawOverlay(ctx, state, layout) {
  if (state.phase === "playing") return;
  var w = layout.width - layout.pad * 2;
  var h = 112;
  var x = layout.pad;
  var y = layout.boardY + layout.boardSize / 2 - h / 2;
  fillRounded(ctx, x, y, w, h, 8, "rgba(255,255,255,0.94)");
  strokeRounded(ctx, x, y, w, h, 8, "#BFD3C6", 2);
  var title = state.phase === "won" ? "订单完成" : "步数用完";
  var copy = state.phase === "won" ? "点下一关，继续新的花房委托" : "点重来，重新安排这一单";
  drawText(ctx, title, layout.width / 2, y + 36, { size: 24, color: "#315B44", align: "center", maxWidth: w - 32, weight: "800" });
  drawText(ctx, copy, layout.width / 2, y + 72, { size: 14, color: "#66756B", align: "center", maxWidth: w - 32, weight: "500" });
}

function render(ctx, state, layout, ui) {
  ctx.fillStyle = makeBackground(ctx, layout.width, layout.height);
  call(ctx, "fillRect", [0, 0, layout.width, layout.height]);
  drawHeader(ctx, state, layout);
  drawOrders(ctx, state, layout);
  drawBoard(ctx, state, layout, ui && ui.selected, ui && ui.hint);
  drawText(ctx, state.message || "完成花房订单", layout.width / 2, layout.boardY + layout.boardSize + 9, {
    size: 13,
    color: "#66756B",
    align: "center",
    maxWidth: layout.width - layout.pad * 2,
    weight: "500"
  });
  drawButtons(ctx, state, layout);
  drawOverlay(ctx, state, layout);
}

function extractTouch(event) {
  var touch = event && event.changedTouches && event.changedTouches[0] || event && event.touches && event.touches[0] || event;
  if (!touch) return null;
  var x = Number(touch.clientX);
  var y = Number(touch.clientY);
  if (!isFinite(x) || !isFinite(y)) return null;
  return { x: x, y: y };
}

function saveState(wxApi, state) {
  if (!wxApi || !wxApi.setStorageSync) return;
  safe(function () {
    wxApi.setStorageSync(STORAGE_KEY, state);
  }, null);
}

function loadState(wxApi) {
  if (!wxApi || !wxApi.getStorageSync) return Logic.startLevel(0);
  var stored = safe(function () {
    return wxApi.getStorageSync(STORAGE_KEY);
  }, null);
  return Logic.sanitizeState(stored);
}

function directionFromDelta(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function createRuntime(options) {
  options = options || {};
  var wxApi = options.wx || getWx();
  var canvas = options.canvas || createCanvas(wxApi);
  var ctx = canvas.getContext && canvas.getContext("2d");
  var system = getSystemInfo(wxApi);
  var runtime = {
    wx: wxApi,
    canvas: canvas,
    ctx: ctx,
    state: options.state ? Logic.sanitizeState(options.state) : loadState(wxApi),
    layout: computeLayout(system.width, system.height),
    selected: null,
    hint: null,
    touchStart: null
  };

  function resize() {
    system = getSystemInfo(wxApi);
    canvas.width = Math.floor(system.width * system.dpr);
    canvas.height = Math.floor(system.height * system.dpr);
    if (canvas.style) {
      canvas.style.width = system.width + "px";
      canvas.style.height = system.height + "px";
    }
    ctx = canvas.getContext && canvas.getContext("2d");
    runtime.ctx = ctx;
    if (ctx && typeof ctx.setTransform === "function") ctx.setTransform(system.dpr, 0, 0, system.dpr, 0, 0);
    else if (ctx && typeof ctx.scale === "function") ctx.scale(system.dpr, system.dpr);
    runtime.layout = computeLayout(system.width, system.height);
  }

  function redraw() {
    if (!runtime.ctx) return;
    render(runtime.ctx, runtime.state, runtime.layout, { selected: runtime.selected, hint: runtime.hint });
  }

  function commit(nextState) {
    runtime.state = Logic.sanitizeState(nextState);
    runtime.selected = null;
    runtime.hint = null;
    saveState(wxApi, runtime.state);
    redraw();
  }

  function onButton(id) {
    if (id === "restart") commit(Logic.restartLevel(runtime.state));
    else if (id === "next" && runtime.state.phase === "won") commit(Logic.nextLevel(runtime.state));
    else if (id === "hint") {
      runtime.hint = Logic.findHint(Logic.cloneState(runtime.state).board);
      runtime.state.message = runtime.hint ? "提示格已标出" : "花盘重新整理好了";
      if (!runtime.hint) runtime.state = Logic.sanitizeState(runtime.state);
      redraw();
    }
  }

  function onTap(point) {
    var button = buttonFromPoint(runtime.layout, point.x, point.y);
    if (button) {
      onButton(button);
      return;
    }

    var cell = cellFromPoint(runtime.layout, point.x, point.y);
    if (!cell) {
      runtime.selected = null;
      redraw();
      return;
    }
    if (runtime.selected && Math.abs(runtime.selected.x - cell.x) + Math.abs(runtime.selected.y - cell.y) === 1) {
      commit(Logic.attemptSwap(runtime.state, runtime.selected, cell));
    } else {
      runtime.selected = cell;
      runtime.hint = null;
      runtime.state.message = "选择相邻花格交换";
      redraw();
    }
  }

  function onTouchStart(event) {
    var point = extractTouch(event);
    if (!point) return;
    runtime.touchStart = {
      point: point,
      cell: cellFromPoint(runtime.layout, point.x, point.y)
    };
  }

  function onTouchEnd(event) {
    var point = extractTouch(event);
    if (!point) return;
    var start = runtime.touchStart;
    runtime.touchStart = null;
    if (start && start.cell) {
      var direction = directionFromDelta(point.x - start.point.x, point.y - start.point.y);
      if (direction) {
        commit(Logic.moveByDirection(runtime.state, start.cell, direction));
        return;
      }
    }
    onTap(point);
  }

  function bind() {
    if (wxApi && wxApi.onTouchStart && wxApi.onTouchEnd) {
      wxApi.onTouchStart(onTouchStart);
      wxApi.onTouchEnd(onTouchEnd);
    } else if (canvas && canvas.addEventListener) {
      canvas.addEventListener("pointerdown", onTouchStart);
      canvas.addEventListener("pointerup", onTouchEnd);
    }
    if (wxApi && wxApi.onHide) wxApi.onHide(function () { saveState(wxApi, runtime.state); });
    if (wxApi && wxApi.onShow) wxApi.onShow(function () { runtime.state = loadState(wxApi); redraw(); });
    if (wxApi && wxApi.onWindowResize) wxApi.onWindowResize(function () { resize(); redraw(); });
  }

  resize();
  bind();
  redraw();
  runtime.redraw = redraw;
  runtime.tap = onTap;
  runtime.touchStartHandler = onTouchStart;
  runtime.touchEndHandler = onTouchEnd;
  return runtime;
}

if (getWx() && getWx().createCanvas) {
  createRuntime();
}

if (typeof module !== "undefined") {
  module.exports = {
    STORAGE_KEY: STORAGE_KEY,
    computeLayout: computeLayout,
    cellFromPoint: cellFromPoint,
    buttonFromPoint: buttonFromPoint,
    fitText: fitText,
    render: render,
    createRuntime: createRuntime
  };
}
