(() => {
  'use strict';

  const overlay = document.querySelector('[data-site-preloader]');
  if (!overlay) return;
  const startedAt = performance.now();
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let finished = false;
  let timeline;
  let frame;
  let watchdog;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  window.STPreloader = Object.freeze({ ready, get finished() { return finished; } });

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    cancelAnimationFrame(frame);
    timeline?.kill();
    // A hero so fica visivel quando a abertura termina, ja no estado inicial dos efeitos.
    if (!reducedMotion && !root.classList.contains('hero-motion-ready')) root.classList.add('hero-fallback');
    root.classList.remove('hero-pending');
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pagehide', finish);
    resolveReady();
  };
  const onKey = (event) => {
    // Acesso imediato para quem navega com teclado, sem prender o foco.
    if (event.key === 'Escape' || event.key === 'Tab') finish();
  };

  // Nao espera o download dos videos, imagens da pagina ou bibliotecas externas.
  watchdog = setTimeout(finish, 1550);
  document.addEventListener('keydown', onKey);
  window.addEventListener('pagehide', finish, { once: true });
  overlay.addEventListener('animationend', (event) => {
    if (event.target === overlay && event.animationName === 'preloader-dismiss') finish();
  });

  if (reducedMotion) {
    finish();
    return;
  }
  root.classList.add('hero-pending');

  const enhance = () => {
    if (finished) return;
    const elapsed = performance.now() - startedAt;
    // Se o CDN estiver lento, a mesma abertura continua em CSS, sem espera extra.
    if (elapsed > 350) return;
    const gsap = window.gsap;
    if (!gsap) {
      frame = requestAnimationFrame(enhance);
      return;
    }
    try {
      overlay.classList.add('is-gsap');
      timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: finish });
      const plate = overlay.querySelector('.preloader-plate');
      const letters = overlay.querySelectorAll('.preloader-glyph');
      timeline
        .fromTo(plate, { strokeDashoffset: 1, fillOpacity: 0 }, { strokeDashoffset: 0, duration: .34 }, 0)
        .to(plate, { fillOpacity: 1, strokeOpacity: 0, duration: .22 }, .22)
        .fromTo(letters, { opacity: 0, y: 9, strokeDashoffset: 1, fillOpacity: 0, strokeOpacity: 1 }, { opacity: 1, y: 0, strokeDashoffset: 0, duration: .4, stagger: .028 }, .08)
        .to(letters, { fillOpacity: 1, strokeOpacity: 0, duration: .24, stagger: .028 }, .39)
        .fromTo(overlay.querySelector('.preloader-underline'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .64, ease: 'power2.inOut' }, .3)
        .fromTo(overlay.querySelector('.preloader-domain'), { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: .3 }, .74)
        .to(overlay, { opacity: 0, duration: .26, ease: 'power2.inOut' }, 1.22);
      timeline.play(elapsed / 1000);
    } catch {
      finish();
    }
  };
  enhance();
})();
