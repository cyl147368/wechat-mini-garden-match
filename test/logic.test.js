"use strict";

var assert = require("assert");
var Logic = require("../js/logic");

function swap(board, a, b) {
  var tmp = board[a.y][a.x];
  board[a.y][a.x] = board[b.y][b.x];
  board[b.y][b.x] = tmp;
}

function findMoveAndType(state) {
  var hint = Logic.findHint(Logic.cloneState(state).board);
  assert.ok(hint, "expected a possible move");
  var board = Logic.cloneState(state).board;
  swap(board, hint.from, hint.to);
  var match = Logic.findMatches(board);
  assert.ok(match.cells.length > 0, "hint should create a match");
  return { hint: hint, type: match.cells[0].type };
}

for (var seed = 1; seed <= 40; seed += 1) {
  var state = Logic.startLevel(0, seed);
  assert.strictEqual(state.board.length, Logic.BOARD_SIZE, "board height");
  assert.strictEqual(Logic.findMatches(state.board).cells.length, 0, "seed " + seed + " starts with matches");
  assert.ok(Logic.hasPossibleMove(state.board), "seed " + seed + " has no possible move");
}

var invalid = Logic.startLevel(0, 10);
var invalidNext = Logic.attemptSwap(invalid, { x: 0, y: 0 }, { x: 3, y: 0 });
assert.strictEqual(invalidNext.movesLeft, invalid.movesLeft, "non-adjacent swap should not spend a move");
assert.deepStrictEqual(invalidNext.board, invalid.board, "non-adjacent swap should not change board");

var playable = Logic.startLevel(0, 99);
var move = findMoveAndType(playable);
var afterMove = Logic.attemptSwap(playable, move.hint.from, move.hint.to);
assert.strictEqual(afterMove.movesLeft, playable.movesLeft - 1, "valid swap spends one move");
assert.strictEqual(Logic.findMatches(afterMove.board).cells.length, 0, "board should settle without unresolved matches");
assert.ok(Logic.hasPossibleMove(afterMove.board), "board should remain playable after resolve");

var winning = Logic.startLevel(0, 123);
var winningMove = findMoveAndType(winning);
winning.orders = {};
winning.orders[winningMove.type] = 1;
var won = Logic.attemptSwap(winning, winningMove.hint.from, winningMove.hint.to);
assert.strictEqual(won.phase, "won", "small order should complete");
assert.strictEqual(Logic.countRemainingOrders(won.orders), 0, "orders should be empty after win");

var lost = Logic.startLevel(0, 456);
var lostMove = findMoveAndType(lost);
lost.movesLeft = 1;
lost.orders = {};
lost.orders[lostMove.type] = 999;
var loss = Logic.attemptSwap(lost, lostMove.hint.from, lostMove.hint.to);
assert.strictEqual(loss.phase, "lost", "last move without completing order should lose");
assert.strictEqual(loss.movesLeft, 0, "lost state keeps zero moves");

var restored = Logic.sanitizeState({
  levelIndex: 2,
  phase: "lost",
  movesLeft: 0,
  board: lost.board,
  orders: { sun: 3 },
  score: 88,
  rngSeed: 777
});
assert.strictEqual(restored.movesLeft, 0, "sanitize should preserve zero moves");
assert.strictEqual(restored.phase, "lost", "sanitize should preserve terminal phase");

var fresh = Logic.sanitizeState({ board: [["bad"]], levelIndex: -1 });
assert.strictEqual(fresh.levelIndex, 0, "bad level should clamp");
assert.strictEqual(fresh.board.length, Logic.BOARD_SIZE, "bad board should be regenerated");
assert.ok(Logic.hasPossibleMove(fresh.board), "regenerated board should be playable");

var next = Logic.nextLevel(Logic.startLevel(0, 1), 2);
assert.strictEqual(next.levelIndex, 1, "next level increments");

console.log("logic tests passed");
