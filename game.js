(() => {
  const $ = (selector) => document.querySelector(selector);
  const getBest = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
  const setBest = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* 저장소가 비활성화된 환경 */ } };

  const rescueStatus = $('#rescue-status');
  const rescueScoreElement = $('#rescue-score');
  const rescueBestElement = $('#rescue-best');
  const rescueTimeElement = $('#rescue-time');
  const rescueBoard = $('#signal-board');
  let rescueTimer = null;
  let rescueScore = 0;
  let rescueTime = 30;
  let rescuePaused = false;
  const rescueRounds = [
    { action: 'observe', text: '새로운 오류 신호를 먼저 확인했습니다. +10점' },
    { action: 'mitigate', text: '영향 범위를 줄였습니다. +15점' },
    { action: 'rollback', text: '최근 변경을 되돌려 빠르게 안정화했습니다. +20점' }
  ];

  function stopRescue() { clearInterval(rescueTimer); rescueTimer = null; rescueBoard?.classList.remove('is-live'); }
  function resetRescue() { stopRescue(); rescueScore = 0; rescueTime = 30; rescuePaused = false; rescueScoreElement.textContent = '0'; rescueTimeElement.textContent = '30'; rescueBestElement.textContent = String(getBest('cloudOpsRescueBest')); rescueStatus.textContent = '시작을 누르고 제한 시간 안에 안전한 조치를 선택하세요.'; $('#rescue-pause').textContent = '일시정지'; }
  function finishRescue(message) { stopRescue(); const best = Math.max(getBest('cloudOpsRescueBest'), rescueScore); setBest('cloudOpsRescueBest', best); rescueBestElement.textContent = String(best); rescueStatus.textContent = `${message} 최종 점수 ${rescueScore}점. 재시작으로 다시 도전하세요.`; }
  function tickRescue() { if (rescuePaused) return; rescueTime -= 1; rescueTimeElement.textContent = String(rescueTime); if (rescueTime <= 0) finishRescue('시간이 끝났습니다.'); }
  function startRescue() { if (rescueTimer) return; rescuePaused = false; rescueBoard?.classList.add('is-live'); rescueStatus.textContent = '운영 중 — 신호를 읽고 가장 안전한 조치를 선택하세요.'; rescueTimer = setInterval(tickRescue, 1000); }
  function pauseRescue() { if (!rescueTimer) return; rescuePaused = !rescuePaused; $('#rescue-pause').textContent = rescuePaused ? '계속하기' : '일시정지'; rescueStatus.textContent = rescuePaused ? '일시정지됨 — 계속하기를 누르세요.' : '운영 재개 — 다음 조치를 선택하세요.'; }
  function chooseRescue(action) { if (!rescueTimer || rescuePaused) return; const round = rescueRounds[Math.floor(Math.random() * rescueRounds.length)]; const points = round.action === action ? Number(round.text.match(/\+(\d+)/)[1]) : -5; rescueScore = Math.max(0, rescueScore + points); rescueScoreElement.textContent = String(rescueScore); rescueStatus.textContent = round.action === action ? round.text : `조치 타이밍이 아쉽습니다. -5점. ${round.text}`; if (rescueScore >= 100) finishRescue('훌륭한 트리아지입니다.'); }
  $('#rescue-start')?.addEventListener('click', startRescue); $('#rescue-pause')?.addEventListener('click', pauseRescue); $('#rescue-restart')?.addEventListener('click', resetRescue); document.querySelectorAll('[data-rescue-action]').forEach((button) => button.addEventListener('click', () => chooseRescue(button.dataset.rescueAction)));
  document.addEventListener('keydown', (event) => { const actions = { '1': 'observe', '2': 'mitigate', '3': 'rollback' }; if (actions[event.key]) { event.preventDefault(); chooseRescue(actions[event.key]); } if (event.key === ' ' && rescueTimer) { event.preventDefault(); pauseRescue(); } });

  const incidentScenarios = [
    { question: '배포 직후 특정 리전에만 5xx가 증가했다. 첫 조치는?', options: ['전체 리전을 재시작한다.', '리전별 오류율과 배포 범위를 비교한다.', '알림을 끈다.'], correct: 1, explanation: '범위를 먼저 나누면 전역 장애인지 배포 영향인지 안전하게 좁힐 수 있습니다.' },
    { question: '지연 시간이 증가했지만 요청량은 일정하다. 무엇을 먼저 확인할까?', options: ['영향 서비스의 의존성 지연과 포화도를 확인한다.', '트래픽을 무조건 두 배로 늘린다.', '모든 로그를 삭제한다.'], correct: 0, explanation: '트래픽 변화가 없다면 내부 의존성이나 자원 포화가 핵심 단서입니다.' },
    { question: '메모리 사용량이 서서히 증가하고 있다. 가장 좋은 다음 행동은?', options: ['관측을 중단한다.', '증가 추세·배포·인스턴스별 차이를 함께 비교한다.', '모든 인스턴스를 동시에 교체한다.'], correct: 1, explanation: '추세와 변경 이력을 함께 보면 누수나 특정 버전 편향을 구분할 수 있습니다.' },
    { question: '캐시 적중률이 급락했지만 원인은 불명확하다. 우선할 것은?', options: ['캐시를 즉시 비운다.', '키 변경·만료 정책·백엔드 부하를 상관 분석한다.', '원본 DB를 삭제한다.'], correct: 1, explanation: '캐시를 비우면 부하가 더 커질 수 있으므로 관련 신호를 먼저 연결해야 합니다.' },
    { question: '장애 중 설정 변경 요청이 들어왔다. 안전한 판단은?', options: ['검증 없이 바로 반영한다.', '영향과 롤백 방법을 확인하고 승인된 완화만 적용한다.', '모든 변경을 영구 차단한다.'], correct: 1, explanation: '장애 중 변경은 가역성·영향 범위·승인 여부를 확인해야 합니다.' },
    { question: '한 노드에서만 오류가 반복된다. 다음 조치는?', options: ['전체 클러스터를 재생성한다.', '해당 노드의 로그·자원·배치된 워크로드를 비교한다.', '증상을 무시한다.'], correct: 1, explanation: '단일 노드 문제는 차이를 비교하는 방식이 가장 작은 범위의 조사입니다.' },
    { question: '알림이 짧은 간격으로 반복된다. 무엇을 먼저 할까?', options: ['알림을 영구 삭제한다.', '원인 이벤트와 알림 중복·억제 정책을 확인한다.', '모든 임계치를 0으로 바꾼다.'], correct: 1, explanation: '반복 알림은 원인 이벤트와 알림 정책을 분리해 확인해야 합니다.' },
    { question: '외부 의존성 응답이 느려졌다. 가장 안전한 완화는?', options: ['타임아웃과 재시도 폭주를 확인하고 필요하면 제한한다.', '재시도를 무한히 늘린다.', '의존성 호출 로그를 끈다.'], correct: 0, explanation: '재시도 폭주는 장애를 확대할 수 있어 타임아웃과 호출량을 함께 봐야 합니다.' },
    { question: '새 버전에서 오류가 늘었지만 전체 평균은 정상이다. 어떤 분석이 적절한가?', options: ['평균만 보고 종료한다.', '버전·엔드포인트·사용자 흐름별 분포를 비교한다.', '모든 버전을 동시에 롤백한다.'], correct: 1, explanation: '평균에 가려진 특정 경로의 회귀는 세분화된 분포에서 발견됩니다.' },
    { question: '디스크 사용량 경고가 발생했다. 첫 판단은?', options: ['큰 파일을 무작정 삭제한다.', '증가 원인과 보존 정책을 확인하고 안전한 정리를 계획한다.', '디스크 모니터링을 중지한다.'], correct: 1, explanation: '무작정 삭제하면 감사·복구에 필요한 데이터가 사라질 수 있습니다.' },
    { question: '트래픽 급증이 정상 이벤트인지 공격인지 모른다. 먼저 할 일은?', options: ['모든 요청을 차단한다.', '지역·경로·상태코드·속도 분포를 확인한다.', '증가를 무시한다.'], correct: 1, explanation: '트래픽 특성을 분해해야 용량 문제와 비정상 패턴을 구분할 수 있습니다.' },
    { question: '롤백 후 오류는 줄었지만 일부 사용자는 계속 실패한다. 다음은?', options: ['롤백 성공으로 종료한다.', '캐시·세션·리전별 잔여 영향과 오류 경로를 확인한다.', '사용자에게 재시작만 요청한다.'], correct: 1, explanation: '부분 회복은 잔여 상태나 특정 경로가 남아 있는지 확인해야 합니다.' },
    { question: '메트릭과 로그의 시간이 맞지 않는다. 무엇을 검증할까?', options: ['시간대·수집 지연·상관 ID를 확인한다.', '둘 중 하나를 삭제한다.', '시간 차이를 무시한다.'], correct: 0, explanation: '시간 기준과 수집 지연을 먼저 맞춰야 잘못된 인과 판단을 피할 수 있습니다.' },
    { question: '배치 작업이 평소보다 오래 걸린다. 가장 적절한 접근은?', options: ['작업을 중복 실행한다.', '입력량·처리 단계·외부 의존성의 구간별 시간을 비교한다.', '실패할 때까지 기다린다.'], correct: 1, explanation: '구간별 시간을 나누면 병목 지점을 좁히면서 중복 실행 위험을 줄일 수 있습니다.' },
    { question: '인증 실패가 특정 클라이언트에서만 증가한다. 먼저 볼 정보는?', options: ['전체 인증 시스템을 재시작한다.', '클라이언트 버전·토큰 만료·시간 동기화를 비교한다.', '실패 로그를 제거한다.'], correct: 1, explanation: '특정 클라이언트 편향은 버전·자격 증명·시간 동기화 차이가 단서입니다.' },
    { question: '오토스케일링이 계속 확장과 축소를 반복한다. 우선할 것은?', options: ['최대 용량을 무한히 늘린다.', '지표 지연·임계치·쿨다운과 실제 부하를 함께 확인한다.', '스케일링을 영구 비활성화한다.'], correct: 1, explanation: '진동은 지표와 정책의 시간 간격이 실제 부하와 맞지 않을 때 생길 수 있습니다.' },
    { question: '서비스 간 계약 변경이 의심된다. 안전한 조사 순서는?', options: ['호출자와 제공자 모두의 배포 버전·스키마·호환성을 비교한다.', '한쪽 로그만 삭제한다.', '전체 서비스를 재배포한다.'], correct: 0, explanation: '양쪽 버전과 계약을 비교해야 변경 원인을 좁힐 수 있습니다.' },
    { question: '장애 중 원인 후보가 세 가지다. 좋은 커뮤니케이션은?', options: ['확정되지 않은 원인을 단정한다.', '확인된 사실·가설·다음 확인 항목을 분리해 공유한다.', '아무 내용도 공유하지 않는다.'], correct: 1, explanation: '사실과 가설을 분리하면 팀이 중복 조사 없이 안전하게 움직일 수 있습니다.' },
    { question: '완화 후 서비스가 회복됐다. 운영자가 남겨야 할 것은?', options: ['아무 기록도 남기지 않는다.', '타임라인·영향·조치·남은 위험과 후속 작업을 기록한다.', '성공한 명령만 저장한다.'], correct: 1, explanation: '회복 뒤 기록은 재발 방지와 다음 대응의 품질을 높이는 운영 자산입니다.' },
    { question: '새로운 오류율 지표를 도입하려 한다. 먼저 확인할 것은?', options: ['대시보드 색상만 정한다.', '정의·집계 범위·샘플링·알림 임계치를 합의한다.', '임계치를 가장 낮게 설정한다.'], correct: 1, explanation: '지표 정의가 모호하면 알림과 의사결정 모두 신뢰하기 어렵습니다.' }
  ];
  let incidentOrder = []; let incidentIndex = 0; let incidentScore = 0;
  const shuffle = (items) => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
  function renderIncident() { const scenario = incidentOrder[incidentIndex]; $('#incident-count').textContent = `시나리오 ${incidentIndex + 1} / ${incidentOrder.length}`; $('#incident-question').textContent = scenario.question; const options = $('#incident-options'); const feedback = $('#incident-feedback'); const next = $('#incident-next'); feedback.hidden = true; next.hidden = true; $('#incident-score').textContent = String(incidentScore); options.innerHTML = ''; scenario.options.forEach((option, index) => { const button = document.createElement('button'); button.className = 'incident-option'; button.type = 'button'; button.textContent = option; button.addEventListener('click', () => answerIncident(index)); options.appendChild(button); }); $('#incident-status').textContent = '상황을 읽고 가장 안전한 다음 행동을 선택하세요.'; }
  function startIncident() { incidentOrder = shuffle(incidentScenarios); incidentIndex = 0; incidentScore = 0; renderIncident(); }
  function answerIncident(choice) { const scenario = incidentOrder[incidentIndex]; const correct = choice === scenario.correct; if (correct) incidentScore += 10; $('#incident-score').textContent = String(incidentScore); document.querySelectorAll('.incident-option').forEach((button) => { button.disabled = true; }); const feedback = $('#incident-feedback'); feedback.hidden = false; feedback.textContent = `${correct ? '정답 +10점. ' : '오답입니다. '} ${scenario.explanation}`; const next = $('#incident-next'); next.hidden = false; next.textContent = incidentIndex === incidentOrder.length - 1 ? '다시 시작' : '다음 시나리오'; $('#incident-status').textContent = correct ? '좋은 판단입니다.' : '오답 해설을 확인하세요.'; }
  function nextIncident() { if (incidentIndex === incidentOrder.length - 1) { const best = Math.max(getBest('cloudOpsIncidentBest'), incidentScore); setBest('cloudOpsIncidentBest', best); $('#incident-best').textContent = String(best); startIncident(); } else { incidentIndex += 1; renderIncident(); } }
  document.querySelectorAll('[data-game-tab]').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('[data-game-tab]').forEach((item) => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); }); const target = tab.dataset.gameTab; $('#rescue-panel').hidden = target !== 'rescue'; $('#incident-panel').hidden = target !== 'incident'; }));
  $('#incident-next')?.addEventListener('click', nextIncident); $('#incident-best').textContent = String(getBest('cloudOpsIncidentBest')); resetRescue(); startIncident();
})();
