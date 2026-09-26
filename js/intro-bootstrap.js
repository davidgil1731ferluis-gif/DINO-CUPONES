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
    const introScreen = $('#introScreen');
    introScreen?.classList.add('is-playing');

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      introScreen?.classList.add('is-letter-mode');
      revealLetter();
      return;
    }

    run.classList.add('is-visible', 'is-running');

    later(2800, () => {
      run.classList.remove('is-visible', 'is-running');
      $('#introScreen')?.classList.add('is-letter-mode');
      stage.classList.add('is-arrived');
      deliver.classList.add('is-visible', 'is-delivering');
    });

    later(3550, revealLetter);

    later(4550, () => {
      deliver.classList.remove('is-visible', 'is-delivering');
      stage.classList.remove('is-arrived');
      stage.classList.add('is-leaving');
      exit.classList.add('is-visible', 'is-exiting');
    });

    later(6700, () => {
      exit.classList.remove('is-visible', 'is-exiting');
      stage.classList.remove('is-leaving');
      $('#introScreen')?.classList.remove('is-playing');
    });
  }

  function skip() {
    clearTimers();
    started = true;
    const stage = $('#dinoStage');
    $('#introScreen')?.classList.add('is-letter-mode');
    $('#introScreen')?.classList.remove('is-playing');
    stage?.classList.remove('is-arrived');
    stage?.classList.add('is-leaving');
    [$('#dinoRun'), $('#dinoDeliver'), $('#dinoExit')].forEach((img) => {
      img?.classList.remove('is-visible', 'is-running', 'is-delivering', 'is-exiting');
    });
    revealLetter();
  }

  const APP_BUILD = '20260926-phase1-cinematic3';
  let updateReloading = false;

  async function checkForUpdate(forceReload = false) {
    if (!('serviceWorker' in navigator)) {
      if (forceReload) window.location.reload();
      return false;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);

    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateReloading) return;
        updateReloading = true;
        window.location.reload();
      }, { once: true });
    }

    try {
      const registration = await navigator.serviceWorker.register(
        './sw.js?v=' + APP_BUILD,
        { scope: './', updateViaCache: 'none' }
      );

      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      if (forceReload) {
        window.setTimeout(() => {
          if (updateReloading) return;
          updateReloading = true;
          const next = new URL(window.location.href);
          next.searchParams.set('appbuild', APP_BUILD);
          window.location.replace(next.toString());
        }, 900);
      }

      return true;
    } catch (error) {
      console.warn('No se pudo actualizar la PWA de DinoCupones.', error);
      if (forceReload) {
        const next = new URL(window.location.href);
        next.searchParams.set('appbuild', APP_BUILD);
        window.location.replace(next.toString());
      }
      return false;
    }
  }

  async function registerAppServiceWorker() {
    return checkForUpdate(false);
  }

  function setupIntroParallax() {
    const introScreen = $('#introScreen');
    if (!introScreen) return;
    if (!window.matchMedia?.('(pointer:fine)').matches) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const render = () => {
      frame = 0;
      const bounds = introScreen.getBoundingClientRect();
      const nx = ((pointerX - bounds.left) / Math.max(bounds.width, 1)) - 0.5;
      const ny = ((pointerY - bounds.top) / Math.max(bounds.height, 1)) - 0.5;
      introScreen.style.setProperty('--intro-far-x', (nx * 8).toFixed(2) + 'px');
      introScreen.style.setProperty('--intro-far-y', (ny * 5).toFixed(2) + 'px');
      introScreen.style.setProperty('--intro-near-x', (nx * -12).toFixed(2) + 'px');
      introScreen.style.setProperty('--intro-near-y', (ny * -7).toFixed(2) + 'px');
    };

    introScreen.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(render);
    });

    introScreen.addEventListener('pointerleave', () => {
      introScreen.style.setProperty('--intro-far-x', '0px');
      introScreen.style.setProperty('--intro-far-y', '0px');
      introScreen.style.setProperty('--intro-near-x', '0px');
      introScreen.style.setProperty('--intro-near-y', '0px');
    });
  }

  function setup() {
    registerAppServiceWorker();
    setupIntroParallax();

    const introBackground = $('.intro-bg-image');
    if (introBackground) {
      const markFallback = () => {
        introBackground.dataset.loadError = 'true';
        document.documentElement.classList.add('intro-bg-fallback');
      };
      introBackground.addEventListener('error', markFallback, { once: true });
      if (introBackground.complete && introBackground.naturalWidth === 0) markFallback();
    }
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
    cleanup: clearTimers,
    checkForUpdate,
    build: APP_BUILD
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
