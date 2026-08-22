const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const WIN_SCORE = 1_000_000_000;
let nodes = 0;
let deadline = Infinity;

self.onmessage = (event) => {
  const message = event.data || {};
  try {
    const board = Int8Array.from(message.board || []);
    if (board.length !== SIZE * SIZE) throw new Error('Invalid board data');
    nodes = 0;
    const limits = {
      beginner: { time: 90, depth: 1, root: 12 },
      intermediate: { time: 320, depth: 2, root: 10 },
      advanced: { time: 1050, depth: 3, root: 12 }
    };
    const level = limits[message.difficulty] || limits.intermediate;
    deadline = Date.now() + (message.timeLimit || level.time);
    const move = chooseMove(board, message.player || BLACK, message.rule || 'freestyle', message.difficulty || 'intermediate', level);
    self.postMessage({ requestId: message.requestId, purpose: message.purpose, move, nodes });
  } catch (error) {
    self.postMessage({ requestId: message.requestId, purpose: message.purpose, error: error instanceof Error ? error.message : String(error) });
  }
};

function idx(x, y) { return y * SIZE + x; }
function inside(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
function other(player) { return player === BLACK ? WHITE : BLACK; }

function lineLength(board, x, y, player, dx, dy) {
  let count = 1;
  for (let step = 1; inside(x + dx * step, y + dy * step) && board[idx(x + dx * step, y + dy * step)] === player; step++) count++;
  for (let step = 1; inside(x - dx * step, y - dy * step) && board[idx(x - dx * step, y - dy * step)] === player; step++) count++;
  return count;
}

function isWinningMove(board, x, y, player, rule) {
  for (const [dx, dy] of DIRECTIONS) {
    const length = lineLength(board, x, y, player, dx, dy);
    if (rule === 'freestyle' && length >= 5) return true;
    if (rule === 'exact-five' && length === 5) return true;
    if (rule === 'renju') {
      if (player === BLACK && length === 5) return true;
      if (player === WHITE && length >= 5) return true;
    }
  }
  return false;
}

function hasOverline(board, x, y, player) {
  return DIRECTIONS.some(([dx, dy]) => lineLength(board, x, y, player, dx, dy) >= 6);
}

function hasExactFive(board, x, y, player) {
  return DIRECTIONS.some(([dx, dy]) => lineLength(board, x, y, player, dx, dy) === 5);
}

function directionHasFour(board, x, y, player, dx, dy) {
  for (let start = -4; start <= 0; start++) {
    let stones = 0;
    let emptyX = -1;
    let emptyY = -1;
    let blocked = false;
    let containsOrigin = false;
    for (let offset = 0; offset < 5; offset++) {
      const px = x + (start + offset) * dx;
      const py = y + (start + offset) * dy;
      if (!inside(px, py)) { blocked = true; break; }
      if (px === x && py === y) containsOrigin = true;
      const value = board[idx(px, py)];
      if (value === player) stones++;
      else if (value === EMPTY) { emptyX = px; emptyY = py; }
      else { blocked = true; break; }
    }
    if (!blocked && containsOrigin && stones === 4 && emptyX >= 0) {
      board[idx(emptyX, emptyY)] = player;
      const exactFive = lineLength(board, emptyX, emptyY, player, dx, dy) === 5;
      board[idx(emptyX, emptyY)] = EMPTY;
      if (exactFive) return true;
    }
  }
  return false;
}

function hasOpenFourContaining(board, originX, originY, player, dx, dy, requiredX, requiredY) {
  for (let start = -5; start <= 0; start++) {
    const values = [];
    let valid = true;
    let containsOrigin = false;
    let containsRequired = false;
    for (let offset = 0; offset < 6; offset++) {
      const px = originX + (start + offset) * dx;
      const py = originY + (start + offset) * dy;
      if (!inside(px, py)) { valid = false; break; }
      if (px === originX && py === originY && offset >= 1 && offset <= 4) containsOrigin = true;
      if (px === requiredX && py === requiredY && offset >= 1 && offset <= 4) containsRequired = true;
      values.push(board[idx(px, py)]);
    }
    if (valid && containsOrigin && containsRequired && values[0] === EMPTY && values[5] === EMPTY && values.slice(1, 5).every((value) => value === player)) return true;
  }
  return false;
}

function directionHasOpenThree(board, x, y, player, dx, dy) {
  for (let distance = -4; distance <= 4; distance++) {
    if (distance === 0) continue;
    const px = x + distance * dx;
    const py = y + distance * dy;
    if (!inside(px, py) || board[idx(px, py)] !== EMPTY) continue;
    board[idx(px, py)] = player;
    const createsOpenFour = hasOpenFourContaining(board, x, y, player, dx, dy, px, py);
    board[idx(px, py)] = EMPTY;
    if (createsOpenFour) return true;
  }
  return false;
}

function forbiddenTypeAfterPlaced(board, x, y, player) {
  if (player !== BLACK) return null;
  if (hasExactFive(board, x, y, player)) return null;
  if (hasOverline(board, x, y, player)) return 'overline';
  let fours = 0;
  let openThrees = 0;
  for (const [dx, dy] of DIRECTIONS) {
    if (directionHasFour(board, x, y, player, dx, dy)) fours++;
    if (directionHasOpenThree(board, x, y, player, dx, dy)) openThrees++;
  }
  if (fours >= 2) return 'double-four';
  if (openThrees >= 2) return 'double-three';
  return null;
}

function isLegalMove(board, x, y, player, rule) {
  if (!inside(x, y) || board[idx(x, y)] !== EMPTY) return false;
  if (rule !== 'renju' || player !== BLACK) return true;
  board[idx(x, y)] = player;
  const forbidden = forbiddenTypeAfterPlaced(board, x, y, player);
  board[idx(x, y)] = EMPTY;
  return !forbidden;
}

function localPatternScore(board, x, y, player) {
  let score = 0;
  const opponent = other(player);
  for (const [dx, dy] of DIRECTIONS) {
    let left = 0;
    let right = 0;
    while (inside(x - dx * (left + 1), y - dy * (left + 1)) && board[idx(x - dx * (left + 1), y - dy * (left + 1))] === player) left++;
    while (inside(x + dx * (right + 1), y + dy * (right + 1)) && board[idx(x + dx * (right + 1), y + dy * (right + 1))] === player) right++;
    const run = left + right + 1;
    const leftX = x - dx * (left + 1);
    const leftY = y - dy * (left + 1);
    const rightX = x + dx * (right + 1);
    const rightY = y + dy * (right + 1);
    const openLeft = inside(leftX, leftY) && board[idx(leftX, leftY)] === EMPTY;
    const openRight = inside(rightX, rightY) && board[idx(rightX, rightY)] === EMPTY;
    const open = Number(openLeft) + Number(openRight);
    if (run >= 5) score += 200_000_000;
    else if (run === 4 && open === 2) score += 14_000_000;
    else if (run === 4 && open === 1) score += 2_600_000;
    else if (run === 3 && open === 2) score += 520_000;
    else if (run === 3 && open === 1) score += 58_000;
    else if (run === 2 && open === 2) score += 12_000;
    else if (run === 2 && open === 1) score += 1_700;
    else if (run === 1 && open === 2) score += 180;

    for (let start = -4; start <= 0; start++) {
      let own = 0;
      let empties = 0;
      let blocked = false;
      let contains = false;
      for (let offset = 0; offset < 5; offset++) {
        const px = x + (start + offset) * dx;
        const py = y + (start + offset) * dy;
        if (!inside(px, py)) { blocked = true; break; }
        if (px === x && py === y) contains = true;
        const value = board[idx(px, py)];
        if (value === player) own++;
        else if (value === EMPTY) empties++;
        else if (value === opponent) { blocked = true; break; }
      }
      if (!blocked && contains) {
        if (own === 4 && empties === 1) score += 1_250_000;
        else if (own === 3 && empties === 2) score += 35_000;
        else if (own === 2 && empties === 3) score += 1_100;
      }
    }
  }
  return score;
}

function moveOrderScore(board, x, y, player, rule) {
  if (!isLegalMove(board, x, y, player, rule)) return -Infinity;
  const opponent = other(player);
  board[idx(x, y)] = player;
  const attack = localPatternScore(board, x, y, player);
  const win = isWinningMove(board, x, y, player, rule);
  board[idx(x, y)] = EMPTY;

  let defense = 0;
  if (isLegalMove(board, x, y, opponent, rule)) {
    board[idx(x, y)] = opponent;
    defense = localPatternScore(board, x, y, opponent);
    if (isWinningMove(board, x, y, opponent, rule)) defense += 120_000_000;
    board[idx(x, y)] = EMPTY;
  }

  const centerDistance = Math.abs(x - 7) + Math.abs(y - 7);
  return (win ? WIN_SCORE : 0) + attack + defense * 0.94 + (30 - centerDistance) * 9;
}

function generateCandidates(board, player, rule, limit = 12) {
  let stoneCount = 0;
  const marked = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[idx(x, y)] === EMPTY) continue;
      stoneCount++;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (inside(px, py) && board[idx(px, py)] === EMPTY) marked[idx(px, py)] = 1;
        }
      }
    }
  }
  if (stoneCount === 0) return [{ x: 7, y: 7, order: 1 }];

  const candidates = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!marked[idx(x, y)]) continue;
      const order = moveOrderScore(board, x, y, player, rule);
      if (Number.isFinite(order)) candidates.push({ x, y, order });
    }
  }
  candidates.sort((a, b) => b.order - a.order);
  return candidates.slice(0, Math.max(1, limit));
}

