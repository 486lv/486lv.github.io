(function () {
  function enhanceHomeHero() {
    var header = document.querySelector('#page-header.full_page');
    var siteInfo = header && header.querySelector('#site-info');
    if (!siteInfo) return;
    header.classList.add('minimal-enhanced');
    siteInfo.querySelectorAll('.minimal-hero-showcase').forEach(function (element) { element.remove(); });
    if (siteInfo.querySelector('.minimal-hero-actions')) return;

    var settings = window.__THORN_APPEARANCE__ || {};
    var title = siteInfo.querySelector('#site-title');
    var subtitle = siteInfo.querySelector('#subtitle');
    if (!subtitle) {
      var subtitleWrap = document.createElement('div');
      subtitleWrap.id = 'site-subtitle';
      subtitle = document.createElement('span');
      subtitle.id = 'subtitle';
      subtitleWrap.appendChild(subtitle);
      if (title && title.nextSibling) siteInfo.insertBefore(subtitleWrap, title.nextSibling);
      else siteInfo.appendChild(subtitleWrap);
    }
    if (title && settings.heroTitle) title.textContent = settings.heroTitle;
    if (subtitle && settings.heroSubtitle) subtitle.textContent = settings.heroSubtitle;

    var eyebrow = document.createElement('p');
    eyebrow.className = 'minimal-hero-eyebrow';
    eyebrow.textContent = settings.heroEyebrow || 'THORN · NOTES & FIELDWORK';
    siteInfo.insertBefore(eyebrow, title || siteInfo.firstChild);

    var actions = document.createElement('div');
    actions.className = 'minimal-hero-actions';
    var primary = document.createElement('a');
    primary.href = settings.primaryActionHref || '#content-inner';
    primary.textContent = settings.primaryActionLabel || '阅读文章';
    var secondary = document.createElement('a');
    secondary.href = settings.secondaryActionHref || '/about/';
    secondary.textContent = settings.secondaryActionLabel || '关于我';
    if (settings.showPrimaryAction !== false) actions.appendChild(primary);
    if (settings.showSecondaryAction !== false) actions.appendChild(secondary);
    siteInfo.appendChild(actions);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { header.classList.add('hero-is-ready'); });
    });

  }

  function revealContent() {
    var items = document.querySelectorAll('#recent-posts .recent-post-item:not(.reveal-observed)');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (item) { item.classList.add('reveal-is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.body.classList.add('home-reveal-enabled');
    items.forEach(function (item, index) {
      item.classList.add('reveal-observed');
      item.style.transitionDelay = Math.min(index, 4) * 70 + 'ms';
      observer.observe(item);
    });
  }

  function buildPlayground() {
    var section = document.querySelector('.playground-page');
    if (!section || section.dataset.gameReady === 'true') return;
    section.dataset.gameReady = 'true';
    function readRecord(key) {
      try { return Number(window.localStorage.getItem(key)) || 0; } catch (error) { return 0; }
    }
    function writeRecord(key, value) {
      try { window.localStorage.setItem(key, String(value)); } catch (error) {}
    }
    function updateHubRecord(name, value) {
      var node = section.querySelector('[data-record="' + name + '"]');
      if (node) node.textContent = value;
    }
    var hub = section.querySelector('.arcade-hub');
    var gameView = section.querySelector('.arcade-game-view');
    var gameModules = Array.from(section.querySelectorAll('[data-game]'));
    function openGame(name) {
      hub.hidden = true;
      gameView.hidden = false;
      gameModules.forEach(function (module) { module.hidden = module.dataset.game !== name; });
      window.location.hash = 'game-' + name;
      gameView.scrollIntoView({ block: 'start' });
    }
    function closeGame() {
      window.clearInterval(snakeTimer);
      snakeTimer = 0;
      window.clearInterval(tetrisTimer);
      tetrisTimer = 0;
      if (aimFrame) window.cancelAnimationFrame(aimFrame);
      var aimPanel = section.querySelector('.aim-lab');
      if (aimPanel) aimPanel.dataset.running = 'false';
      gameModules.forEach(function (module) { module.hidden = true; });
      gameView.hidden = true;
      hub.hidden = false;
      if (window.location.hash.indexOf('#game-') === 0) history.replaceState(null, '', window.location.pathname);
      hub.scrollIntoView({ block: 'start' });
    }
    section.querySelectorAll('[data-open-game]').forEach(function (button) {
      button.addEventListener('click', function () { openGame(button.dataset.openGame); });
    });
    section.querySelector('.arcade-back').addEventListener('click', closeGame);
    ['reaction', 'memory', 'aim', 'snake', 'tetris', 'gomoku'].forEach(function (name) {
      var key = name === 'reaction' ? 'thorn-reaction-best' : name === 'aim' ? 'thorn-aim-best' : 'thorn-' + name + '-best';
      var value = readRecord(key);
      updateHubRecord(name, name === 'reaction' && !value ? '—' : (name === 'memory' ? String(value).padStart(2, '0') : value));
    });
    if (window.location.hash.indexOf('#game-') === 0) {
      var requested = window.location.hash.replace('#game-', '');
      if (gameModules.some(function (module) { return module.dataset.game === requested; })) openGame(requested);
    }
    var lab = section.querySelector('.reaction-lab');
    var status = lab.querySelector('.reaction-status');
    var title = lab.querySelector('.reaction-copy strong');
    var hint = lab.querySelector('.reaction-copy small');
    var bestNode = lab.querySelector('.reaction-score b');
    var timer = 0;
    var started = 0;
    var best = 0;
    try { best = Number(window.localStorage.getItem('thorn-reaction-best')) || 0; } catch (error) {}
    if (best) bestNode.textContent = best;

    function setState(state, headline, note) {
      lab.dataset.state = state;
      status.textContent = state === 'waiting' ? 'WAIT…' : state === 'go' ? 'NOW!' : state === 'early' ? 'TOO EARLY' : state === 'result' ? 'RECORDED' : 'READY?';
      title.textContent = headline;
      hint.textContent = note;
      lab.setAttribute('aria-label', headline + '。' + note);
    }
    function act() {
      var state = lab.dataset.state;
      if (state === 'waiting') {
        window.clearTimeout(timer);
        setState('early', '抢跑了', '点击重新开始，再耐心一点');
      } else if (state === 'go') {
        var score = Math.round(performance.now() - started);
        if (!best || score < best) {
          best = score;
          bestNode.textContent = score;
          writeRecord('thorn-reaction-best', score);
          updateHubRecord('reaction', score);
        }
        setState('result', score + ' ms', score < 220 ? '很快。再来一次？' : '还可以更快，点击重试');
      } else {
        setState('waiting', '等它变亮', '现在点击会被判定为抢跑');
        timer = window.setTimeout(function () {
          started = performance.now();
          setState('go', '现在！', '点击目标');
        }, 1100 + Math.random() * 2200);
      }
    }
    lab.addEventListener('click', act);
    lab.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); act(); }
    });

    var memory = section.querySelector('.memory-lab');
    var cells = Array.from(memory.querySelectorAll('.memory-board button'));
    var memoryLevel = memory.querySelector('.memory-level');
    var memoryMessage = memory.querySelector('.memory-message');
    var memoryStart = memory.querySelector('.memory-start');
    var sequence = [];
    var inputIndex = 0;
    var accepting = false;
    var memoryBest = readRecord('thorn-memory-best');
    function delay(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }
    async function showSequence() {
      accepting = false;
      memoryMessage.textContent = '注意看';
      await delay(450);
      for (var i = 0; i < sequence.length; i += 1) {
        cells[sequence[i]].classList.add('is-lit');
        await delay(Math.max(220, 480 - sequence.length * 18));
        cells[sequence[i]].classList.remove('is-lit');
        await delay(130);
      }
      inputIndex = 0;
      accepting = true;
      memoryMessage.textContent = '轮到你了';
    }
    function nextMemoryLevel() {
      sequence.push(Math.floor(Math.random() * cells.length));
      memoryLevel.textContent = String(sequence.length).padStart(2, '0');
      if (sequence.length > memoryBest) {
        memoryBest = sequence.length;
        writeRecord('thorn-memory-best', memoryBest);
        updateHubRecord('memory', String(memoryBest).padStart(2, '0'));
      }
      showSequence();
    }
    memoryStart.addEventListener('click', function () {
      sequence = [];
      memoryStart.textContent = '重新开始';
      nextMemoryLevel();
    });
    cells.forEach(function (cell, cellIndex) {
      cell.addEventListener('click', async function () {
        if (!accepting) return;
        cell.classList.add('is-pressed');
        window.setTimeout(function () { cell.classList.remove('is-pressed'); }, 160);
        if (cellIndex !== sequence[inputIndex]) {
          accepting = false;
          memory.classList.add('has-error');
          memoryMessage.textContent = '序列中断 · 到达 LEVEL ' + String(sequence.length).padStart(2, '0');
          window.setTimeout(function () { memory.classList.remove('has-error'); }, 500);
          return;
        }
        inputIndex += 1;
        if (inputIndex === sequence.length) {
          accepting = false;
          memoryMessage.textContent = '正确';
          await delay(520);
          nextMemoryLevel();
        }
      });
    });

    var aim = section.querySelector('.aim-lab');
    var aimTarget = aim.querySelector('.aim-target');
    var aimStart = aim.querySelector('.aim-start');
    var aimIdleScore = aim.querySelector('.aim-idle b');
    var aimTime = aim.querySelector('.aim-time');
    var aimHits = aim.querySelector('.aim-hits');
    var aimBest = aim.querySelector('.aim-best');
    var hits = 0;
    var aimEnd = 0;
    var aimFrame = 0;
    var bestHits = 0;
    bestHits = readRecord('thorn-aim-best');
    aimBest.textContent = bestHits;
    function moveTarget() {
      var size = aimTarget.offsetWidth || 64;
      var x = 18 + Math.random() * Math.max(1, aim.clientWidth - size - 36);
      var y = 62 + Math.random() * Math.max(1, aim.clientHeight - size - 86);
      aimTarget.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
    }
    function finishAim() {
      window.cancelAnimationFrame(aimFrame);
      aim.dataset.running = 'false';
      aimIdleScore.textContent = String(hits);
      aim.querySelector('.aim-idle span').textContent = 'HITS · AGAIN?';
      aimStart.textContent = '再来一次';
      if (hits > bestHits) {
        bestHits = hits;
        aimBest.textContent = bestHits;
        writeRecord('thorn-aim-best', bestHits);
        updateHubRecord('aim', bestHits);
      }
    }
    function tickAim(now) {
      if (!document.body.contains(aim) || aim.dataset.running !== 'true') return;
      var left = Math.max(0, aimEnd - now);
      aimTime.textContent = (left / 1000).toFixed(1);
      if (left <= 0) { finishAim(); return; }
      aimFrame = window.requestAnimationFrame(tickAim);
    }
    aimStart.addEventListener('click', function () {
      hits = 0;
      aimHits.textContent = '0';
      aimTime.textContent = '15.0';
      aim.dataset.running = 'true';
      aimEnd = performance.now() + 15000;
      moveTarget();
      aimFrame = window.requestAnimationFrame(tickAim);
    });
    aimTarget.addEventListener('click', function () {
      if (aim.dataset.running !== 'true') return;
      hits += 1;
      aimHits.textContent = String(hits);
      moveTarget();
    });

    var snakeCanvas = section.querySelector('.snake-canvas');
    var snakeContext = snakeCanvas.getContext('2d');
    var snakeScoreNode = section.querySelector('.snake-score');
    var snakeBestNode = section.querySelector('.snake-best');
    var snakeStart = section.querySelector('.snake-start');
    var snake = [];
    var snakeFood = { x: 5, y: 5 };
    var snakeDirection = { x: 1, y: 0 };
    var snakeNextDirection = snakeDirection;
    var snakeTimer = 0;
    var snakeScore = 0;
    var snakeBest = readRecord('thorn-snake-best');
    snakeBestNode.textContent = snakeBest;
    function drawSnake() {
      var cell = snakeCanvas.width / 20;
      snakeContext.fillStyle = '#171717';
      snakeContext.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
      snakeContext.strokeStyle = 'rgba(255,255,255,.045)';
      for (var grid = 0; grid <= 20; grid += 1) {
        snakeContext.beginPath(); snakeContext.moveTo(grid * cell, 0); snakeContext.lineTo(grid * cell, snakeCanvas.height); snakeContext.stroke();
        snakeContext.beginPath(); snakeContext.moveTo(0, grid * cell); snakeContext.lineTo(snakeCanvas.width, grid * cell); snakeContext.stroke();
      }
      snakeContext.fillStyle = '#d8ff3e';
      snakeContext.beginPath();
      snakeContext.arc((snakeFood.x + .5) * cell, (snakeFood.y + .5) * cell, cell * .3, 0, Math.PI * 2);
      snakeContext.fill();
      snake.forEach(function (part, index) {
        snakeContext.fillStyle = index === 0 ? '#fff' : '#777';
        snakeContext.fillRect(part.x * cell + 3, part.y * cell + 3, cell - 6, cell - 6);
      });
    }
    function placeSnakeFood() {
      do { snakeFood = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) }; }
      while (snake.some(function (part) { return part.x === snakeFood.x && part.y === snakeFood.y; }));
    }
    function stopSnake() {
      window.clearInterval(snakeTimer);
      snakeTimer = 0;
      snakeStart.textContent = '重新开始';
    }
    function stepSnake() {
      snakeDirection = snakeNextDirection;
      var head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y };
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(function (part) { return part.x === head.x && part.y === head.y; })) {
        stopSnake();
        return;
      }
      snake.unshift(head);
      if (head.x === snakeFood.x && head.y === snakeFood.y) {
        snakeScore += 10;
        snakeScoreNode.textContent = snakeScore;
        if (snakeScore > snakeBest) {
          snakeBest = snakeScore;
          snakeBestNode.textContent = snakeBest;
          updateHubRecord('snake', snakeBest);
          writeRecord('thorn-snake-best', snakeBest);
        }
        placeSnakeFood();
      } else snake.pop();
      drawSnake();
    }
    function startSnake() {
      stopSnake();
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      snakeDirection = { x: 1, y: 0 };
      snakeNextDirection = snakeDirection;
      snakeScore = 0;
      snakeScoreNode.textContent = '0';
      snakeStart.textContent = '游戏中';
      placeSnakeFood();
      drawSnake();
      snakeTimer = window.setInterval(stepSnake, 125);
    }
    function setSnakeDirection(name) {
      var directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      var next = directions[name];
      if (next && !(next.x === -snakeDirection.x && next.y === -snakeDirection.y)) snakeNextDirection = next;
    }
    snakeStart.addEventListener('click', startSnake);
    section.querySelectorAll('.direction-pad button').forEach(function (button) {
      button.addEventListener('click', function () { setSnakeDirection(button.dataset.dir); });
    });
    document.addEventListener('keydown', function (event) {
      if (section.querySelector('[data-game="snake"]').hidden) return;
      var keyDirections = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
      if (keyDirections[event.key]) { event.preventDefault(); setSnakeDirection(keyDirections[event.key]); }
    });
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    drawSnake();

    var tetrisCanvas = section.querySelector('.tetris-canvas');
    var tetrisContext = tetrisCanvas.getContext('2d');
    var tetrisLinesNode = section.querySelector('.tetris-lines');
    var tetrisBestNode = section.querySelector('.tetris-best');
    var tetrisStart = section.querySelector('.tetris-start');
    var tetrisBoard = [];
    var tetrisPiece = null;
    var tetrisTimer = 0;
    var tetrisLines = 0;
    var tetrisBest = readRecord('thorn-tetris-best');
    var tetrominoes = [
      [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
      [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]]
    ];
    tetrisBestNode.textContent = tetrisBest;
    function resetTetrisBoard() { tetrisBoard = Array.from({ length: 20 }, function () { return Array(10).fill(0); }); }
    function newTetrisPiece() {
      tetrisPiece = { shape: tetrominoes[Math.floor(Math.random() * tetrominoes.length)].map(function (row) { return row.slice(); }), x: 3, y: 0, color: 1 + Math.floor(Math.random() * 5) };
      if (tetrisCollides(0, 0, tetrisPiece.shape)) { window.clearInterval(tetrisTimer); tetrisTimer = 0; tetrisStart.textContent = '重新开始'; }
    }
    function tetrisCollides(dx, dy, shape) {
      return shape.some(function (row, y) { return row.some(function (value, x) {
        if (!value) return false;
        var nx = tetrisPiece.x + x + dx, ny = tetrisPiece.y + y + dy;
        return nx < 0 || nx >= 10 || ny >= 20 || (ny >= 0 && tetrisBoard[ny][nx]);
      }); });
    }
    function drawTetris() {
      var cell = 36;
      var colors = ['#222', '#d8ff3e', '#fff', '#7468ff', '#ff5b4d', '#59d7ff'];
      tetrisContext.fillStyle = '#171717'; tetrisContext.fillRect(0, 0, 360, 720);
      function drawCell(x, y, color) { tetrisContext.fillStyle = colors[color]; tetrisContext.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4); }
      tetrisBoard.forEach(function (row, y) { row.forEach(function (value, x) { if (value) drawCell(x, y, value); }); });
      if (tetrisPiece) tetrisPiece.shape.forEach(function (row, y) { row.forEach(function (value, x) { if (value) drawCell(tetrisPiece.x + x, tetrisPiece.y + y, tetrisPiece.color); }); });
    }
    function lockTetris() {
      tetrisPiece.shape.forEach(function (row, y) { row.forEach(function (value, x) { if (value && tetrisPiece.y + y >= 0) tetrisBoard[tetrisPiece.y + y][tetrisPiece.x + x] = tetrisPiece.color; }); });
      var before = tetrisBoard.length;
      tetrisBoard = tetrisBoard.filter(function (row) { return row.some(function (value) { return !value; }); });
      var cleared = before - tetrisBoard.length;
      while (tetrisBoard.length < 20) tetrisBoard.unshift(Array(10).fill(0));
      if (cleared) {
        tetrisLines += cleared;
        tetrisLinesNode.textContent = tetrisLines;
        if (tetrisLines > tetrisBest) {
          tetrisBest = tetrisLines; tetrisBestNode.textContent = tetrisBest; updateHubRecord('tetris', tetrisBest); writeRecord('thorn-tetris-best', tetrisBest);
        }
      }
      newTetrisPiece();
    }
    function moveTetris(action) {
      if (!tetrisPiece || !tetrisTimer) return;
      if (action === 'left' && !tetrisCollides(-1, 0, tetrisPiece.shape)) tetrisPiece.x -= 1;
      else if (action === 'right' && !tetrisCollides(1, 0, tetrisPiece.shape)) tetrisPiece.x += 1;
      else if (action === 'rotate') {
        var rotated = tetrisPiece.shape[0].map(function (_, index) { return tetrisPiece.shape.map(function (row) { return row[index]; }).reverse(); });
        if (!tetrisCollides(0, 0, rotated)) tetrisPiece.shape = rotated;
      } else if (action === 'drop') {
        while (!tetrisCollides(0, 1, tetrisPiece.shape)) tetrisPiece.y += 1;
        lockTetris();
      }
      drawTetris();
    }
    function tetrisTick() {
      if (!tetrisCollides(0, 1, tetrisPiece.shape)) tetrisPiece.y += 1;
      else lockTetris();
      drawTetris();
    }
    function startTetris() {
      window.clearInterval(tetrisTimer); resetTetrisBoard(); tetrisLines = 0; tetrisLinesNode.textContent = '0'; newTetrisPiece(); drawTetris(); tetrisStart.textContent = '游戏中'; tetrisTimer = window.setInterval(tetrisTick, 520);
    }
    tetrisStart.addEventListener('click', startTetris);
    section.querySelectorAll('.tetris-controls button').forEach(function (button) { button.addEventListener('click', function () { moveTetris(button.dataset.action); }); });
    document.addEventListener('keydown', function (event) {
      if (section.querySelector('[data-game="tetris"]').hidden) return;
      var actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'drop', ' ': 'drop' };
      if (actions[event.key]) { event.preventDefault(); moveTetris(actions[event.key]); }
    });
    resetTetrisBoard(); drawTetris();

    var gomokuCanvas = section.querySelector('.gomoku-canvas');
    var gomokuContext = gomokuCanvas.getContext('2d');
    var gomokuTurnNode = section.querySelector('.gomoku-turn');
    var gomokuWinsNode = section.querySelector('.gomoku-wins');
    var gomokuMessage = section.querySelector('.gomoku-message');
    var gomokuBoard = [];
    var gomokuTurn = 1;
    var gomokuOver = false;
    var gomokuWins = readRecord('thorn-gomoku-best');
    gomokuWinsNode.textContent = gomokuWins;
    function drawGomoku() {
      var gap = 45, offset = 45;
      gomokuContext.fillStyle = '#e2c38e'; gomokuContext.fillRect(0, 0, 720, 720);
      gomokuContext.strokeStyle = '#5b4526'; gomokuContext.lineWidth = 1;
      for (var line = 0; line < 15; line += 1) {
        gomokuContext.beginPath(); gomokuContext.moveTo(offset, offset + line * gap); gomokuContext.lineTo(offset + 14 * gap, offset + line * gap); gomokuContext.stroke();
        gomokuContext.beginPath(); gomokuContext.moveTo(offset + line * gap, offset); gomokuContext.lineTo(offset + line * gap, offset + 14 * gap); gomokuContext.stroke();
      }
      gomokuBoard.forEach(function (row, y) { row.forEach(function (value, x) {
        if (!value) return;
        gomokuContext.beginPath(); gomokuContext.arc(offset + x * gap, offset + y * gap, 17, 0, Math.PI * 2);
        gomokuContext.fillStyle = value === 1 ? '#111' : '#f7f7f2'; gomokuContext.fill();
        gomokuContext.strokeStyle = value === 1 ? '#000' : '#aaa'; gomokuContext.stroke();
      }); });
    }
    function resetGomoku() {
      gomokuBoard = Array.from({ length: 15 }, function () { return Array(15).fill(0); }); gomokuTurn = 1; gomokuOver = false; gomokuTurnNode.textContent = '黑'; gomokuMessage.textContent = '点击棋盘落子'; drawGomoku();
    }
    function gomokuWon(x, y, player) {
      return [[1,0],[0,1],[1,1],[1,-1]].some(function (direction) {
        var count = 1;
        [-1, 1].forEach(function (sign) {
          var nx = x + direction[0] * sign, ny = y + direction[1] * sign;
          while (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && gomokuBoard[ny][nx] === player) { count += 1; nx += direction[0] * sign; ny += direction[1] * sign; }
        });
        return count >= 5;
      });
    }
    gomokuCanvas.addEventListener('click', function (event) {
      if (gomokuOver) return;
      var rect = gomokuCanvas.getBoundingClientRect();
      var scaleX = gomokuCanvas.width / rect.width, scaleY = gomokuCanvas.height / rect.height;
      var x = Math.round(((event.clientX - rect.left) * scaleX - 45) / 45), y = Math.round(((event.clientY - rect.top) * scaleY - 45) / 45);
      if (x < 0 || x >= 15 || y < 0 || y >= 15 || gomokuBoard[y][x]) return;
      gomokuBoard[y][x] = gomokuTurn; drawGomoku();
      if (gomokuWon(x, y, gomokuTurn)) {
        gomokuOver = true; gomokuMessage.textContent = (gomokuTurn === 1 ? '黑方' : '白方') + '胜利';
        if (gomokuTurn === 1) { gomokuWins += 1; gomokuWinsNode.textContent = gomokuWins; updateHubRecord('gomoku', gomokuWins); writeRecord('thorn-gomoku-best', gomokuWins); }
      } else { gomokuTurn = gomokuTurn === 1 ? 2 : 1; gomokuTurnNode.textContent = gomokuTurn === 1 ? '黑' : '白'; }
    });
    section.querySelector('.gomoku-reset').addEventListener('click', resetGomoku);
    resetGomoku();
  }

  function initMinimalExperience() {
    enhanceHomeHero();
    buildPlayground();
    revealContent();
  }

  document.addEventListener('DOMContentLoaded', initMinimalExperience);
  document.addEventListener('pjax:complete', initMinimalExperience);
})();
