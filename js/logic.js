"use strict";

var BOARD_SIZE = 7;
var VERSION = 1;

var TYPES = ["blossom", "leaf", "sun", "water", "berry"];

var TYPE_LABELS = {
  blossom: "花瓣",
  leaf: "绿叶",
  sun: "日光",
  water: "露珠",
  berry: "浆果"
};

var LEVELS = [
  { title: "春日花房", moves: 22, orders: { blossom: 10, leaf: 8 } },
  { title: "晨露温室", moves: 24, orders: { water: 12, blossom: 10, sun: 8 } },
  { title: "午后花圃", moves: 25, orders: { leaf: 14, berry: 12, sun: 10 } },
  { title: "暮色集市", moves: 26, orders: { blossom: 16, water: 14, berry: 12 } },
  { title: "星灯暖棚", moves: 28, orders: { sun: 18, leaf: 16, water: 14, berry: 10 } }
];

function normalizeSeed(seed) {
  var n = Number(seed);
  if (!isFinite(n)) n = 20260612;
  n = Math.floor(Math.abs(n)) >>> 0;
  return n || 1;
}

function makeRng(seed) {
  return { seed: normalizeSeed(seed) };
}

function random(rng) {
  rng.seed = (rng.seed * 1664525 + 1013904223) >>> 0;
  return rng.seed / 4294967296;
}

function randomInt(rng, max) {
  return Math.floor(random(rng) * max);
}

function cloneOrders(orders) {
  var out = {};
  Object.keys(orders || {}).forEach(function (key) {
    out[key] = Math.max(0, Math.floor(Number(orders[key]) || 0));
  });
  return out;
}

function cloneBoard(board) {
  return board.map(function (row) {
    return row.slice();
  });
}

function cloneState(state) {
  return {
    version: VERSION,
    levelIndex: state.levelIndex,
    phase: state.phase,
    movesLeft: state.movesLeft,
    orders: cloneOrders(state.orders),
    board: cloneBoard(state.board),
    score: state.score,
    chain: state.chain,
    rngSeed: normalizeSeed(state.rngSeed),
    message: state.message || "",
    lastClear: state.lastClear ? state.lastClear.slice() : []
  };
}

function inBounds(cell) {
  return !!cell &&
    Math.floor(cell.x) === cell.x &&
    Math.floor(cell.y) === cell.y &&
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < BOARD_SIZE &&
    cell.y < BOARD_SIZE;
}

