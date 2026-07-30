(() => {
  const toggle = document.querySelector('#language-toggle');
  let language = 'ko';
  function updateLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-ko][data-en]').forEach((element) => { element.textContent = element.dataset[language]; });
    toggle.textContent = language === 'ko' ? 'EN' : 'KO';
    toggle.setAttribute('aria-label', language === 'ko' ? '영어로 전환' : '한국어로 전환');
  }
  toggle?.addEventListener('click', () => { language = language === 'ko' ? 'en' : 'ko'; updateLanguage(); });
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    revealItems.forEach((item) => observer.observe(item));
  } else revealItems.forEach((item) => item.classList.add('is-visible'));
  const root = document.documentElement;
  window.addEventListener('pointermove', (event) => { root.style.setProperty('--pointer-x', `${event.clientX}px`); root.style.setProperty('--pointer-y', `${event.clientY}px`); }, { passive: true });
  updateLanguage();
})();
