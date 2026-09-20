(() => {
  const $ = (selector) => document.querySelector(selector);
  const timers = [];
  let started = false;

  function later(delay, callback) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    while (timers.length) window.clearTimeout(timers.pop());
  }

  function showScreen(id) {
    ['#introScreen', '#letterScreen', '#authScreen', '#appScreen'].forEach((selector) => {
      const screen = $(selector);
      if (screen) screen.classList.toggle('is-visible', selector === id);
    });
  }

  function revealLetter() {
    const letter = $('#letterDelivery');
    if (!letter) return;
    letter.hidden = false;
    requestAnimationFrame(() => letter.classList.add('is-visible'));
  }

  function resetStage() {
    const intro = $('#introScreen');
    const stage = $('#dinoStage');
    const run = $('#dinoRun');
    const deliver = $('#dinoDeliver');
    const exit = $('#dinoExit');

    clearTimers();
    intro?.classList.remove('is-letter-mode');
    stage?.classList.remove('is-arrived', 'is-leaving');
    [run, deliver, exit].forEach((img) => {
      img?.classList.remove('is-visible', 'is-running', 'is-delivering', 'is-exiting');
    });

    const letter = $('#letterDelivery');
    if (letter) {
      letter.hidden = true;
      letter.classList.remove('is-visible');
    }
  }

  function start() {
    if (started) return;
    started = true;

    const stage = $('#dinoStage');
    const run = $('#dinoRun');
    const deliver = $('#dinoDeliver');
    const exit = $('#dinoExit');

    if (!stage || !run || !deliver || !exit) {
      revealLetter();
      return;
    }

    resetStage();
    run.classList.add('is-visible', 'is-running');

    later(3750, () => {
      run.classList.remove('is-visible', 'is-running');
      $('#introScreen')?.classList.add('is-letter-mode');
      stage.classList.add('is-arrived');
      deliver.classList.add('is-visible', 'is-delivering');
    });

    later(4750, revealLetter);

    later(6250, () => {
      deliver.classList.remove('is-visible', 'is-delivering');
      stage.classList.remove('is-arrived');
      stage.classList.add('is-leaving');
      exit.classList.add('is-visible', 'is-exiting');
    });

    later(9050, () => {
      exit.classList.remove('is-visible', 'is-exiting');
      stage.classList.remove('is-leaving');
    });
  }

  function skip() {
    clearTimers();
    started = true;
    const stage = $('#dinoStage');
    $('#introScreen')?.classList.add('is-letter-mode');
    stage?.classList.remove('is-arrived');
    stage?.classList.add('is-leaving');
    [$('#dinoRun'), $('#dinoDeliver'), $('#dinoExit')].forEach((img) => {
      img?.classList.remove('is-visible', 'is-running', 'is-delivering', 'is-exiting');
    });
    revealLetter();
  }

  async function registerAppServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      }, { once: true });
    }

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      await registration.update();
    } catch (error) {
      console.warn('No se pudo actualizar la PWA de DinoCupones.', error);
    }
  }

  function setup() {
    registerAppServiceWorker();
    const assets = [
      $('.intro-bg-image'),
      $('#dinoRun'),
      $('#dinoDeliver'),
      $('#dinoExit')
    ].filter(Boolean);

    const ready = Promise.all(assets.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }));

    Promise.race([
      ready,
      new Promise((resolve) => window.setTimeout(resolve, 1200))
    ]).then(() => later(100, start));

    const skipButton = $('#skipIntroBtn');
    if (skipButton) skipButton.onclick = skip;

    const openLetterButton = $('#openLetterBtn');
    if (openLetterButton) openLetterButton.onclick = () => showScreen('#letterScreen');

    const continueButton = $('#continueToLoginBtn');
    if (continueButton) continueButton.onclick = () => showScreen('#authScreen');
  }

  window.DinoIntro = {
    start,
    skip,
    revealLetter,
    showScreen,
    cleanup: clearTimers
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
