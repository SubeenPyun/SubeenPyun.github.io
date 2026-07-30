(() => {
  const $ = (selector) => document.querySelector(selector);
  const currentLanguage = () => window.siteLanguage === 'en' ? 'en' : 'ko';
  const gameText = {
    rescueStart: { ko: '시작', en: 'Start' },
    rescuePause: { ko: '일시정지', en: 'Pause' },
    rescueResume: { ko: '계속하기', en: 'Resume' },
    rescueGuide: { ko: '대시보드의 메트릭과 로그를 읽고 첫 조치를 선택하세요.', en: 'Read the dashboard metrics and logs, then choose your first action.' },
    incidentPause: { ko: '일시정지', en: 'Pause' },
    incidentResume: { ko: '계속하기', en: 'Resume' },
    incidentGuide: { ko: '메트릭과 상황을 빠르게 읽고 판단하세요.', en: 'Read the metrics and situation quickly, then decide.' },
    incidentNext: { ko: '다음 시나리오', en: 'Next scenario' },
    incidentRestart: { ko: '다시 시작', en: 'Restart' }
  };
  const text = (key) => gameText[key]?.[currentLanguage()] || gameText[key]?.ko || '';
  const getBest = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
  const setBest = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* 저장소가 비활성화된 환경 */ } };

  const rescueStatus = $('#rescue-status');
  const rescueScoreElement = $('#rescue-score');
  const rescueBestElement = $('#rescue-best');
  const rescueTimeElement = $('#rescue-time');
  const rescueLog = $('#rescue-log');
  let rescueTimer = null; let rescueAdvanceTimer = null; let rescueScore = 0; let rescueStreak = 0; let rescueTime = 45; let rescuePaused = false; let rescueRoundIndex = 0; let rescueRound = null;
  const rescueRounds = [
    { metrics: ['8.6%', '1.8s', '86%', '2.4k/s'], trends: ['↑ +6.2%', '↑ +920ms', '↑ +31%', '↑ +80%'], logs: ['10:42:11 WARN api-gateway 5xx_rate=8.6%', '10:42:13 deploy checkout-api v2.8.1 completed', '10:42:14 upstream timeout route=/checkout'], action: 'rollback', explanation: '오류율·지연시간이 배포 직후 함께 증가했고 로그에도 새 버전과 타임아웃이 보입니다. 롤백이 가장 빠른 가역 조치입니다.' },
    { metrics: ['0.7%', '2.7s', '91%', '1.1k/s'], trends: ['steady', '↑ +1.4s', '↑ +44%', '↓ -12%'], logs: ['11:08:01 WARN worker queue_depth=18420', '11:08:03 INFO request_rate=1.1k/s', '11:08:05 WARN cpu throttling pod/worker-7'], action: 'mitigate', explanation: '요청량은 줄었지만 큐와 CPU throttling이 증가했습니다. 먼저 영향을 줄이는 완화 조치가 적절합니다.' },
    { metrics: ['0.2%', '220ms', '38%', '5.8k/s'], trends: ['steady', 'steady', 'healthy', '↑ +220%'], logs: ['11:36:20 INFO traffic_spike region=ap-northeast', '11:36:21 INFO error_budget impact=low', '11:36:24 WARN autoscaler pending_replicas=8'], action: 'observe', explanation: '트래픽은 급증했지만 오류율·지연시간은 안정적입니다. 성급한 변경보다 스케일링 신호와 범위를 관찰해야 합니다.' },
    { metrics: ['12.4%', '4.1s', '93%', '900/s'], trends: ['↑ +10%', '↑ +3.2s', '↑ +50%', '↓ -40%'], logs: ['12:14:02 ERROR db_pool exhausted service=profile', '12:14:03 WARN retry storm detected count=1840', '12:14:06 INFO feature_flag profile-search=true'], action: 'mitigate', explanation: 'DB 풀이 고갈되고 재시도 폭주가 보입니다. 호출량과 재시도를 줄이는 완화가 전체 장애 확산을 막습니다.' },
    { metrics: ['5.1%', '1.2s', '58%', '3.2k/s'], trends: ['↑ +3%', '↑ +700ms', 'steady', 'steady'], logs: ['12:52:19 WARN cache_hit_ratio=21%', '12:52:20 INFO cache_config ttl changed 300s→30s', '12:52:22 WARN origin_requests=+410%'], action: 'rollback', explanation: '캐시 TTL 변경 직후 적중률이 하락하고 원본 요청이 급증했습니다. 최근 설정 변경을 되돌리는 것이 안전합니다.' }
  ];
  function renderRescueRound() { rescueRound = rescueRounds[rescueRoundIndex % rescueRounds.length]; const values = ['error','latency','cpu','traffic']; values.forEach((name, index) => { $(`#metric-${name}`).textContent = rescueRound.metrics[index]; $(`#metric-${name}-trend`).textContent = rescueRound.trends[index]; }); $('#rescue-round').textContent = `ROUND ${String((rescueRoundIndex % rescueRounds.length) + 1).padStart(2, '0')}`; rescueLog.innerHTML = rescueRound.logs.map((line) => `<li>${line}</li>`).join(''); }
  function stopRescue() { clearInterval(rescueTimer); clearTimeout(rescueAdvanceTimer); rescueTimer = null; rescueAdvanceTimer = null; }
  function resetRescue() { stopRescue(); rescueScore = 0; rescueStreak = 0; rescueTime = 45; rescuePaused = false; rescueRoundIndex = 0; rescueScoreElement.textContent = '0'; $('#rescue-streak').textContent = '0'; rescueTimeElement.textContent = '45'; rescueBestElement.textContent = String(getBest('cloudOpsRescueBest')); $('#rescue-pause').textContent = '일시정지'; rescueStatus.textContent = '대시보드의 메트릭과 로그를 읽고 첫 조치를 선택하세요.'; document.querySelectorAll('[data-rescue-action]').forEach((button) => { button.disabled = false; }); renderRescueRound(); }
  function finishRescue(message) { stopRescue(); const best = Math.max(getBest('cloudOpsRescueBest'), rescueScore); setBest('cloudOpsRescueBest', best); rescueBestElement.textContent = String(best); rescueStatus.textContent = `${message} 최종 점수 ${rescueScore}점. 재시작으로 다시 도전하세요.`; }
  function tickRescue() { if (rescuePaused) return; rescueTime -= 1; rescueTimeElement.textContent = String(rescueTime); if (rescueTime <= 0) finishRescue('시간이 끝났습니다.'); }
  function startRescue() { if (rescueTimer) return; rescuePaused = false; rescueStatus.textContent = '운영 중 — 메트릭과 로그를 읽고 다음 조치를 선택하세요.'; rescueTimer = setInterval(tickRescue, 1000); }
  function pauseRescue() { if (!rescueTimer) return; rescuePaused = !rescuePaused; $('#rescue-pause').textContent = rescuePaused ? '계속하기' : '일시정지'; rescueStatus.textContent = rescuePaused ? '일시정지됨 — 계속하기를 누르세요.' : '운영 재개 — 다음 조치를 선택하세요.'; }
  function chooseRescue(action) { if (!rescueTimer || rescuePaused || rescueAdvanceTimer) return; const correct = action === rescueRound.action; rescueStreak = correct ? rescueStreak + 1 : 0; const points = correct ? 20 + Math.max(0, rescueStreak - 1) * 5 : -10; rescueScore = Math.max(0, rescueScore + points); rescueScoreElement.textContent = String(rescueScore); $('#rescue-streak').textContent = String(rescueStreak); rescueStatus.textContent = correct ? `정확한 판단입니다. +${points}점 · ${rescueStreak}연속 — ${rescueRound.explanation}` : `위험한 조치입니다. -10점 — ${rescueRound.explanation}`; document.querySelectorAll('[data-rescue-action]').forEach((button) => { button.disabled = true; }); if (rescueScore >= 100) { finishRescue('장애 대응을 안정적으로 완료했습니다.'); return; } rescueAdvanceTimer = setTimeout(() => { rescueRoundIndex += 1; renderRescueRound(); document.querySelectorAll('[data-rescue-action]').forEach((button) => { button.disabled = false; }); rescueAdvanceTimer = null; }, 1200); }
  $('#rescue-start')?.addEventListener('click', startRescue); $('#rescue-pause')?.addEventListener('click', pauseRescue); $('#rescue-restart')?.addEventListener('click', resetRescue); document.querySelectorAll('[data-rescue-action]').forEach((button) => button.addEventListener('click', () => chooseRescue(button.dataset.rescueAction)));
  document.addEventListener('keydown', (event) => { const actions = { '1': 'observe', '2': 'mitigate', '3': 'rollback' }; if (actions[event.key]) { event.preventDefault(); chooseRescue(actions[event.key]); } if (event.key === ' ' && rescueTimer) { event.preventDefault(); pauseRescue(); } });

  const incidentScenarios = [
    { question: '배포 직후 특정 리전에만 5xx가 증가했다. 첫 조치는?', options: ['해당 리전의 모든 파드를 재시작해 증상을 숨긴다.', '리전·버전·엔드포인트별 오류율과 배포 범위를 비교한다.', '전역 롤백을 먼저 실행해 정상 리전의 변경도 되돌린다.'], correct: 1, explanation: '리전·버전·엔드포인트를 교차 비교해야 국소 회귀와 리전 인프라 문제를 구분할 수 있습니다.' },
    { question: '지연 시간이 증가했지만 요청량은 일정하다. 무엇을 먼저 확인할까?', options: ['DB 의존성과 네트워크 지연을 분리해 P95/P99 및 포화도를 비교한다.', '평균 지연만 확인하고 인스턴스를 무조건 증설한다.', '재시도 횟수를 늘려 성공률을 먼저 높인다.'], correct: 0, explanation: '평균이 아닌 tail latency와 의존성별 구간을 비교해야 병목을 잘못 완화하지 않습니다.' },
    { question: '메모리 사용량이 서서히 증가하고 있다. 가장 좋은 다음 행동은?', options: ['메모리가 찰 때마다 모든 인스턴스를 교체한다.', '배포 버전·인스턴스 수명·트래픽을 맞춰 누수 여부를 비교한다.', 'GC 로그를 끄고 메모리 알림 임계치만 높인다.'], correct: 1, explanation: '수명과 버전별 증가 곡선을 비교해야 누수와 정상 캐시 증가를 구분할 수 있습니다.' },
    { question: '캐시 적중률이 급락했지만 원인은 불명확하다. 우선할 것은?', options: ['캐시를 비워 모든 키를 다시 만든다.', '키 포맷·만료 정책·무효화 이벤트와 원본 부하를 함께 상관 분석한다.', '원본 DB 용량을 늘리고 원인은 나중에 확인한다.'], correct: 1, explanation: '무효화나 키 변화가 원본 부하를 만든 것인지 확인해야 2차 장애를 피할 수 있습니다.' },
    { question: '장애 중 설정 변경 요청이 들어왔다. 안전한 판단은?', options: ['영향 범위가 작아 보여 즉시 운영 반영한다.', '가설·승인·관측 지표·롤백 절차를 확인한 뒤 작은 범위에 적용한다.', '변경을 모두 막고 현재 장애 신호만 계속 관찰한다.'], correct: 1, explanation: '작은 범위의 가역적 변경과 성공 지표가 있어야 장애 중 실험이 통제됩니다.' },
    { question: '한 노드에서만 오류가 반복된다. 다음 조치는?', options: ['노드를 즉시 제거해 원인 데이터를 없앤다.', '동일 워크로드 노드와 커널·자원·네트워크 차이를 비교한다.', '전체 클러스터의 스케줄러 설정을 바꾼다.'], correct: 1, explanation: '비교군을 두고 노드 수준의 차이를 확인해야 범위를 불필요하게 키우지 않습니다.' },
    { question: '알림이 짧은 간격으로 반복된다. 무엇을 먼저 할까?', options: ['알림을 끄고 원인 확인 후 다시 켠다.', '원인 이벤트·평가 윈도우·중복 억제와 실제 장애 신호를 분리한다.', '임계치를 올려 알림이 덜 오게 만든다.'], correct: 1, explanation: '알림을 줄이는 것과 장애를 줄이는 것은 다르므로 평가 윈도우와 원인 이벤트를 분리해야 합니다.' },
    { question: '외부 의존성 응답이 느려졌다. 가장 안전한 완화는?', options: ['타임아웃·재시도 예산·서킷 상태를 확인하고 호출량을 제한한다.', '성공할 때까지 재시도를 늘려 일시 오류를 흡수한다.', '외부 호출 로그를 끄고 내부 오류만 관찰한다.'], correct: 0, explanation: '재시도 예산과 서킷 상태를 함께 봐야 의존성 지연이 우리 시스템의 포화로 번지는 것을 막습니다.' },
    { question: '새 버전에서 오류가 늘었지만 전체 평균은 정상이다. 어떤 분석이 적절한가?', options: ['평균이 정상인 만큼 배포를 유지한다.', '버전·엔드포인트·테넌트·상태코드별 분포와 샘플 로그를 비교한다.', '새 버전의 모든 트래픽을 즉시 차단하고 원인은 확인하지 않는다.'], correct: 1, explanation: '평균은 작은 사용자군의 회귀를 숨길 수 있어 다차원 분포와 실제 샘플을 함께 봐야 합니다.' },
    { question: '디스크 사용량 경고가 발생했다. 첫 판단은?', options: ['가장 큰 파일부터 삭제해 여유 공간을 만든다.', '증가 원인·로그 보존·삭제 후보·복구 가능성을 확인하고 단계적으로 정리한다.', '경고 임계치를 높여 운영 알림을 줄인다.'], correct: 1, explanation: '보존 정책과 복구 가능성을 확인하지 않은 삭제는 장애 대응에 필요한 증거를 없앨 수 있습니다.' },
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
  const incidentEnglish = [
    { question: 'Right after a deployment, 5xx errors rise only in one region. What is your first move?', options: ['Restart every instance immediately.', 'Compare region, version, and rollout scope before acting.', 'Roll back globally without checking the impact.'], explanation: 'Compare the affected region and deployment scope first so you can separate a bad rollout from a regional issue.' },
    { question: 'Latency increases while request volume stays stable. What should you inspect first?', options: ['Only the average latency chart.', 'Database saturation, dependency latency, and P95/P99 together.', 'Add instances immediately without checking dependencies.'], explanation: 'Tail latency and dependency saturation can reveal the bottleneck that averages hide.' },
    { question: 'Memory usage is rising steadily on one service. What is the safest next action?', options: ['Replace every instance at once.', 'Compare release, instance age, and traffic before choosing a mitigation.', 'Ignore it until the process crashes.'], explanation: 'Correlating the increase with version and instance age helps distinguish a leak from normal workload growth.' },
    { question: 'Cache hit ratio drops sharply after a configuration change. What comes first?', options: ['Delete the cache and rebuild everything.', 'Compare the cache policy, TTL, and origin request increase.', 'Increase database capacity before checking cache behavior.'], explanation: 'Validate the cache change and origin load before making a larger infrastructure change.' },
    { question: 'A configuration change request arrives during an incident. What is safest?', options: ['Apply it immediately because the scope looks small.', 'Confirm blast radius, rollback, and validation steps before a limited change.', 'Reject every change and stop observing the incident.'], explanation: 'A small, reversible, validated change limits additional risk during an incident.' },
    { question: 'Only one node repeatedly shows errors. What should you compare?', options: ['Delete the node and its logs.', 'Compare workload, kernel, network, and dependency differences with healthy nodes.', 'Change the whole cluster configuration.'], explanation: 'A controlled comparison can expose node-specific drift without widening the blast radius.' },
    { question: 'Alerts repeat at short intervals. What should you do first?', options: ['Mute all alerts permanently.', 'Separate duplicate alerts from the actual incident signal.', 'Lower every threshold immediately.'], explanation: 'Deduplicating noise while preserving the incident signal improves response quality.' },
    { question: 'A database dependency is slow. Which mitigation is safest?', options: ['Increase every timeout.', 'Verify capacity and health, then limit traffic or expensive calls.', 'Retry every request more aggressively.'], explanation: 'Retries and longer timeouts can amplify a dependency incident; reduce pressure after checking health.' },
    { question: 'One API version has errors but overall health looks normal. What is useful?', options: ['Stop all versions immediately.', 'Compare version, route, client, and deployment data with sample logs.', 'Ignore it because the aggregate metric is healthy.'], explanation: 'Aggregate health can hide a localized regression, so segment the data by version and route.' },
    { question: 'A disk warning appears. What is the first decision?', options: ['Delete files without preserving evidence.', 'Check growth source, retention, available space, and recovery options.', 'Wait until the disk is full.'], explanation: 'Preserving evidence and confirming recovery options avoids turning capacity pressure into data loss.' },
    { question: 'Traffic spikes unexpectedly. What should you verify first?', options: ['Block all requests.', 'Check traffic distribution, capacity headroom, and whether the pattern is legitimate.', 'Ignore the spike if errors are still low.'], explanation: 'A traffic spike may be legitimate or abusive; verify distribution and capacity before choosing a response.' },
    { question: 'A rollback reduces errors, but some users still fail. What next?', options: ['Declare the incident resolved.', 'Check cache, session, and dependency paths that may retain the bad state.', 'Ask users to retry indefinitely.'], explanation: 'Partial recovery means the failed path or state may still exist beyond the application version.' },
    { question: 'Metrics and logs show different timestamps. How do you validate them?', options: ['Delete one data source.', 'Compare timezone, collection delay, and correlation IDs.', 'Ignore the time difference.'], explanation: 'Time alignment and correlation IDs prevent false conclusions from mismatched telemetry.' },
    { question: 'A deployment is taking longer than usual. What is appropriate?', options: ['Start the same deployment again.', 'Compare step duration, queueing, capacity, and recent changes.', 'Wait forever without collecting evidence.'], explanation: 'Stage-level timing helps distinguish a slow build, capacity issue, or rollout blockage.' },
    { question: 'Authentication failures increase only for one client version. What do you inspect?', options: ['Restart the entire authentication system.', 'Compare client version, token expiry, clock drift, and endpoint behavior.', 'Delete the authentication logs.'], explanation: 'A version-specific auth issue often relates to token handling, clock drift, or an endpoint contract.' },
    { question: 'A storage queue alternates between growing and shrinking. What should you check?', options: ['Set unlimited capacity.', 'Compare producer rate, consumer capacity, retry behavior, and queue depth.', 'Disable autoscaling immediately.'], explanation: 'Queue oscillation can come from retry or scaling feedback, so compare both sides of the flow.' },
    { question: 'A service contract change is proposed during an incident. What is safest?', options: ['Deploy it to every consumer.', 'Compare producer and consumer versions, then use a backward-compatible rollout.', 'Change only the documentation.'], explanation: 'Compatibility checks reduce the risk of creating a second incident while fixing the first.' },
    { question: 'An incident has multiple possible causes. How should communication work?', options: ['Present one unverified cause as fact.', 'Separate confirmed facts, hypotheses, and next checks.', 'Share no information until everything is certain.'], explanation: 'Separating facts from hypotheses keeps responders aligned without overstating confidence.' },
    { question: 'A mitigation has improved metrics but increased cost. What should you do?', options: ['Leave it forever.', 'Confirm stability, document the trade-off, and plan a safe follow-up change.', 'Undo it immediately despite the improvement.'], explanation: 'Stability comes first, followed by a controlled follow-up to remove temporary cost or capacity.' },
    { question: 'A new error signal appears after recovery. What should you verify?', options: ['Assume it is unrelated.', 'Check whether it is a recovery side effect, a new regression, or a monitoring artifact.', 'Raise every alert threshold.'], explanation: 'Post-recovery signals need correlation before you decide whether they represent a new incident.' }
  ];
  incidentScenarios.forEach((scenario, index) => { scenario.en = incidentEnglish[index]; });
  let incidentOrder = []; let incidentIndex = 0; let incidentScore = 0; let incidentStreak = 0; let incidentThreat = 20; let incidentTime = 12; let incidentTimer = null; let incidentAnswered = false; let incidentPaused = false;
  const shuffle = (items) => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
  function stopIncidentTimer() { clearInterval(incidentTimer); incidentTimer = null; }
  function tickIncident() { if (incidentPaused) return; incidentTime -= 1; $('#incident-time').textContent = String(incidentTime); $('#incident-progress-bar').style.transform = `scaleX(${incidentTime / 12})`; if (incidentTime <= 0) answerIncident(-1); }
  function renderIncident() { stopIncidentTimer(); const scenario = incidentOrder[incidentIndex]; incidentTime = 12; incidentPaused = false; incidentAnswered = false; $('#incident-pause').textContent = '일시정지'; $('#incident-count').textContent = `시나리오 ${incidentIndex + 1} / ${incidentOrder.length}`; $('#incident-question').textContent = scenario.question; $('#incident-time').textContent = '12'; $('#incident-progress-bar').style.transform = 'scaleX(1)'; $('#incident-streak').textContent = String(incidentStreak); $('#incident-threat').textContent = `${incidentThreat}%`; $('#incident-score').textContent = String(incidentScore); const options = $('#incident-options'); const feedback = $('#incident-feedback'); const next = $('#incident-next'); feedback.hidden = true; next.hidden = true; options.innerHTML = ''; scenario.options.forEach((option, index) => { const button = document.createElement('button'); button.className = 'incident-option'; button.type = 'button'; button.textContent = option; button.addEventListener('click', () => answerIncident(index)); options.appendChild(button); }); $('#incident-status').textContent = '메트릭과 상황을 빠르게 읽고 판단하세요.'; incidentTimer = setInterval(tickIncident, 1000); }
  function startIncident() { stopIncidentTimer(); incidentOrder = shuffle(incidentScenarios); incidentIndex = 0; incidentScore = 0; incidentStreak = 0; incidentThreat = 20; incidentPaused = false; renderIncident(); refreshGameLanguage?.(); }
  function pauseIncident() { if (!incidentTimer || incidentAnswered) return; incidentPaused = !incidentPaused; $('#incident-pause').textContent = incidentPaused ? '계속하기' : '일시정지'; $('#incident-status').textContent = incidentPaused ? '일시정지됨 — 현재 상황을 다시 확인하고 계속하세요.' : '카운트다운 재개 — 가장 안전한 조치를 선택하세요.'; $('#incident-panel').classList.toggle('is-paused', incidentPaused); }
  function answerIncident(choice) { if (incidentAnswered) return; incidentAnswered = true; stopIncidentTimer(); const scenario = incidentOrder[incidentIndex]; const correct = choice === scenario.correct; if (correct) { incidentScore += 10 + incidentStreak * 2; incidentStreak += 1; incidentThreat = Math.max(0, incidentThreat - 5); } else { incidentStreak = 0; incidentThreat = Math.min(100, incidentThreat + 12); } $('#incident-score').textContent = String(incidentScore); $('#incident-streak').textContent = String(incidentStreak); $('#incident-threat').textContent = `${incidentThreat}%`; document.querySelectorAll('.incident-option').forEach((button) => { button.disabled = true; }); const feedback = $('#incident-feedback'); feedback.hidden = false; feedback.textContent = `${correct ? `정답 +${10 + (incidentStreak - 1) * 2}점 · 콤보 ${incidentStreak}` : choice === -1 ? '시간 초과 · 위험도 +12%' : '오답 · 위험도 +12%'} — ${scenario.explanation}`; const next = $('#incident-next'); next.hidden = false; next.textContent = incidentIndex === incidentOrder.length - 1 ? '다시 시작' : '다음 시나리오'; $('#incident-status').textContent = correct ? '좋은 판단입니다. 콤보를 이어가세요.' : '위험도가 상승했습니다. 해설을 확인하세요.'; }
  function nextIncident() { if (incidentIndex === incidentOrder.length - 1) { const best = Math.max(getBest('cloudOpsIncidentBest'), incidentScore); setBest('cloudOpsIncidentBest', best); $('#incident-best').textContent = String(best); startIncident(); } else { incidentIndex += 1; renderIncident(); refreshGameLanguage?.(); } }
  document.querySelectorAll('[data-game-tab]').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('[data-game-tab]').forEach((item) => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); }); const target = tab.dataset.gameTab; $('#rescue-panel').hidden = target !== 'rescue'; $('#incident-panel').hidden = target !== 'incident'; }));
  $('#incident-next')?.addEventListener('click', nextIncident); $('#incident-pause')?.addEventListener('click', pauseIncident); $('#incident-best').textContent = String(getBest('cloudOpsIncidentBest'));
  function refreshGameLanguage() {
    const actionLabels = currentLanguage() === 'en' ? {
      observe: ['1 · Observe', 'Check more signals and scope'],
      mitigate: ['2 · Mitigate', 'Reduce traffic or impact scope'],
      rollback: ['3 · Roll back', 'Restore the latest change']
    } : {
      observe: ['1 · 관찰', '추가 신호와 범위 확인'],
      mitigate: ['2 · 완화', '트래픽 또는 영향 범위 축소'],
      rollback: ['3 · 롤백', '최근 변경을 되돌려 안정화']
    };
    document.querySelectorAll('[data-rescue-action]').forEach((button) => {
      const labels = actionLabels[button.dataset.rescueAction];
      if (labels) button.innerHTML = `<b>${labels[0]}</b><small>${labels[1]}</small>`;
    });
    const rescuePause = $('#rescue-pause');
    const incidentPause = $('#incident-pause');
    if (rescuePause && !rescuePaused) rescuePause.textContent = text('rescuePause');
    if (rescuePause && rescuePaused) rescuePause.textContent = text('rescueResume');
    if (incidentPause && !incidentPaused) incidentPause.textContent = text('incidentPause');
    if (incidentPause && incidentPaused) incidentPause.textContent = text('incidentResume');
    if (rescueStatus && !rescueTimer) rescueStatus.textContent = text('rescueGuide');
    if ($('#incident-status') && !incidentAnswered) $('#incident-status').textContent = text('incidentGuide');
    if ($('#incident-next') && !$('#incident-next').hidden) $('#incident-next').textContent = incidentIndex === incidentOrder.length - 1 ? text('incidentRestart') : text('incidentNext');
    const activeIncident = incidentOrder[incidentIndex];
    if (activeIncident && currentLanguage() === 'en') {
      const english = activeIncident.en;
      $('#incident-question').textContent = english.question;
      const options = $('#incident-options');
      options.innerHTML = '';
      english.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'incident-option';
        button.type = 'button';
        button.textContent = option;
        button.disabled = incidentAnswered;
        button.addEventListener('click', () => answerIncident(index));
        options.appendChild(button);
      });
      if ($('#incident-feedback') && !$('#incident-feedback').hidden) $('#incident-feedback').textContent = english.explanation;
    }
  }
  window.addEventListener('site-language-change', refreshGameLanguage);
  resetRescue(); startIncident(); refreshGameLanguage();
})();