function immediateWinningMoves(board, player, rule, candidates) {
  const wins = [];
  for (const move of candidates) {
    if (!isLegalMove(board, move.x, move.y, player, rule)) continue;
    board[idx(move.x, move.y)] = player;
    const win = isWinningMove(board, move.x, move.y, player, rule);
    board[idx(move.x, move.y)] = EMPTY;
    if (win) wins.push(move);
  }
  return wins;
}

function runValue(length, open) {
  if (length >= 5) return 70_000_000;
  if (length === 4 && open === 2) return 7_000_000;
  if (length === 4 && open === 1) return 950_000;
  if (length === 3 && open === 2) return 180_000;
  if (length === 3 && open === 1) return 18_000;
  if (length === 2 && open === 2) return 4_000;
  if (length === 2 && open === 1) return 450;
  if (length === 1 && open === 2) return 35;
  return 0;
}

function evaluatePlayer(board, player) {
  let score = 0;
  for (const [dx, dy] of DIRECTIONS) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[idx(x, y)] !== player) continue;
        const prevX = x - dx;
        const prevY = y - dy;
        if (inside(prevX, prevY) && board[idx(prevX, prevY)] === player) continue;
        let length = 0;
        let px = x;
        let py = y;
        while (inside(px, py) && board[idx(px, py)] === player) {
          length++;
          px += dx;
          py += dy;
        }
        const openBefore = inside(prevX, prevY) && board[idx(prevX, prevY)] === EMPTY;
        const openAfter = inside(px, py) && board[idx(px, py)] === EMPTY;
        score += runValue(length, Number(openBefore) + Number(openAfter));
      }
    }
  }
  return score;
}