function areAdjacent(a, b) {
  return inBounds(a) && inBounds(b) && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function isKnownType(type) {
  return TYPES.indexOf(type) !== -1;
}

function chooseType(rng, blocked) {
  var choices = TYPES.filter(function (type) {
    return !blocked[type];
  });
  if (!choices.length) choices = TYPES.slice();
  return choices[randomInt(rng, choices.length)];
}

function createBoardWithoutMatches(rng) {
  var board = [];
  for (var y = 0; y < BOARD_SIZE; y += 1) {
    var row = [];
    for (var x = 0; x < BOARD_SIZE; x += 1) {
      var blocked = {};
      if (x >= 2 && row[x - 1] === row[x - 2]) blocked[row[x - 1]] = true;
      if (y >= 2 && board[y - 1][x] === board[y - 2][x]) blocked[board[y - 1][x]] = true;
      row.push(chooseType(rng, blocked));
    }
    board.push(row);
  }
  return board;
}

function placeGuaranteedMove(board) {
  board[0][0] = "blossom";
  board[0][1] = "leaf";
  board[0][2] = "blossom";
  board[1][1] = "blossom";
  if (BOARD_SIZE > 3) {
    board[1][0] = board[1][0] === "blossom" ? "water" : board[1][0];
    board[1][2] = board[1][2] === "blossom" ? "sun" : board[1][2];
  }
  return board;
}

function createPlayableBoard(rng) {
  var board;
  for (var attempt = 0; attempt < 80; attempt += 1) {
    board = createBoardWithoutMatches(rng);
    if (findMatches(board).cells.length === 0 && hasPossibleMove(board)) return board;
  }
  return placeGuaranteedMove(createBoardWithoutMatches(rng));
}

function cellKey(x, y) {
  return x + ":" + y;
}

function findMatches(board) {
  var groups = [];
  var marked = {};
  var cells = [];

  function addGroup(group) {
    groups.push(group);
    group.forEach(function (cell) {
      var key = cellKey(cell.x, cell.y);
      if (!marked[key]) {
        marked[key] = true;
        cells.push(cell);
      }
    });
  }

  for (var y = 0; y < BOARD_SIZE; y += 1) {
    var runType = null;
    var runStart = 0;
    for (var x = 0; x <= BOARD_SIZE; x += 1) {
      var type = x < BOARD_SIZE ? board[y][x] : null;
      if (type && type === runType) continue;
      if (runType && x - runStart >= 3) {
        var rowGroup = [];
        for (var rx = runStart; rx < x; rx += 1) rowGroup.push({ x: rx, y: y, type: runType });
        addGroup(rowGroup);
      }
      runType = type;
      runStart = x;
    }
  }

  for (var cx = 0; cx < BOARD_SIZE; cx += 1) {
    var colType = null;
    var colStart = 0;
    for (var cy = 0; cy <= BOARD_SIZE; cy += 1) {
      var ctype = cy < BOARD_SIZE ? board[cy][cx] : null;
      if (ctype && ctype === colType) continue;
      if (colType && cy - colStart >= 3) {
        var colGroup = [];
        for (var ry = colStart; ry < cy; ry += 1) colGroup.push({ x: cx, y: ry, type: colType });
        addGroup(colGroup);
      }
      colType = ctype;
      colStart = cy;
    }
  }

  return { cells: cells, groups: groups };
}

function swapCells(board, a, b) {
  var tmp = board[a.y][a.x];
  board[a.y][a.x] = board[b.y][b.x];
  board[b.y][b.x] = tmp;
}

function hasPossibleMove(board) {
  for (var y = 0; y < BOARD_SIZE; y += 1) {
    for (var x = 0; x < BOARD_SIZE; x += 1) {
      var here = { x: x, y: y };
      var right = { x: x + 1, y: y };
      var down = { x: x, y: y + 1 };
      if (inBounds(right)) {
        swapCells(board, here, right);
        if (findMatches(board).cells.length) {
          swapCells(board, here, right);
          return true;
        }
        swapCells(board, here, right);
      }
      if (inBounds(down)) {
        swapCells(board, here, down);
        if (findMatches(board).cells.length) {
          swapCells(board, here, down);
          return true;
        }
        swapCells(board, here, down);
      }
    }
  }
  return false;
}

function findHint(board) {
  for (var y = 0; y < BOARD_SIZE; y += 1) {
    for (var x = 0; x < BOARD_SIZE; x += 1) {
      var here = { x: x, y: y };
      var neighbors = [{ x: x + 1, y: y }, { x: x, y: y + 1 }];
      for (var i = 0; i < neighbors.length; i += 1) {
        var next = neighbors[i];
        if (!inBounds(next)) continue;
        swapCells(board, here, next);
        var matched = findMatches(board).cells.length > 0;
        swapCells(board, here, next);
        if (matched) return { from: here, to: next };
      }
    }
  }
  return null;
}

function makeStateRng(state) {
  var rng = makeRng(state.rngSeed);
  var originalRandom = random;
  rng.next = function () {
    var value = originalRandom(rng);
    state.rngSeed = rng.seed;
    return value;
  };
  return rng;
}

function stateRandomInt(state, max) {
  var rng = makeStateRng(state);
  return Math.floor(rng.next() * max);
}

function stateRandomType(state) {
  return TYPES[stateRandomInt(state, TYPES.length)];
}

function applyGravity(state) {
  var board = state.board;
  for (var x = 0; x < BOARD_SIZE; x += 1) {
    var stack = [];
    for (var y = BOARD_SIZE - 1; y >= 0; y -= 1) {
      if (board[y][x]) stack.push(board[y][x]);
    }
    for (var writeY = BOARD_SIZE - 1; writeY >= 0; writeY -= 1) {
      board[writeY][x] = stack.length ? stack.shift() : stateRandomType(state);
    }
  }
}

function reduceOrders(orders, cells) {
  cells.forEach(function (cell) {
    if (orders[cell.type] > 0) orders[cell.type] = Math.max(0, orders[cell.type] - 1);
  });
}

function countRemainingOrders(orders) {
  return Object.keys(orders || {}).reduce(function (sum, key) {
    return sum + Math.max(0, Math.floor(Number(orders[key]) || 0));
  }, 0);
}

function shuffleBoard(state) {
  var flat = [];
  state.board.forEach(function (row) {
    row.forEach(function (type) {
      flat.push(type);
    });
  });

  for (var attempt = 0; attempt < 120; attempt += 1) {
    for (var i = flat.length - 1; i > 0; i -= 1) {
      var j = stateRandomInt(state, i + 1);
      var tmp = flat[i];
      flat[i] = flat[j];
      flat[j] = tmp;
    }
    var board = [];
    for (var y = 0; y < BOARD_SIZE; y += 1) {
      board.push(flat.slice(y * BOARD_SIZE, (y + 1) * BOARD_SIZE));
    }
    if (!findMatches(board).cells.length && hasPossibleMove(board)) {
      state.board = board;
      return true;
    }
  }

  var rng = makeRng(state.rngSeed);
  state.board = createPlayableBoard(rng);
  state.rngSeed = rng.seed;
  return true;
}

function resolveBoard(state) {
  var totalCleared = 0;
  var chain = 0;
  var lastClear = [];

  for (var safety = 0; safety < 40; safety += 1) {
    var match = findMatches(state.board);
    if (!match.cells.length) break;

    chain += 1;
    totalCleared += match.cells.length;
    lastClear = match.cells.map(function (cell) {
      return { x: cell.x, y: cell.y, type: cell.type };
    });
    reduceOrders(state.orders, match.cells);
    state.score += match.cells.length * (12 + chain * 4) + match.groups.length * 25;

    match.cells.forEach(function (cell) {
      state.board[cell.y][cell.x] = null;
    });
    applyGravity(state);
  }

  state.chain = chain;
  state.lastClear = lastClear;
  if (!hasPossibleMove(state.board)) {
    shuffleBoard(state);
    state.message = "花盘重新整理好了";
  }
  return { totalCleared: totalCleared, chain: chain };
}

function getLevel(levelIndex) {
  return LEVELS[((levelIndex % LEVELS.length) + LEVELS.length) % LEVELS.length];
}

function startLevel(levelIndex, seed) {
  var level = getLevel(levelIndex || 0);
  var rng = makeRng(seed == null ? Date.now() + (levelIndex || 0) * 7919 : seed);
  var board = createPlayableBoard(rng);
  return {
    version: VERSION,
    levelIndex: Math.max(0, Math.floor(levelIndex || 0)),
    phase: "playing",
    movesLeft: level.moves,
    orders: cloneOrders(level.orders),
    board: board,
    score: 0,
    chain: 0,
    rngSeed: rng.seed,
    message: "完成花房订单",
    lastClear: []
  };
}

function restartLevel(state, seed) {
  return startLevel(state && state.levelIndex ? state.levelIndex : 0, seed);
}

function nextLevel(state, seed) {
  return startLevel((state && state.levelIndex ? state.levelIndex : 0) + 1, seed);
}

function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) return false;
  for (var y = 0; y < BOARD_SIZE; y += 1) {
    if (!Array.isArray(board[y]) || board[y].length !== BOARD_SIZE) return false;
    for (var x = 0; x < BOARD_SIZE; x += 1) {
      if (!isKnownType(board[y][x])) return false;
    }
  }
  return true;
}

