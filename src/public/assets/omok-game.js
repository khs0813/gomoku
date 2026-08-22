const root = document.querySelector('[data-game-root]');

if (root) {
  const SIZE = 15;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const labels = JSON.parse(document.querySelector('#game-i18n')?.textContent || '{}');
  const storageKeys = {
    settings: 'fivegrid:game-settings',
    stats: 'fivegrid:game-stats'
  };

  const elements = {
    canvas: root.querySelector('[data-board]'),
    boardFrame: root.querySelector('[data-board-frame]'),
    status: root.querySelector('[data-status]'),
    turnStone: root.querySelector('[data-turn-stone]'),
    moveCount: root.querySelector('[data-move-count]'),
    timer: root.querySelector('[data-timer]'),
    overlay: root.querySelector('[data-ai-overlay]'),
    newGame: root.querySelector('[data-new-game]'),
    undo: root.querySelector('[data-undo]'),
    hint: root.querySelector('[data-hint]'),
    ruleSelect: root.querySelector('[data-rule-select]'),
    ruleDescription: root.querySelector('[data-rule-description]'),
    difficultyDescription: root.querySelector('[data-difficulty-description]'),
    sound: root.querySelector('[data-sound]'),
    coordinates: root.querySelector('[data-coordinates]'),
    aiSettings: [...root.querySelectorAll('[data-ai-setting]')],
    wins: root.querySelector('[data-wins]'),
    losses: root.querySelector('[data-losses]'),
    draws: root.querySelector('[data-draws]'),
    streak: root.querySelector('[data-streak]'),
    resetRecord: root.querySelector('[data-reset-record]'),
    toast: root.querySelector('[data-toast]'),
    dialog: root.querySelector('[data-result-dialog]'),
    resultTitle: root.querySelector('[data-result-title]'),
    resultDetail: root.querySelector('[data-result-detail]'),
    dialogNew: root.querySelector('[data-dialog-new]'),
    dialogClose: root.querySelector('[data-dialog-close]')
  };

  const ctx = elements.canvas.getContext('2d', { alpha: false });
  let board = new Int8Array(SIZE * SIZE);
  let history = [];
  let currentPlayer = BLACK;
  let humanPlayer = BLACK;
  let aiPlayer = WHITE;
  let gameOver = false;
  let winningLine = [];
  let hoverCell = null;
  let cursorCell = { x: 7, y: 7 };
  let hintCell = null;
  let hintAnimationId = 0;
  let startTime = Date.now();
  let gameToken = 0;
  let thinking = false;
  let hintPending = false;
  let worker = null;
  let requestSequence = 0;
  const pendingRequests = new Map();
  let toastTimer = 0;
  let canvasMetrics = { size: 600, padding: 34, cell: 38 };

  const defaultSettings = {
    mode: 'ai',
    difficulty: 'intermediate',
    side: 'black',
    rule: 'freestyle',
    sound: false,
    coordinates: true
  };
  const defaultStats = { wins: 0, losses: 0, draws: 0, streak: 0 };
  let settings = loadJson(storageKeys.settings, defaultSettings);
  settings.sound = false;
  let stats = loadJson(storageKeys.stats, defaultStats);
  let statsSnapshotBeforeResult = null;

  const query = new URLSearchParams(location.search);
  if (['beginner', 'intermediate', 'advanced'].includes(query.get('difficulty'))) settings.difficulty = query.get('difficulty');
  if (['freestyle', 'exact-five', 'renju'].includes(query.get('rule'))) settings.rule = query.get('rule');

  function index(x, y) { return y * SIZE + x; }
  function inside(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
  function other(player) { return player === BLACK ? WHITE : BLACK; }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : { ...fallback };
    } catch {
      return { ...fallback };
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be blocked */ }
  }

  function setRadio(name, value) {
    const input = root.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function getRadio(name) {
    return root.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function syncControlsFromSettings() {
    setRadio('mode', settings.mode);
    setRadio('difficulty', settings.difficulty);
    setRadio('side', settings.side);
    elements.ruleSelect.value = settings.rule;
    elements.sound.checked = false;
    elements.sound.disabled = true;
    elements.coordinates.checked = Boolean(settings.coordinates);
    updateSettingVisibility();
    updateDescriptions();
  }

  function readControls() {
    settings = {
      mode: getRadio('mode') || 'ai',
      difficulty: getRadio('difficulty') || 'intermediate',
      side: getRadio('side') || 'black',
      rule: elements.ruleSelect.value || 'freestyle',
      sound: false,
      coordinates: elements.coordinates.checked
    };
    saveJson(storageKeys.settings, settings);
  }

  function updateSettingVisibility() {
    const aiMode = (getRadio('mode') || settings.mode) === 'ai';
    elements.aiSettings.forEach((item) => { item.hidden = !aiMode; });
  }

  function updateDescriptions() {
    const difficulty = getRadio('difficulty') || settings.difficulty;
    const difficultyMap = {
      beginner: labels.aiBeginnerDesc,
      intermediate: labels.aiIntermediateDesc,
      advanced: labels.aiAdvancedDesc
    };
    if (elements.difficultyDescription) elements.difficultyDescription.textContent = difficultyMap[difficulty] || '';
    const ruleMap = {
      freestyle: labels.ruleNoteFreestyle,
      'exact-five': labels.ruleNoteExact,
      renju: labels.ruleNoteRenju
    };
    if (elements.ruleDescription) elements.ruleDescription.textContent = ruleMap[elements.ruleSelect.value] || '';
  }

  function renderStats() {
    elements.wins.textContent = String(stats.wins || 0);
    elements.losses.textContent = String(stats.losses || 0);
    elements.draws.textContent = String(stats.draws || 0);
    elements.streak.textContent = String(stats.streak || 0);
  }

  function formatTime(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function updateStatus() {
    elements.moveCount.textContent = String(history.length);
    elements.turnStone.classList.toggle('turn-black', currentPlayer === BLACK);
    elements.turnStone.classList.toggle('turn-white', currentPlayer === WHITE);

    if (gameOver) return;
    if (settings.mode === 'ai') {
      elements.status.textContent = currentPlayer === humanPlayer ? labels.yourTurn : labels.aiTurn;
    } else {
      elements.status.textContent = currentPlayer === BLACK ? labels.blackTurn : labels.whiteTurn;
    }
    elements.undo.disabled = !canUndo();
    elements.hint.disabled = thinking || hintPending || gameOver || (settings.mode === 'ai' && currentPlayer !== humanPlayer);
  }

  function showToast(message) {
    if (!message) return;
    clearTimeout(toastTimer);
    elements.toast.hidden = false;
    elements.toast.textContent = message;
    requestAnimationFrame(() => elements.toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove('is-visible');
      window.setTimeout(() => { elements.toast.hidden = true; }, 220);
    }, 2200);
  }

  function initializeWorker() {
    if (!('Worker' in window)) return null;
    try {
      const aiWorker = new Worker('/assets/omok-ai-worker.js');
      aiWorker.addEventListener('message', handleWorkerMessage);
      aiWorker.addEventListener('error', () => {
        const requests = [...pendingRequests.values()];
        pendingRequests.clear();
        thinking = false;
        hintPending = false;
        elements.overlay.hidden = true;
        for (const request of requests) {
          if (request.purpose === 'ai' && request.token === gameToken) playFallbackAiMove();
        }
        updateStatus();
      });
      return aiWorker;
    } catch {
      return null;
    }
  }

  function resetWorker() {
    if (worker) worker.terminate();
    pendingRequests.clear();
    worker = initializeWorker();
  }

  function postAiRequest(purpose, player, difficulty, timeLimit) {
    const requestId = ++requestSequence;
    const token = gameToken;
    pendingRequests.set(requestId, { purpose, player, token });
    if (!worker) {
      window.setTimeout(() => {
        pendingRequests.delete(requestId);
        if (purpose === 'ai' && token === gameToken) playFallbackAiMove();
        if (purpose === 'hint' && token === gameToken) showFallbackHint(player);
      }, 80);
      return;
    }
    worker.postMessage({
      requestId,
      purpose,
      board: Array.from(board),
      player,
      rule: settings.rule,
      difficulty,
      timeLimit
    });
  }

  function handleWorkerMessage(event) {
    const { requestId, purpose, move, error } = event.data || {};
    const request = pendingRequests.get(requestId);
    if (!request) return;
    pendingRequests.delete(requestId);
    if (request.token !== gameToken) return;

    if (purpose === 'hint') {
      hintPending = false;
      elements.hint.disabled = false;
      if (!error && move && isPlayable(move.x, move.y, request.player)) {
        hintCell = { x: move.x, y: move.y };
        startHintAnimation();
        showToast(labels.hintReady);
      } else {
        showFallbackHint(request.player);
      }
      updateStatus();
      return;
    }

    thinking = false;
    elements.overlay.hidden = true;
    if (!error && move && currentPlayer === aiPlayer && isPlayable(move.x, move.y, aiPlayer)) {
      window.setTimeout(() => {
        if (!gameOver && currentPlayer === aiPlayer && request.token === gameToken) makeMove(move.x, move.y, aiPlayer, true);
      }, 80);
    } else {
      playFallbackAiMove();
    }
    updateStatus();
  }

  function startNewGame() {
    readControls();
    gameToken++;
    if (thinking || hintPending) resetWorker();
    board = new Int8Array(SIZE * SIZE);
    history = [];
    winningLine = [];
    gameOver = false;
    statsSnapshotBeforeResult = null;
    thinking = false;
    hintPending = false;
    hintCell = null;
    hoverCell = null;
    cursorCell = { x: 7, y: 7 };
    startTime = Date.now();
    elements.overlay.hidden = true;
    closeResultDialog();

    if (settings.mode === 'ai') {
      const chosenSide = settings.side === 'random' ? (Math.random() < 0.5 ? 'black' : 'white') : settings.side;
      humanPlayer = chosenSide === 'white' ? WHITE : BLACK;
      aiPlayer = other(humanPlayer);
    } else {
      humanPlayer = BLACK;
      aiPlayer = WHITE;
    }
    currentPlayer = BLACK;
    updateStatus();
    drawBoard();

    if (settings.mode === 'ai' && aiPlayer === BLACK) {
      window.setTimeout(requestAiMove, 220);
    }
  }

  function lineLength(x, y, player, dx, dy) {
    let count = 1;
    for (let step = 1; inside(x + dx * step, y + dy * step) && board[index(x + dx * step, y + dy * step)] === player; step++) count++;
    for (let step = 1; inside(x - dx * step, y - dy * step) && board[index(x - dx * step, y - dy * step)] === player; step++) count++;
    return count;
  }

  function collectLine(x, y, player, dx, dy) {
    const points = [{ x, y }];
    for (let step = 1; inside(x - dx * step, y - dy * step) && board[index(x - dx * step, y - dy * step)] === player; step++) points.unshift({ x: x - dx * step, y: y - dy * step });
    for (let step = 1; inside(x + dx * step, y + dy * step) && board[index(x + dx * step, y + dy * step)] === player; step++) points.push({ x: x + dx * step, y: y + dy * step });
    return points;
  }

  function winningPoints(x, y, player) {
    for (const [dx, dy] of DIRECTIONS) {
      const points = collectLine(x, y, player, dx, dy);
      const length = points.length;
      if (settings.rule === 'freestyle' && length >= 5) return points;
      if (settings.rule === 'exact-five' && length === 5) return points;
      if (settings.rule === 'renju') {
        if (player === BLACK && length === 5) return points;
        if (player === WHITE && length >= 5) return points;
      }
    }
    return [];
  }

  function hasOverline(x, y, player) {
    return DIRECTIONS.some(([dx, dy]) => lineLength(x, y, player, dx, dy) >= 6);
  }

  function hasExactFive(x, y, player) {
    return DIRECTIONS.some(([dx, dy]) => lineLength(x, y, player, dx, dy) === 5);
  }

  function directionHasFour(x, y, player, dx, dy) {
    for (let start = -4; start <= 0; start++) {
      let stones = 0;
      let empty = null;
      let blocked = false;
      let containsOrigin = false;
      for (let offset = 0; offset < 5; offset++) {
        const px = x + (start + offset) * dx;
        const py = y + (start + offset) * dy;
        if (!inside(px, py)) { blocked = true; break; }
        if (px === x && py === y) containsOrigin = true;
        const value = board[index(px, py)];
        if (value === player) stones++;
        else if (value === EMPTY) empty = { x: px, y: py };
        else { blocked = true; break; }
      }
      if (!blocked && containsOrigin && stones === 4 && empty) {
        board[index(empty.x, empty.y)] = player;
        const exact = lineLength(empty.x, empty.y, player, dx, dy) === 5;
        board[index(empty.x, empty.y)] = EMPTY;
        if (exact) return true;
      }
    }
    return false;
  }

  function hasOpenFourContaining(originX, originY, player, dx, dy, requiredX, requiredY) {
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
        values.push(board[index(px, py)]);
      }
      if (valid && containsOrigin && containsRequired && values[0] === EMPTY && values[5] === EMPTY && values.slice(1, 5).every((value) => value === player)) return true;
    }
    return false;
  }

  function directionHasOpenThree(x, y, player, dx, dy) {
    for (let distance = -4; distance <= 4; distance++) {
      if (distance === 0) continue;
      const px = x + distance * dx;
      const py = y + distance * dy;
      if (!inside(px, py) || board[index(px, py)] !== EMPTY) continue;
      board[index(px, py)] = player;
      const createsOpenFour = hasOpenFourContaining(x, y, player, dx, dy, px, py);
      board[index(px, py)] = EMPTY;
      if (createsOpenFour) return true;
    }
    return false;
  }

  function forbiddenTypeAfterPlaced(x, y, player) {
    if (settings.rule !== 'renju' || player !== BLACK) return null;
    if (hasExactFive(x, y, player)) return null;
    if (hasOverline(x, y, player)) return 'overline';
    let fours = 0;
    let threes = 0;
    for (const [dx, dy] of DIRECTIONS) {
      if (directionHasFour(x, y, player, dx, dy)) fours++;
      if (directionHasOpenThree(x, y, player, dx, dy)) threes++;
    }
    if (fours >= 2) return 'double-four';
    if (threes >= 2) return 'double-three';
    return null;
  }

  function isPlayable(x, y, player = currentPlayer) {
    if (!inside(x, y) || board[index(x, y)] !== EMPTY) return false;
    if (settings.rule !== 'renju' || player !== BLACK) return true;
    board[index(x, y)] = player;
    const forbidden = forbiddenTypeAfterPlaced(x, y, player);
    board[index(x, y)] = EMPTY;
    return !forbidden;
  }

  function makeMove(x, y, player, fromAi = false) {
    if (gameOver || thinking && !fromAi || player !== currentPlayer || board[index(x, y)] !== EMPTY) return false;
    if (settings.mode === 'ai' && !fromAi && currentPlayer !== humanPlayer) return false;

    board[index(x, y)] = player;
    const forbidden = forbiddenTypeAfterPlaced(x, y, player);
    if (forbidden) {
      board[index(x, y)] = EMPTY;
      showToast(labels.forbidden);
      drawBoard();
      return false;
    }

    history.push({ x, y, player, at: Date.now() });
    hintCell = null;
    stopHintAnimation();
    cursorCell = { x, y };
    playMoveSound(player);
    if (!fromAi && navigator.vibrate) navigator.vibrate(8);

    winningLine = winningPoints(x, y, player);
    if (winningLine.length) {
      gameOver = true;
      drawBoard();
      finishGame(player);
      return true;
    }

    if (history.length === SIZE * SIZE) {
      gameOver = true;
      drawBoard();
      finishGame(EMPTY);
      return true;
    }

    currentPlayer = other(player);
    drawBoard();
    updateStatus();

    if (settings.mode === 'ai' && currentPlayer === aiPlayer) requestAiMove();
    return true;
  }

  function requestAiMove() {
    if (gameOver || settings.mode !== 'ai' || currentPlayer !== aiPlayer || thinking) return;
    thinking = true;
    elements.overlay.hidden = false;
    updateStatus();
    postAiRequest('ai', aiPlayer, settings.difficulty, settings.difficulty === 'advanced' ? 1050 : settings.difficulty === 'intermediate' ? 320 : 90);
  }

  function candidateCells(player) {
    const marked = new Uint8Array(SIZE * SIZE);
    let stones = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[index(x, y)] === EMPTY) continue;
        stones++;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (inside(px, py) && isPlayable(px, py, player)) marked[index(px, py)] = 1;
          }
        }
      }
    }
    if (!stones) return [{ x: 7, y: 7 }];
    const list = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (marked[index(x, y)]) list.push({ x, y });
    list.sort((a, b) => (Math.abs(a.x - 7) + Math.abs(a.y - 7)) - (Math.abs(b.x - 7) + Math.abs(b.y - 7)));
    return list;
  }

  function wouldWin(x, y, player) {
    if (!isPlayable(x, y, player)) return false;
    board[index(x, y)] = player;
    const win = winningPointsForRule(x, y, player).length > 0;
    board[index(x, y)] = EMPTY;
    return win;
  }

  function winningPointsForRule(x, y, player) {
    for (const [dx, dy] of DIRECTIONS) {
      const points = collectLine(x, y, player, dx, dy);
      if (settings.rule === 'freestyle' && points.length >= 5) return points;
      if (settings.rule === 'exact-five' && points.length === 5) return points;
      if (settings.rule === 'renju' && ((player === BLACK && points.length === 5) || (player === WHITE && points.length >= 5))) return points;
    }
    return [];
  }

  function fallbackMove(player) {
    const candidates = candidateCells(player);
    for (const move of candidates) if (wouldWin(move.x, move.y, player)) return move;
    const opponent = other(player);
    for (const move of candidates) if (wouldWin(move.x, move.y, opponent)) return move;
    return candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(5, candidates.length)))] || null;
  }

  function playFallbackAiMove() {
    thinking = false;
    elements.overlay.hidden = true;
    if (gameOver || currentPlayer !== aiPlayer) return;
    const move = fallbackMove(aiPlayer);
    if (move) makeMove(move.x, move.y, aiPlayer, true);
    updateStatus();
  }

  function showFallbackHint(player) {
    hintPending = false;
    const move = fallbackMove(player);
    if (move) {
      hintCell = move;
      startHintAnimation();
      showToast(labels.hintReady);
    }
    updateStatus();
  }

  function requestHint() {
    if (gameOver || thinking || hintPending) return;
    if (settings.mode === 'ai' && currentPlayer !== humanPlayer) return;
    hintPending = true;
    elements.hint.disabled = true;
    postAiRequest('hint', currentPlayer, 'advanced', 520);
  }

  function canUndo() {
    if (!history.length) return false;
    if (settings.mode === 'local') return true;
    return history.some((move) => move.player === humanPlayer);
  }

  function undoMove() {
    if (!canUndo()) {
      showToast(labels.cannotUndo);
      return;
    }
    const wasGameOver = gameOver;
    gameToken++;
    if (thinking || hintPending) resetWorker();
    thinking = false;
    hintPending = false;
    elements.overlay.hidden = true;
    closeResultDialog();
    gameOver = false;
    winningLine = [];
    hintCell = null;
    stopHintAnimation();

    if (settings.mode === 'local') {
      const removed = history.pop();
      board[index(removed.x, removed.y)] = EMPTY;
      currentPlayer = removed.player;
    } else {
      do {
        const removed = history.pop();
        if (!removed) break;
        board[index(removed.x, removed.y)] = EMPTY;
        currentPlayer = removed.player;
      } while (history.length && currentPlayer !== humanPlayer);
      if (currentPlayer !== humanPlayer && history.some((move) => move.player === humanPlayer)) currentPlayer = humanPlayer;
    }

    if (wasGameOver && settings.mode === 'ai' && statsSnapshotBeforeResult) {
      stats = { ...statsSnapshotBeforeResult };
      statsSnapshotBeforeResult = null;
      saveJson(storageKeys.stats, stats);
      renderStats();
    }

    const last = history.at(-1);
    cursorCell = last ? { x: last.x, y: last.y } : { x: 7, y: 7 };
    drawBoard();
    updateStatus();
  }

  function finishGame(winner) {
    thinking = false;
    elements.overlay.hidden = true;
    let title;
    if (winner === EMPTY) title = labels.draw;
    else if (settings.mode === 'ai') title = winner === humanPlayer ? labels.youWin : labels.aiWin;
    else title = winner === BLACK ? labels.blackWin : labels.whiteWin;
    elements.status.textContent = title;
    elements.resultTitle.textContent = title;
    elements.resultDetail.textContent = `${labels.move} ${history.length} · ${labels.elapsed} ${formatTime(Date.now() - startTime)}`;

    if (settings.mode === 'ai') {
      statsSnapshotBeforeResult = { ...stats };
      if (winner === EMPTY) {
        stats.draws++;
        stats.streak = 0;
      } else if (winner === humanPlayer) {
        stats.wins++;
        stats.streak++;
      } else {
        stats.losses++;
        stats.streak = 0;
      }
      saveJson(storageKeys.stats, stats);
      renderStats();
    }

    elements.undo.disabled = !canUndo();
    elements.hint.disabled = true;
    window.setTimeout(openResultDialog, 380);
  }

  function openResultDialog() {
    if (typeof elements.dialog.showModal === 'function' && !elements.dialog.open) elements.dialog.showModal();
    else elements.dialog.setAttribute('open', '');
  }

  function closeResultDialog() {
    if (typeof elements.dialog.close === 'function' && elements.dialog.open) elements.dialog.close();
    else elements.dialog.removeAttribute('open');
  }

  function playMoveSound() {}

  function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();
    const cssSize = Math.max(280, Math.floor(rect.width));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelSize = Math.floor(cssSize * dpr);
    if (elements.canvas.width !== pixelSize || elements.canvas.height !== pixelSize) {
      elements.canvas.width = pixelSize;
      elements.canvas.height = pixelSize;
    }
    elements.canvas.style.height = `${cssSize}px`;
    canvasMetrics = {
      size: cssSize,
      padding: Math.max(settings.coordinates ? 25 : 19, cssSize * (settings.coordinates ? 0.056 : 0.044)),
      cell: 0
    };
    canvasMetrics.cell = (cssSize - canvasMetrics.padding * 2) / (SIZE - 1);
    drawBoard();
  }

  function pointForCell(x, y) {
    return {
      x: canvasMetrics.padding + x * canvasMetrics.cell,
      y: canvasMetrics.padding + y * canvasMetrics.cell
    };
  }

  function drawBoard() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { size, padding, cell } = canvasMetrics;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const boardGradient = ctx.createLinearGradient(0, 0, size, size);
    boardGradient.addColorStop(0, '#e6bd79');
    boardGradient.addColorStop(0.55, '#d8a861');
    boardGradient.addColorStop(1, '#c88f4d');
    ctx.fillStyle = boardGradient;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.strokeStyle = '#6a3d1d';
    for (let i = 0; i < 9; i++) {
      const y = (size / 9) * i + Math.sin(i * 1.9) * 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * .3, y + 8, size * .7, y - 7, size, y + 3);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(73, 43, 23, .66)';
    ctx.lineWidth = Math.max(0.75, size / 720);
    ctx.beginPath();
    for (let i = 0; i < SIZE; i++) {
      const p = padding + i * cell;
      ctx.moveTo(p, padding);
      ctx.lineTo(p, size - padding);
      ctx.moveTo(padding, p);
      ctx.lineTo(size - padding, p);
    }
    ctx.stroke();

    const starPoints = [[3,3],[11,3],[7,7],[3,11],[11,11]];
    ctx.fillStyle = 'rgba(73, 43, 23, .78)';
    for (const [x, y] of starPoints) {
      const point = pointForCell(x, y);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2.1, cell * .075), 0, Math.PI * 2);
      ctx.fill();
    }

    if (settings.coordinates) drawCoordinates(size, padding, cell);

    const winningSet = new Set(winningLine.map((point) => `${point.x},${point.y}`));
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const player = board[index(x, y)];
        if (player !== EMPTY) drawStone(x, y, player, winningSet.has(`${x},${y}`));
      }
    }

    const lastMove = history.at(-1);
    if (lastMove) drawLastMove(lastMove);
    if (hintCell && board[index(hintCell.x, hintCell.y)] === EMPTY) drawHint(hintCell);

    const activeCandidate = hoverCell || (document.activeElement === elements.canvas ? cursorCell : null);
    if (activeCandidate && board[index(activeCandidate.x, activeCandidate.y)] === EMPTY && !gameOver) drawCandidate(activeCandidate);
  }

  function drawCoordinates(size, padding, cell) {
    const letters = 'ABCDEFGHIJKLMNO';
    const fontSize = Math.max(7, Math.min(11, cell * .25));
    ctx.fillStyle = 'rgba(68, 40, 20, .63)';
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < SIZE; i++) {
      const p = padding + i * cell;
      ctx.fillText(letters[i], p, padding * .43);
      ctx.fillText(String(SIZE - i), padding * .42, p);
    }
  }

  function drawStone(x, y, player, winning) {
    const point = pointForCell(x, y);
    const radius = canvasMetrics.cell * .425;
    ctx.save();
    ctx.shadowColor = 'rgba(38, 22, 12, .34)';
    ctx.shadowBlur = radius * .34;
    ctx.shadowOffsetY = radius * .17;
    const gradient = ctx.createRadialGradient(point.x - radius * .32, point.y - radius * .38, radius * .08, point.x, point.y, radius);
    if (player === BLACK) {
      gradient.addColorStop(0, '#51535a');
      gradient.addColorStop(.38, '#24252a');
      gradient.addColorStop(1, '#07080b');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(.55, '#f5f2ea');
      gradient.addColorStop(1, '#cbc5b8');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (player === WHITE) {
      ctx.strokeStyle = 'rgba(50, 40, 28, .18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (winning) {
      ctx.strokeStyle = '#ec5f4f';
      ctx.lineWidth = Math.max(2.4, radius * .15);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * .72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLastMove(move) {
    const point = pointForCell(move.x, move.y);
    const radius = Math.max(2.5, canvasMetrics.cell * .08);
    ctx.fillStyle = '#ec5f4f';
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHint(cellPoint) {
    const point = pointForCell(cellPoint.x, cellPoint.y);
    const phase = (Date.now() % 1300) / 1300;
    ctx.save();
    ctx.strokeStyle = `rgba(198, 63, 51, ${1 - phase})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, canvasMetrics.cell * (.2 + phase * .35), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c63f33';
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(3, canvasMetrics.cell * .09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCandidate(cellPoint) {
    const point = pointForCell(cellPoint.x, cellPoint.y);
    const forbidden = settings.rule === 'renju' && currentPlayer === BLACK && !isPlayable(cellPoint.x, cellPoint.y, currentPlayer);
    ctx.save();
    if (forbidden) {
      const radius = canvasMetrics.cell * .25;
      ctx.strokeStyle = '#c63f33';
      ctx.lineWidth = Math.max(2, canvasMetrics.cell * .06);
      ctx.beginPath();
      ctx.moveTo(point.x - radius, point.y - radius);
      ctx.lineTo(point.x + radius, point.y + radius);
      ctx.moveTo(point.x + radius, point.y - radius);
      ctx.lineTo(point.x - radius, point.y + radius);
      ctx.stroke();
    } else {
      ctx.globalAlpha = .28;
      ctx.fillStyle = currentPlayer === BLACK ? '#111216' : '#ffffff';
      ctx.beginPath();
      ctx.arc(point.x, point.y, canvasMetrics.cell * .38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = .75;
      ctx.strokeStyle = currentPlayer === BLACK ? '#ffffff' : '#343020';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, canvasMetrics.cell * .16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cellFromPointer(event) {
    const rect = elements.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const gridX = Math.round((x - canvasMetrics.padding) / canvasMetrics.cell);
    const gridY = Math.round((y - canvasMetrics.padding) / canvasMetrics.cell);
    if (!inside(gridX, gridY)) return null;
    const point = pointForCell(gridX, gridY);
    if (Math.hypot(x - point.x, y - point.y) > canvasMetrics.cell * .52) return null;
    return { x: gridX, y: gridY };
  }

  function startHintAnimation() {
    stopHintAnimation();
    const animate = () => {
      if (!hintCell || gameOver) return;
      drawBoard();
      hintAnimationId = requestAnimationFrame(animate);
    };
    hintAnimationId = requestAnimationFrame(animate);
  }

  function stopHintAnimation() {
    if (hintAnimationId) cancelAnimationFrame(hintAnimationId);
    hintAnimationId = 0;
  }

  elements.canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const cell = cellFromPointer(event);
    if (!cell) return;
    cursorCell = cell;
    makeMove(cell.x, cell.y, currentPlayer, false);
  });

  elements.canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    hoverCell = cellFromPointer(event);
    drawBoard();
  });

  elements.canvas.addEventListener('pointerleave', () => {
    hoverCell = null;
    drawBoard();
  });

  elements.canvas.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') cursorCell.x = Math.max(0, cursorCell.x - 1);
    if (event.key === 'ArrowRight') cursorCell.x = Math.min(SIZE - 1, cursorCell.x + 1);
    if (event.key === 'ArrowUp') cursorCell.y = Math.max(0, cursorCell.y - 1);
    if (event.key === 'ArrowDown') cursorCell.y = Math.min(SIZE - 1, cursorCell.y + 1);
    if (event.key === 'Enter' || event.key === ' ') makeMove(cursorCell.x, cursorCell.y, currentPlayer, false);
    drawBoard();
  });

  root.querySelectorAll('input[name="mode"], input[name="difficulty"], input[name="side"]').forEach((input) => {
    input.addEventListener('change', () => {
      updateSettingVisibility();
      updateDescriptions();
      startNewGame();
    });
  });

  elements.ruleSelect.addEventListener('change', () => {
    updateDescriptions();
    startNewGame();
  });
  elements.sound.addEventListener('change', () => { readControls(); });
  elements.coordinates.addEventListener('change', () => { readControls(); resizeCanvas(); });
  elements.newGame.addEventListener('click', startNewGame);
  elements.undo.addEventListener('click', undoMove);
  elements.hint.addEventListener('click', requestHint);
  elements.dialogNew.addEventListener('click', startNewGame);
  elements.dialogClose.addEventListener('click', closeResultDialog);
  elements.resetRecord.addEventListener('click', () => {
    if (!window.confirm(labels.confirmReset)) return;
    stats = { ...defaultStats };
    statsSnapshotBeforeResult = null;
    saveJson(storageKeys.stats, stats);
    renderStats();
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(elements.boardFrame);
  } else {
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }
  window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 150));
  window.setInterval(() => {
    if (!gameOver) elements.timer.textContent = formatTime(Date.now() - startTime);
  }, 500);

  syncControlsFromSettings();
  renderStats();
  worker = initializeWorker();
  startNewGame();
}
