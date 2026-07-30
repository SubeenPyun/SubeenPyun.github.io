(() => {
  const board = document.querySelector('#snake-board');
  const ctx = board?.getContext('2d');
  const grid = 16;
  const cell = board ? board.width / grid : 20;
  const snakeScore = document.querySelector('#snake-score');
  const snakeBest = document.querySelector('#snake-best');
  const snakeStatus = document.querySelector('#snake-status');
  const snakePauseButton = document.querySelector('#snake-pause');
  const incidentScoreElement = document.querySelector('#incident-score');
  const incidentScenarios = [
    {
      question: '오전 배포 직후 5xx 비율이 상승했습니다. 가장 먼저 할 일은?',
      options: ['모든 서버를 즉시 재시작한다.', '배포 시점과 오류 지표·로그를 함께 확인한다.', '문제가 사라질 때까지 기다린다.'],
      correct: 1,
      explanation: '변화가 시작된 시점과 관련 신호를 먼저 맞춰 보면 원인 범위를 안전하게 좁힐 수 있습니다.'
    },
    {
      question: '한 서비스의 지연 시간이 급증했지만 전체 트래픽은 정상입니다. 다음 판단은?',
      options: ['영향받는 서비스와 의존성을 분리해 확인한다.', '트래픽을 무조건 두 배로 늘린다.', '모든 알림을 끈다.'],
      correct: 0,
      explanation: '전체 트래픽이 정상이라면 특정 서비스나 의존성의 병목인지 분리해서 확인하는 것이 안전합니다.'
    },
    {
      question: '원인이 불명확한 장애가 계속되고 있습니다. 가장 안전한 완화 조치는?',
      options: ['변경 사항을 더 많이 한꺼번에 적용한다.', '영향 범위를 줄이는 롤백 또는 트래픽 완화를 검토한다.', '로그를 삭제해 저장 공간을 확보한다.'],
      correct: 1,
      explanation: '원인이 불명확할수록 되돌릴 수 있고 영향 범위를 줄이는 조치를 우선해야 합니다.'
    }
  ];

  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = directions.right;
  let nextDirection = direction;
  let timer = null;
  let snakeGameOver = false;
  let incidentIndex = 0;
  let incidentScore = 0;

  function storageGet(key) {
    try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* storage may be disabled */ }
  }

  function resetSnake() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    direction = directions.right;
    nextDirection = direction;
    snakeGameOver = false;
    snakeScore.textContent = '0';
    snakeBest.textContent = String(storageGet('cloudOpsSnakeBest'));
    snakePauseButton.textContent = 'Pause';
    snakeStatus.textContent = '시작 버튼을 눌러 플레이하세요.';
    placeFood();
    drawSnake();
  }

  function placeFood() {
    do { food = { x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) }; } while (snake.some((part) => part.x === food.x && part.y === food.y));
  }

  function drawSnake() {
    if (!ctx) return;
    ctx.fillStyle = '#06111c';
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.strokeStyle = 'rgba(180, 221, 246, .08)';
    for (let i = 1; i < grid; i += 1) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, board.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(board.width, i * cell); ctx.stroke(); }
    ctx.fillStyle = '#8fe6ff';
    ctx.beginPath(); ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * .25, 0, Math.PI * 2); ctx.fill();
    snake.forEach((part, index) => { ctx.fillStyle = index === 0 ? '#eef7ff' : '#8da9ff'; ctx.fillRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4); });
  }

  function stepSnake() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= grid || head.y < 0 || head.y >= grid;
    const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) { endSnake(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { const score = snake.length - 3; snakeScore.textContent = String(score); const best = Math.max(storageGet('cloudOpsSnakeBest'), score); storageSet('cloudOpsSnakeBest', best); snakeBest.textContent = String(best); placeFood(); } else { snake.pop(); }
    drawSnake();
  }

  function endSnake() {
    clearInterval(timer);
    timer = null;
    snakeGameOver = true;
    snakeStatus.textContent = '게임 오버 — Restart로 다시 시작하세요.';
  }

  function startSnake() {
    if (timer !== null) return;
    if (snakeGameOver) resetSnake();
    snakeStatus.textContent = '운영 중 — 방향키, WASD 또는 터치로 이동하세요.';
    snakePauseButton.textContent = 'Pause';
    timer = setInterval(stepSnake, 140);
  }

  function pauseSnake() {
    if (timer === null) { if (snakeGameOver || snakePauseButton.textContent !== 'Resume') return; startSnake(); return; }
    clearInterval(timer);
    timer = null;
    snakePauseButton.textContent = 'Resume';
    snakeStatus.textContent = '일시정지됨 — Resume으로 계속하세요.';
  }

  function setDirection(name) {
    const candidate = directions[name];
    if (!candidate || (candidate.x + direction.x === 0 && candidate.y + direction.y === 0)) return;
    nextDirection = candidate;
  }

  function renderIncident() {
    const scenario = incidentScenarios[incidentIndex];
    document.querySelector('#incident-count').textContent = `Scenario ${incidentIndex + 1} / ${incidentScenarios.length}`;
    document.querySelector('#incident-question').textContent = scenario.question;
    const options = document.querySelector('#incident-options');
    const feedback = document.querySelector('#incident-feedback');
    const next = document.querySelector('#incident-next');
    feedback.hidden = true;
    next.hidden = true;
    incidentScoreElement.textContent = String(incidentScore);
    options.innerHTML = '';
    scenario.options.forEach((option, index) => { const button = document.createElement('button'); button.className = 'incident-option'; button.type = 'button'; button.textContent = option; button.addEventListener('click', () => answerIncident(index)); options.appendChild(button); });
    document.querySelector('#incident-status').textContent = '상황을 읽고 가장 안전한 다음 행동을 선택하세요.';
  }

  function answerIncident(choice) {
    const scenario = incidentScenarios[incidentIndex];
    const correct = choice === scenario.correct;
    if (correct) incidentScore += 10;
    incidentScoreElement.textContent = String(incidentScore);
    document.querySelectorAll('.incident-option').forEach((button) => { button.disabled = true; });
    const feedback = document.querySelector('#incident-feedback');
    feedback.hidden = false;
    feedback.textContent = `${correct ? '정답 +10점. ' : '다시 생각해볼 지점입니다. '} ${scenario.explanation}`;
    const next = document.querySelector('#incident-next');
    next.hidden = false;
    next.textContent = incidentIndex === incidentScenarios.length - 1 ? 'Play again' : 'Next scenario';
    document.querySelector('#incident-status').textContent = correct ? '좋은 판단입니다.' : '오답 해설을 확인하세요.';
  }

  function nextIncident() {
    if (incidentIndex === incidentScenarios.length - 1) { const best = Math.max(storageGet('cloudOpsIncidentBest'), incidentScore); storageSet('cloudOpsIncidentBest', best); document.querySelector('#incident-best').textContent = String(best); incidentIndex = 0; incidentScore = 0; } else { incidentIndex += 1; }
    renderIncident();
  }

  function setupTabs() {
    document.querySelectorAll('[data-game-tab]').forEach((tab) => tab.addEventListener('click', () => { const target = tab.dataset.gameTab; document.querySelectorAll('[data-game-tab]').forEach((item) => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); }); document.querySelector('#snake-panel').hidden = target !== 'snake'; document.querySelector('#incident-panel').hidden = target !== 'incident'; }));
  }

  document.querySelector('#snake-start').addEventListener('click', startSnake);
  document.querySelector('#snake-pause').addEventListener('click', pauseSnake);
  document.querySelector('#snake-restart').addEventListener('click', () => { if (timer !== null) clearInterval(timer); timer = null; resetSnake(); });
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => setDirection(button.dataset.direction)));
  document.addEventListener('keydown', (event) => { const keys = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }; if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); } if (event.key === ' ' && timer !== null) { event.preventDefault(); pauseSnake(); } });
  document.querySelector('#incident-next').addEventListener('click', nextIncident);
  document.querySelector('#incident-best').textContent = String(storageGet('cloudOpsIncidentBest'));
  setupTabs();
  resetSnake();
  renderIncident();
})();