function sanitizeState(input) {
  if (!input || typeof input !== "object") return startLevel(0, 20260612);
  var levelIndex = Math.max(0, Math.floor(Number(input.levelIndex) || 0));
  var level = getLevel(levelIndex);
  var phase = input.phase === "won" || input.phase === "lost" ? input.phase : "playing";
  var rawMoves = Number(input.movesLeft);
  var movesLeft = isFinite(rawMoves) ? Math.floor(rawMoves) : level.moves;
  movesLeft = Math.max(0, Math.min(99, movesLeft));
  var board = validateBoard(input.board) ? cloneBoard(input.board) : createPlayableBoard(makeRng(input.rngSeed));
  var orders = cloneOrders(input.orders);
  if (!Object.keys(orders).length) orders = cloneOrders(level.orders);
  return {
    version: VERSION,
    levelIndex: levelIndex,
    phase: phase,
    movesLeft: movesLeft,
    orders: orders,
    board: board,
    score: Math.max(0, Math.floor(Number(input.score) || 0)),
    chain: Math.max(0, Math.floor(Number(input.chain) || 0)),
    rngSeed: normalizeSeed(input.rngSeed),
    message: String(input.message || "继续花房订单").slice(0, 40),
    lastClear: []
  };
}

function completeOrders(state) {
  return countRemainingOrders(state.orders) === 0;
}

