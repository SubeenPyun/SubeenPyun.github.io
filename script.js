(() => {
  const toggle = document.querySelector('#language-toggle');
  const themeToggle = document.querySelector('#theme-toggle');
  const savedLanguage = (() => { try { return localStorage.getItem('cloudOpsLanguage') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } })();
  let language = savedLanguage;
  function updateLanguage() {
    window.siteLanguage = language;
    document.documentElement.lang = language;
    const globeTranslations = {
      'Signal / 98.4%': { ko: ['Signal / 98.4%', '더미 알림 신호가 안정적인 상태로 유지되고 있습니다.'], en: ['Signal / 98.4%', 'The placeholder alert signal is holding steady.'] },
      'Latency / 180ms': { ko: ['Latency / 180ms', '더미 서비스의 최근 응답 지연 데이터입니다.'], en: ['Latency / 180ms', 'Recent response latency for the placeholder service.'] },
      'Region / AP-01': { ko: ['Region / AP-01', '운영 범위를 나중에 리전별 실제 데이터로 확장할 수 있습니다.'], en: ['Region / AP-01', 'The operating scope can later expand into real regional data.'] },
      'Deploy / Stable': { ko: ['Deploy / Stable', '더미 배포 상태 카드입니다. 실제 변경 이력으로 교체할 수 있습니다.'], en: ['Deploy / Stable', 'A placeholder deployment status card, ready for real change history.'] },
      'Queue / 42%': { ko: ['Queue / 42%', '처리 대기열의 가상 포화도 정보입니다.'], en: ['Queue / 42%', 'Placeholder saturation data for the processing queue.'] },
      'Uptime / 99.99%': { ko: ['Uptime / 99.99%', '서비스 가용성 데이터를 넣을 수 있는 더미 카드입니다.'], en: ['Uptime / 99.99%', 'A placeholder card for service availability data.'] }
    };
    document.querySelectorAll('.globe-card').forEach((card) => { const copy = globeTranslations[card.dataset.card]; if (!copy) return; const [title, body] = copy[language]; const heading = card.querySelector('h3'); const paragraph = card.querySelector('p'); if (heading) heading.textContent = title; if (paragraph) paragraph.textContent = body; });
    const openPopover = document.querySelector('.globe-popover:not([hidden])');
    const openTitle = openPopover?.querySelector('h3')?.textContent;
    const openCopy = Object.values(globeTranslations).find((copy) => copy.ko[0] === openTitle || copy.en[0] === openTitle);
    if (openPopover && openCopy) { const [title, body] = openCopy[language]; openPopover.querySelector('h3').textContent = title; openPopover.querySelector('p').textContent = body; }
    document.querySelectorAll('[data-ko][data-en]').forEach((element) => { element.textContent = element.dataset[language]; });
    if (toggle) toggle.textContent = language === 'ko' ? 'EN' : 'KO';
    toggle?.setAttribute('aria-label', language === 'ko' ? '영어로 전환' : '한국어로 전환');
    window.dispatchEvent(new CustomEvent('site-language-change', { detail: { language } }));
  }
  toggle?.addEventListener('click', () => { language = language === 'ko' ? 'en' : 'ko'; try { localStorage.setItem('cloudOpsLanguage', language); } catch { /* language preference is optional */ } updateLanguage(); });
  const savedTheme = (() => { try { return localStorage.getItem('cloudOpsTheme') || 'light'; } catch { return 'light'; } })();
  function updateTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); if (themeToggle) { themeToggle.querySelector('span:first-child').textContent = theme === 'dark' ? '☀' : '☾'; themeToggle.querySelector('.theme-label').textContent = theme === 'dark' ? '낮' : '밤'; themeToggle.setAttribute('aria-label', theme === 'dark' ? '화이트 모드로 전환' : '다크모드로 전환'); } }
  themeToggle?.addEventListener('click', () => { const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark'; try { localStorage.setItem('cloudOpsTheme', next); } catch { /* 저장소가 비활성화된 환경 */ } updateTheme(next); });
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    revealItems.forEach((item) => observer.observe(item));
  } else revealItems.forEach((item) => item.classList.add('is-visible'));
  const root = document.documentElement;
  window.addEventListener('pointermove', (event) => { root.style.setProperty('--pointer-x', `${event.clientX}px`); root.style.setProperty('--pointer-y', `${event.clientY}px`); }, { passive: true });
  let ticking = false;
  window.addEventListener('scroll', () => { if (ticking) return; ticking = true; window.requestAnimationFrame(() => { const max = document.documentElement.scrollHeight - window.innerHeight; root.style.setProperty('--scroll-progress', max > 0 ? (window.scrollY / max).toFixed(3) : '0'); ticking = false; }); }, { passive: true });
  const globeStage = document.querySelector('.globe-stage');
  const legacyGlobe = document.querySelector('.globe-sphere');
  const globeCards = [...document.querySelectorAll('.globe-card')];
  const globeSearch = document.querySelector('#globe-search');
  const globeLayout = document.querySelector('.globe-data-layout');
  const globePopover = document.createElement('aside');
  globePopover.className = 'globe-popover'; globePopover.hidden = true; globePopover.setAttribute('aria-live', 'polite'); globeLayout?.append(globePopover);
  if (globeStage && legacyGlobe) {
    legacyGlobe.hidden = true;
    const canvas = document.createElement('canvas'); canvas.className = 'globe-canvas'; canvas.setAttribute('aria-label', '3D 더미 운영 데이터 네트워크'); globeStage.append(canvas);
    const context = canvas.getContext('2d');
    const radius = 150; const graphNodes = []; const graphEdges = []; let rotationX = -.12; let rotationY = .35; let hovered = null; let selected = null; let dragging = false; let lastPointer = null; let animationFrame;
    const titles = globeCards.map((card) => card.dataset.card);
    for (let index = 0; index < 72; index += 1) { const phi = Math.acos(1 - (2 * (index + .5)) / 72) - Math.PI / 2; const theta = Math.PI * (1 + Math.sqrt(5)) * index; const card = globeCards[index] || null; graphNodes.push({ index, phi, theta, title: titles[index] || `Dummy node ${String(index + 1).padStart(2, '0')}`, card, interactive: Boolean(card) }); }
    graphNodes.forEach((node) => { graphNodes.forEach((other) => { if (other.index > node.index) { const dx = node.phi - other.phi; const dy = node.theta - other.theta; if (Math.hypot(dx, dy) < .74) graphEdges.push([node, other]); } }); });
    function resizeCanvas() { const size = Math.min(globeStage.clientWidth, 510); const ratio = window.devicePixelRatio || 1; canvas.width = size * ratio; canvas.height = size * ratio; canvas.style.width = `${size}px`; canvas.style.height = `${size}px`; context.setTransform(ratio, 0, 0, ratio, 0, 0); }
    function project(node) { let x = Math.cos(node.phi) * Math.cos(node.theta); let y = Math.sin(node.phi); let z = Math.cos(node.phi) * Math.sin(node.theta); const cy = Math.cos(rotationY); const sy = Math.sin(rotationY); const cx = Math.cos(rotationX); const sx = Math.sin(rotationX); const rotatedX = x * cy - z * sy; const rotatedZ = x * sy + z * cy; return { x: rotatedX, y: y * cx - rotatedZ * sx, z: y * sx + rotatedZ * cx }; }
    function drawGlobe() { const size = canvas.clientWidth; const center = size / 2; const scale = Math.min(size * .43, radius * (size / 360)); const projected = graphNodes.map((node) => ({ node, point: project(node) })); context.clearRect(0, 0, size, size); const gradient = context.createRadialGradient(center - scale * .35, center - scale * .4, scale * .1, center, center, scale); gradient.addColorStop(0, document.body.classList.contains('dark-mode') ? 'rgba(50,126,180,.3)' : 'rgba(255,255,255,.85)'); gradient.addColorStop(1, document.body.classList.contains('dark-mode') ? 'rgba(5,24,55,.78)' : 'rgba(93,188,222,.34)'); context.beginPath(); context.arc(center, center, scale, 0, Math.PI * 2); context.fillStyle = gradient; context.fill(); graphEdges.forEach(([from, to]) => { const a = projected[from.index].point; const b = projected[to.index].point; const depth = Math.max(0, (a.z + b.z) / 2); if (depth > -.35) { context.beginPath(); context.moveTo(center + a.x * scale, center + a.y * scale); context.lineTo(center + b.x * scale, center + b.y * scale); context.strokeStyle = `rgba(77,214,222,${.08 + depth * .2})`; context.lineWidth = .65 + depth * .45; context.stroke(); } }); projected.sort((a, b) => a.point.z - b.point.z).forEach(({ node, point }) => { const x = center + point.x * scale; const y = center + point.y * scale; const front = Math.max(0, (point.z + 1) / 2); const emphasized = node === hovered || node === selected; const baseSize = node.interactive ? 2.6 + front * 4.2 : 1.2 + front * 2.2; const sizeDot = baseSize * (emphasized ? 2.5 : 1); if (emphasized) { context.beginPath(); context.arc(x, y, sizeDot * 2.5, 0, Math.PI * 2); context.fillStyle = 'rgba(99,244,223,.18)'; context.fill(); } context.beginPath(); context.arc(x, y, sizeDot, 0, Math.PI * 2); context.fillStyle = node === selected ? '#ffffff' : `rgba(116,${190 + Math.round(front * 55)},${205 + Math.round(front * 40)},${node.interactive ? .42 + front * .58 : .2 + front * .55})`; context.shadowBlur = emphasized ? 26 : node.interactive ? 8 : 3; context.shadowColor = '#63f4df'; context.fill(); context.shadowBlur = 0; node.screen = { x, y, point }; }); }
    function selectGraphNode(node, openCard = true) { if (!node) return; selected = node; rotationY = Math.PI / 2 - node.theta; rotationX = node.phi; if (openCard) { const card = node.card; const title = card ? card.querySelector('h3')?.textContent : node.title; const body = card ? card.querySelector('p')?.textContent : '나중에 실제 운영 데이터로 교체할 수 있는 더미 네트워크 노드입니다.'; globePopover.innerHTML = `<button class="globe-popover-close" type="button" aria-label="카드 닫기">×</button><span>NETWORK NODE</span><h3>${title}</h3><p>${body}</p><small>placeholder data · replace later</small>`; globePopover.hidden = false; globePopover.querySelector('.globe-popover-close').addEventListener('click', () => { globePopover.hidden = true; selected = null; }); } }
    function pointerPosition(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
    function nearestNode(position) { let closest = null; let distance = 56; graphNodes.forEach((node) => { if (!node.interactive || !node.screen || node.screen.point.z < -.72) return; const next = Math.hypot(node.screen.x - position.x, node.screen.y - position.y); if (next < distance) { distance = next; closest = node; } }); return closest; }
    canvas.addEventListener('pointerdown', (event) => { const node = nearestNode(pointerPosition(event)); if (node) selectGraphNode(node); dragging = true; lastPointer = pointerPosition(event); canvas.setPointerCapture(event.pointerId); }); canvas.addEventListener('pointermove', (event) => { const position = pointerPosition(event); hovered = nearestNode(position); canvas.classList.toggle('is-hovering-node', Boolean(hovered)); if (dragging && lastPointer) { rotationY -= (position.x - lastPointer.x) * .008; rotationX -= (position.y - lastPointer.y) * .008; rotationX = Math.max(-1.3, Math.min(1.3, rotationX)); lastPointer = position; } }); canvas.addEventListener('pointerup', (event) => { dragging = false; lastPointer = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); }); canvas.addEventListener('pointerleave', () => { if (!dragging) { hovered = null; canvas.classList.remove('is-hovering-node'); } });
    function loop() { if (!dragging && !selected) rotationY += .0018; drawGlobe(); animationFrame = requestAnimationFrame(loop); } window.addEventListener('resize', resizeCanvas); resizeCanvas(); loop();
    globeSearch?.addEventListener('input', () => { const query = globeSearch.value.trim().toLowerCase(); const found = graphNodes.find((node) => node.interactive && node.title.toLowerCase().includes(query)); if (query && found) selectGraphNode(found, false); });
  }
  updateTheme(savedTheme);
  updateLanguage();
})();