function evaluate(board, aiPlayer) {
  return evaluatePlayer(board, aiPlayer) - evaluatePlayer(board, other(aiPlayer)) * 1.08;
}

function minimax(board, depth, turn, aiPlayer, rule, alpha, beta, lastMove, lastPlayer, branchLimit) {
  nodes++;
  if (Date.now() >= deadline) return evaluate(board, aiPlayer);
  if (lastMove && isWinningMove(board, lastMove.x, lastMove.y, lastPlayer, rule)) {
    return lastPlayer === aiPlayer ? WIN_SCORE + depth * 10_000 : -WIN_SCORE - depth * 10_000;
  }
  if (depth <= 0) return evaluate(board, aiPlayer);

  const candidates = generateCandidates(board, turn, rule, branchLimit);
  if (!candidates.length) return 0;
  if (turn === aiPlayer) {
    let best = -Infinity;
    for (const move of candidates) {
      board[idx(move.x, move.y)] = turn;
      const value = minimax(board, depth - 1, other(turn), aiPlayer, rule, alpha, beta, move, turn, Math.max(5, branchLimit - 2));
      board[idx(move.x, move.y)] = EMPTY;
      if (value > best) best = value;
      if (best > alpha) alpha = best;
      if (beta <= alpha || Date.now() >= deadline) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of candidates) {
    board[idx(move.x, move.y)] = turn;
    const value = minimax(board, depth - 1, other(turn), aiPlayer, rule, alpha, beta, move, turn, Math.max(5, branchLimit - 2));
    board[idx(move.x, move.y)] = EMPTY;
    if (value < best) best = value;
    if (best < beta) beta = best;
    if (beta <= alpha || Date.now() >= deadline) break;
  }
  return best;
}

function searchRoot(board, player, rule, depth, rootLimit) {
  const candidates = generateCandidates(board, player, rule, rootLimit);
  const opponent = other(player);
  const immediate = immediateWinningMoves(board, player, rule, candidates);
  if (immediate.length) return { ...immediate[0], score: WIN_SCORE };

  const opponentCandidates = generateCandidates(board, opponent, rule, Math.max(rootLimit, 16));
  const blocks = immediateWinningMoves(board, opponent, rule, opponentCandidates);
  const blockKeys = new Set(blocks.map((move) => `${move.x},${move.y}`));
  const rootMoves = blocks.length ? candidates.filter((move) => blockKeys.has(`${move.x},${move.y}`)) : candidates;
  const usableMoves = rootMoves.length ? rootMoves : candidates;

  let best = null;
  let alpha = -Infinity;
  for (const move of usableMoves) {
    board[idx(move.x, move.y)] = player;
    let score;
    if (isWinningMove(board, move.x, move.y, player, rule)) score = WIN_SCORE;
    else score = minimax(board, depth - 1, opponent, player, rule, alpha, Infinity, move, player, Math.max(6, rootLimit - 3));
    board[idx(move.x, move.y)] = EMPTY;
    score += move.order * 0.0008;
    if (!best || score > best.score) best = { x: move.x, y: move.y, score };
    if (score > alpha) alpha = score;
    if (Date.now() >= deadline) break;
  }
  return best || usableMoves[0] || null;
}

function chooseMove(board, player, rule, difficulty, level) {
  const candidates = generateCandidates(board, player, rule, level.root);
  if (!candidates.length) return null;

  const immediate = immediateWinningMoves(board, player, rule, candidates);
  if (immediate.length) return immediate[0];

  const opponent = other(player);
  const opponentCandidates = generateCandidates(board, opponent, rule, 18);
  const blocks = immediateWinningMoves(board, opponent, rule, opponentCandidates);
  if (blocks.length === 1) return blocks[0];
  if (blocks.length > 1) {
    blocks.sort((a, b) => moveOrderScore(board, b.x, b.y, player, rule) - moveOrderScore(board, a.x, a.y, player, rule));
    return blocks[0];
  }

  if (difficulty === 'beginner') {
    const pool = candidates.slice(0, Math.min(6, candidates.length));
    const roll = Math.random();
    const choice = roll < 0.48 ? 0 : roll < 0.72 ? Math.min(1, pool.length - 1) : Math.floor(Math.random() * pool.length);
    return pool[choice];
  }

  if (difficulty === 'intermediate') return searchRoot(board, player, rule, 2, level.root);

  let best = searchRoot(board, player, rule, 2, level.root);
  if (Date.now() < deadline - 120) {
    const deeper = searchRoot(board, player, rule, 3, level.root);
    if (deeper) best = deeper;
  }
  return best;
}