function updatePhase(state, clearInfo) {
  if (completeOrders(state)) {
    state.phase = "won";
    state.message = "订单完成，准备下一间花房";
  } else if (state.movesLeft <= 0) {
    state.phase = "lost";
    state.message = "步数用完，重新整理这一单";
  } else if (clearInfo && clearInfo.totalCleared) {
    state.message = clearInfo.chain > 1 ?
      "连锁 " + clearInfo.chain + " 次，订单推进中" :
      "收集了 " + clearInfo.totalCleared + " 份材料";
  }
}

function attemptSwap(state, from, to) {
  var next = cloneState(sanitizeState(state));
  if (next.phase !== "playing") {
    next.message = next.phase === "won" ? "点下一关继续" : "点重来再试一次";
    return next;
  }
  if (!areAdjacent(from, to)) {
    next.message = "只能交换相邻花格";
    return next;
  }

  swapCells(next.board, from, to);
  if (!findMatches(next.board).cells.length) {
    swapCells(next.board, from, to);
    next.chain = 0;
    next.lastClear = [];
    next.message = "没有连成三格";
    return next;
  }

  next.movesLeft = Math.max(0, next.movesLeft - 1);
  var clearInfo = resolveBoard(next);
  updatePhase(next, clearInfo);
  return next;
}

function moveByDirection(state, from, direction) {
  var delta = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  }[direction];
  if (!delta || !inBounds(from)) return sanitizeState(state);
  return attemptSwap(state, from, { x: from.x + delta.x, y: from.y + delta.y });
}

function forceBoard(state, board) {
  var next = cloneState(sanitizeState(state));
  if (!validateBoard(board)) throw new Error("invalid board");
  next.board = cloneBoard(board);
  return next;
}

if (typeof module !== "undefined") {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    TYPES: TYPES,
    TYPE_LABELS: TYPE_LABELS,
    LEVELS: LEVELS,
    VERSION: VERSION,
    startLevel: startLevel,
    restartLevel: restartLevel,
    nextLevel: nextLevel,
    sanitizeState: sanitizeState,
    cloneState: cloneState,
    findMatches: findMatches,
    hasPossibleMove: hasPossibleMove,
    findHint: findHint,
    attemptSwap: attemptSwap,
    moveByDirection: moveByDirection,
    countRemainingOrders: countRemainingOrders,
    completeOrders: completeOrders,
    forceBoard: forceBoard,
    createPlayableBoard: function (seed) {
      return createPlayableBoard(makeRng(seed));
    }
  };
}
