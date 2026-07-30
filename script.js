(() => {
  const toggle = document.querySelector('#language-toggle');
  let language = 'ko';

  function updateLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-ko][data-en]').forEach((element) => {
      element.textContent = element.dataset[language];
    });
    toggle.textContent = language === 'ko' ? 'EN' : 'KO';
    toggle.setAttribute('aria-label', language === 'ko' ? 'Switch to English' : '한국어로 전환');
  }

  toggle.addEventListener('click', () => {
    language = language === 'ko' ? 'en' : 'ko';
    updateLanguage();
  });
})();
