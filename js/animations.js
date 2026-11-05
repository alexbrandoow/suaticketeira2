(() => {
  'use strict';

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

  const splits = [];
  const accessibleCopies = [];
  const controller = new AbortController();
  const { signal } = controller;
  let media = null;
  let refreshFrame = 0;
  const queueMotionRefresh = () => {
    if (signal.aborted || refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      if (!signal.aborted) ScrollTrigger.refresh();
    });
  };

  const all = (selector, scope = document) => gsap.utils.toArray(selector, scope);
  const one = (selector, scope = document) => scope.querySelector(selector);
  const clearMotion = (targets) => gsap.set(targets, { clearProps: 'opacity,visibility,transform,filter,willChange,height' });

  const addAccessibleText = (element) => {
    const copy = document.createElement('span');
    copy.className = 'sr-only split-accessible-copy';
    const headingLevel = element.tagName.match(/^H([1-6])$/)?.[1];
    if (headingLevel) {
      copy.setAttribute('role', 'heading');
      copy.setAttribute('aria-level', headingLevel);
    }
    copy.textContent = element.textContent.replace(/\s+/g, ' ').trim();
    element.before(copy);
    accessibleCopies.push(copy);
    return copy;
  };

  const orderedWords = (split, element) => {
    let words = [...split.words];
    if (element.matches('.hero-copy h1')) {
      const strong = element.querySelector('strong');
      if (strong) {
        words = words.filter((word) => word !== strong && !strong.contains(word));
        strong.classList.add('split-word', 'split-word-whitelabel');
        words.push(strong);
      }
    }
    return words.sort((left, right) => {
      if (left === right) return 0;
      return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  };

  const createBlurTextTween = (words, options = {}) => {
    const compact = window.matchMedia('(max-width: 680px)').matches;
    const blur = compact ? 6 : 10;
    const distance = compact ? 28 : 50;
    const midpoint = compact ? -3 : -5;
    const stepDuration = compact ? .6 : .75;
    const wordStagger = compact ? .06 : .08;
    const timeline = gsap.timeline({
      paused: options.paused ?? false,
      scrollTrigger: options.scrollTrigger
    });

    words.forEach((word, index) => {
      const start = index * wordStagger;
      timeline
        .fromTo(word,
          { filter: `blur(${blur}px)`, opacity: 0, y: distance },
          { filter: `blur(${blur / 2}px)`, opacity: .5, y: midpoint, duration: stepDuration, ease: 'sine.out' },
          start
        )
        .to(word, {
          filter: 'blur(0px)',
          opacity: 1,
          y: 0,
          duration: stepDuration,
          ease: 'sine.out',
          clearProps: 'opacity,visibility,transform,filter,willChange'
        }, start + stepDuration);
    });
    return timeline;
  };

  const reveal = (targets, options = {}) => {
    const elements = typeof targets === 'string' ? all(targets) : gsap.utils.toArray(targets);
    if (!elements.length) return null;
    const trigger = options.trigger || elements[0];
    return gsap.from(elements, {
      autoAlpha: 0,
      y: options.y ?? 30,
      scale: options.scale ?? 1,
      duration: options.duration ?? .78,
      stagger: options.stagger ?? .08,
      ease: options.ease || 'power2.out',
      clearProps: 'opacity,visibility,transform,willChange',
      scrollTrigger: {
        trigger,
        start: options.start || 'top 85%',
        toggleActions: 'restart none restart none'
      }
    });
  };

  const splitReveal = (element, options = {}) => {
    if (!element) return null;
    if (!SplitText) return reveal(element, { ...options, y: options.y ?? 34 });

    addAccessibleText(element);
    const split = SplitText.create(element, {
      type: 'words',
      wordsClass: 'split-word',
      aria: 'hidden'
    });
    splits.push(split);
    return createBlurTextTween(orderedWords(split, element), {
      scrollTrigger: {
        trigger: options.trigger || element,
        start: options.start || 'top 84%',
        toggleActions: 'restart none restart none'
      }
    });
  };

  const createHeroTimeline = ({ paused = false } = {}) => {
    const header = one('.site-header');
    const heading = one('.hero-copy h1');
    const buttons = all('.hero-actions .button');
    const features = all('.hero-features li');
    const visual = one('.hero-visual');
    let titleTween = null;

    if (heading && SplitText) {
      addAccessibleText(heading);
      const split = SplitText.create(heading, {
        type: 'words',
        wordsClass: 'split-word',
        aria: 'hidden'
      });
      splits.push(split);
      titleTween = createBlurTextTween(orderedWords(split, heading), { paused: true });
    }

    const timeline = gsap.timeline({ paused, defaults: { ease: 'power3.out' } });
    if (header) timeline.fromTo(header, { autoAlpha: 0, y: -15 }, { autoAlpha: 1, y: 0, duration: .7, clearProps: 'opacity,visibility,transform,willChange' }, 0);
    if (titleTween) timeline.add(titleTween.play(), .12);
    else if (heading) timeline.from(heading, { autoAlpha: 0, y: 42, duration: 1, clearProps: 'opacity,visibility,transform,willChange' }, .12);
    if (buttons.length) timeline.from(buttons, { autoAlpha: 0, y: 20, duration: .62, stagger: .1, clearProps: 'opacity,visibility,transform,willChange' }, .58);
    if (features.length) timeline.from(features, { autoAlpha: 0, y: 18, duration: .62, stagger: .08, clearProps: 'opacity,visibility,transform,willChange' }, .76);
    if (visual) timeline.from(visual, { autoAlpha: 0, scale: 1.04, duration: 1.15, clearProps: 'opacity,visibility,transform,willChange' }, .18);
    return timeline;
  };

  const createMarquee = () => {
    const cleanups = [];
    const playWhileVisible = (container, tween) => {
      const trigger = ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => tween.play(),
        onEnterBack: () => tween.play(),
        onLeave: () => tween.pause(),
        onLeaveBack: () => tween.pause()
      });
      cleanups.push(() => trigger.kill());
      return trigger;
    };

    const logos = one('.logos-marquee');
    const logoImage = logos?.querySelector('img');
    if (logos && logoImage && !one('.logos-track', logos)) {
      const logoTrack = document.createElement('div');
      logoTrack.className = 'logos-track';
      const createLogoSet = () => {
        const logoSet = document.createElement('div');
        logoSet.className = 'logos-set';
        logoSet.setAttribute('aria-hidden', 'true');
        Array.from({ length: 12 }, (_, index) => {
          const item = document.createElement('span');
          item.className = 'client-logo';
          item.style.backgroundPosition = `${index * (100 / 11)}% center`;
          logoSet.appendChild(item);
        });
        return logoSet;
      };
      const firstLogoSet = createLogoSet();
      const secondLogoSet = createLogoSet();
      logoTrack.append(firstLogoSet, secondLogoSet);
      logoImage.replaceWith(logoTrack);

      const logoTween = gsap.fromTo(logoTrack, { x: 0 }, {
        x: () => -firstLogoSet.getBoundingClientRect().width,
        duration: Math.max(24, firstLogoSet.getBoundingClientRect().width / 78),
        ease: 'none',
        repeat: -1,
        paused: true
      });
      let hovered = false;
      const syncLogos = () => {
        if (!document.hidden && logoTrigger.isActive && !hovered) logoTween.play();
        else logoTween.pause();
      };
      const pauseLogos = (event) => {
        if (event.pointerType !== 'mouse') return;
        hovered = true;
        syncLogos();
      };
      const resumeLogos = () => { hovered = false; syncLogos(); };
      const refreshLogos = () => {
        const progress = logoTween.progress();
        logoTween.invalidate().duration(Math.max(24, firstLogoSet.getBoundingClientRect().width / 78)).progress(progress);
        syncLogos();
      };
      logos.addEventListener('pointerenter', pauseLogos);
      logos.addEventListener('pointerleave', resumeLogos);
      const logoTrigger = playWhileVisible(logos, logoTween);
      document.addEventListener('visibilitychange', syncLogos);
      ScrollTrigger.addEventListener('refresh', refreshLogos);
      cleanups.push(() => {
        document.removeEventListener('visibilitychange', syncLogos);
        ScrollTrigger.removeEventListener('refresh', refreshLogos);
        logos.removeEventListener('pointerenter', pauseLogos);
        logos.removeEventListener('pointerleave', resumeLogos);
        logoTween.kill();
        logoTrack.replaceWith(logoImage);
      });
    }

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  };

  /* Seções ANTES do público (posições não dependem do pin). */
  const createSectionMotionAbove = () => {
    const titles = [
      '.brand-heading h2',
      '.trusted h3',
      '.process-copy h2',
      '.solutions-heading h2',
      '.audience-heading h2'
    ];
    titles.forEach((selector) => splitReveal(one(selector)));

    const subtitles = [
      '.brand-heading > p',
      '.process-copy > p'
    ];
    subtitles.forEach((selector) => splitReveal(one(selector), { start: 'top 88%' }));

    reveal('.brand-heading .eyebrow', { trigger: '.brand-heading', y: 16, duration: .65 });
    reveal('.brand-carousel-wrap', { trigger: '.brand-carousel-wrap', y: 40, scale: .985, duration: .86 });
    reveal('.process-copy .eyebrow', { trigger: '.process-copy', y: 24 });
    reveal('.process-card-image', { trigger: '.process-carousel', y: 34, scale: .97, stagger: .07, duration: .82 });
    reveal('.solutions-heading .eyebrow', { trigger: '.solutions-heading', y: 16, duration: .65 });
    reveal('.solution-card', { trigger: '.solutions-grid', y: 42, scale: .975, stagger: .075, duration: .82 });
    reveal('.audience-heading .eyebrow', { trigger: '.audience-heading', y: 16, duration: .65 });
  };

  /* Seções DEPOIS do público: só são armadas depois que o pin existe,
     assim cada start/end já considera o espaçamento do pin. */
  const createSectionMotionBelow = () => {
    ['.feedback-content h2', '.faq-heading h2', '.contact-copy h2'].forEach((selector) => splitReveal(one(selector)));
    splitReveal(one('.contact-copy > p'), { start: 'top 88%' });

    reveal('.feedback-card', { trigger: '.feedback-grid', y: 36, scale: .985, stagger: .1, duration: .76 });
    reveal('.faq-heading .eyebrow', { trigger: '.faq-heading', y: 16, duration: .65 });
    reveal('.faq-item', { trigger: '.accordion', y: 34, scale: .985, stagger: .07, duration: .9, ease: 'power3.out' });
    reveal('.contact-copy .eyebrow', { trigger: '.contact-copy', y: 24 });
    reveal('.contact-form', { trigger: '.contact-grid', y: 42, scale: .985, duration: .9 });
    reveal('.footer-grid > h2, .footer-grid > div', { trigger: '.site-footer', y: 28, stagger: .09, duration: .72, start: 'top 82%' });
  };

  const createAudienceScrollScene = () => {
    const scene = one('.audience');
    if (!scene) return null;
    const collage = one('.audience-collage', scene);
    const couple = one('.audience-people', scene);
    const bg = one('.audience-bg', scene);
    const order = ['audience-slogan', 'audience-event', 'audience-selection', 'audience-payment', 'audience-ticket', 'audience-success'];
    const cardSlots = order.map((name) => one(`.${name}`, scene)).filter(Boolean);
    const cards = all('.audience-motion-card', scene);
    if (!couple || !cardSlots.length) return null;

    // A mesma sequencia acompanha o scroll nativo no desktop e no touch.
    // O espacamento do pin e ocupado pela cena enquanto os cards entram.

    // Decodifica as imagens antes de usar: evita engasgo quando entram durante o scrub.
    const images = all('img', scene);
    let sceneDisposed = false;
    const imageObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      imageObserver.disconnect();
      images.forEach((img) => { img.loading = 'eager'; });
      Promise.all(images.map((img) => (img.decode ? img.decode().catch(() => {}) : null)))
        .then(() => { if (!sceneDisposed) queueMotionRefresh(); });
    }, { rootMargin: '600px' });
    imageObserver.observe(scene);

    gsap.set([couple, ...cardSlots], { force3D: true, willChange: 'transform,opacity' });

    // Flutuação leve e contínua (só roda enquanto a cena está ativa).
    const floatTweens = cards.map((card, index) => gsap.to(card, {
      y: index % 2 ? 6 : -6,
      rotation: index % 2 ? 1.1 : -1.1,
      duration: 3.2 + (index % 3) * .5,
      delay: index * .1,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      force3D: true,
      paused: true
    }));

    // Comprimento do pin: mais distância por movimento = movimento mais calmo.
    const pinLength = () => {
      const multiplier = window.innerWidth <= 900 ? 1.7 : 2.8;
      return Math.round(window.innerHeight * multiplier);
    };

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: scene,
        start: 'top top',
        end: () => `+=${pinLength()}`,
        pin: true,
        pinSpacing: true,
        scrub: 1.1,            // "inércia" do scrub: suaviza o acompanhamento do scroll
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 10,   // pin é medido primeiro; tudo abaixo mede depois dele
        onEnter: () => floatTweens.forEach((tween) => tween.play()),
        onEnterBack: () => floatTweens.forEach((tween) => tween.play()),
        onLeave: () => floatTweens.forEach((tween) => tween.pause()),
        onLeaveBack: () => floatTweens.forEach((tween) => tween.pause())
      }
    });

    // Casal: sobe devagar com ease simétrico (sem "arrancada" no início).
    timeline
      .fromTo(couple, { y: 80, scale: .95 }, { y: 0, scale: 1, duration: 1.7, ease: 'sine.inOut' }, 0)
      .fromTo(couple, { autoAlpha: 0 }, { autoAlpha: 1, duration: .9 }, 0);

    // Cards entram sobrepostos, vindo do lado em que ficam, com ease simétrico.
    const half = collage ? collage.offsetWidth / 2 : window.innerWidth / 2;
    cardSlots.forEach((slot, index) => {
      const start = .55 + index * .42;
      const side = () => (slot.offsetLeft + slot.offsetWidth / 2 < (collage ? collage.offsetWidth / 2 : half) ? -1 : 1);
      timeline
        .fromTo(slot,
          { x: () => side() * 64, y: 70, scale: .9 },
          { x: 0, y: 0, scale: 1, duration: 1.3, ease: 'sine.inOut' },
          start
        )
        .fromTo(slot, { autoAlpha: 0 }, { autoAlpha: 1, duration: .75 }, start);
    });

    const total = .55 + (cardSlots.length - 1) * .42 + 1.3;
    if (bg) timeline.fromTo(bg, { scale: 1.07 }, { scale: 1, duration: total + .5 }, 0);
    timeline.to({}, { duration: .5 });   // respiro final antes de liberar o scroll

    return () => {
      sceneDisposed = true;
      imageObserver.disconnect();
      timeline.scrollTrigger?.kill();
      timeline.kill();
      floatTweens.forEach((tween) => tween.kill());
      gsap.set([couple, bg, ...cardSlots, ...cards].filter(Boolean), { clearProps: 'opacity,visibility,transform,willChange' });
    };
  };

  const createParallax = () => {
    const effects = [
      ['.hero-visual > img', '.hero', 4],
      ['.brand-word', '.brand-story', -7]
    ];
    effects.forEach(([target, trigger, yPercent]) => {
      if (!one(target)) return;
      gsap.to(target, {
        yPercent,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start: 'top bottom',
          end: 'bottom top',
          scrub: .8,
          invalidateOnRefresh: true
        }
      });
    });
  };

  const bindHover = (selector, enter, leave, eventSignal) => {
    all(selector).forEach((element) => {
      element.addEventListener('pointerenter', () => gsap.to(element, {
        ...enter,
        autoAlpha: 1,
        duration: .25,
        ease: 'power2.out',
        overwrite: 'auto'
      }), { signal: eventSignal });
      element.addEventListener('pointerleave', () => gsap.to(element, {
        ...leave,
        autoAlpha: 1,
        duration: .3,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'opacity,visibility,transform,filter,boxShadow'
      }), { signal: eventSignal });
    });
  };

  const createInteractions = (eventSignal) => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      bindHover('.button, .nav-cta, .footer-cta', { y: -2, scale: 1.015, filter: 'brightness(1.08)' }, { y: 0, scale: 1, filter: 'brightness(1)' }, eventSignal);
      bindHover('.solution-card, .feedback-card', { y: -6, boxShadow: '0 20px 48px rgba(0,0,0,.22)' }, { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' }, eventSignal);
      bindHover('.process-arrow', { scale: 1.07, filter: 'brightness(1.08)' }, { scale: 1, filter: 'brightness(1)' }, eventSignal);
    }

    document.addEventListener('process:change', (event) => {
      const card = event.detail?.activeCard;
      if (!card) return;
      gsap.killTweensOf(card);
      gsap.fromTo(card, { scale: .965, autoAlpha: .72 }, { scale: 1, autoAlpha: 1, duration: .48, ease: 'power2.out', clearProps: 'opacity,visibility,transform' });
    }, { signal: eventSignal });

    let faqRefreshTimer = null;
    eventSignal.addEventListener('abort', () => clearTimeout(faqRefreshTimer), { once: true });
    let lastDocHeight = document.documentElement.scrollHeight;
    const queueRefresh = () => {
      clearTimeout(faqRefreshTimer);
      faqRefreshTimer = setTimeout(() => {
        const height = document.documentElement.scrollHeight;
        if (height !== lastDocHeight) {   // só recalcula se a página realmente mudou de altura
          lastDocHeight = height;
          queueMotionRefresh();
        }
      }, 140);
    };

    document.addEventListener('faq:toggle', (event) => {
      const { answer, open, fromHeight, toHeight } = event.detail || {};
      if (!answer) return;
      const copy = answer.firstElementChild;
      gsap.killTweensOf([answer, copy]);

      // Altura: abrir e fechar usam a mesma curva suave, então o par abre/fecha se compensa sem "pulo".
      gsap.fromTo(answer,
        { height: fromHeight },
        {
          height: toHeight,
          duration: open ? .62 : .5,
          ease: 'power3.inOut',
          force3D: true,
          clearProps: 'height',
          onComplete: queueRefresh
        }
      );

      // Texto: surge depois que a caixa já começou a abrir; some antes de fechar.
      if (copy) {
        gsap.fromTo(copy,
          { autoAlpha: open ? 0 : 1, y: open ? -10 : 0 },
          {
            autoAlpha: open ? 1 : 0,
            y: open ? 0 : -6,
            duration: open ? .5 : .26,
            delay: open ? .14 : 0,
            ease: 'power2.out',
            clearProps: 'opacity,visibility,transform'
          }
        );
      }
      // A setinha gira por CSS transition (interrompível e sem "reset" no fim).
    }, { signal: eventSignal });

    document.addEventListener('menu:toggle', (event) => {
      const nav = one('.main-nav');
      if (!nav || window.innerWidth > 1100) {
        if (nav) clearMotion(nav);
        return;
      }
      const open = Boolean(event.detail?.open);
      gsap.killTweensOf(nav);
      if (open) {
        gsap.fromTo(nav, { xPercent: 105, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: .4, ease: 'power3.out', clearProps: 'opacity,visibility,transform' });
      } else {
        gsap.set(nav, { visibility: 'visible' });
        gsap.fromTo(nav, { xPercent: 0, autoAlpha: 1 }, { xPercent: 105, autoAlpha: 0, duration: .32, ease: 'power2.in', clearProps: 'opacity,visibility,transform' });
      }
    }, { signal: eventSignal });
  };

  const boot = () => {
    if (media || signal.aborted) return;
    media = gsap.matchMedia();
    media.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 521px)' }, (context) => {
      if (!context.conditions.motion) return;
      const interactionController = new AbortController();
      const splitStart = splits.length;
      const copyStart = accessibleCopies.length;
      const preloader = window.STPreloader;
      if (!preloader) {
        createHeroTimeline();
      } else if (!preloader.finished) {
        const heroTimeline = createHeroTimeline({ paused: true });
        document.documentElement.classList.add('hero-motion-ready');
        preloader.ready.then(() => {
          if (!interactionController.signal.aborted) heroTimeline.play(0);
        });
      }
      // Se as bibliotecas chegaram tarde, a entrada em CSS ja ocorreu; nao a reinicia.
      createSectionMotionAbove();
      createInteractions(interactionController.signal);
      const removeMarquee = createMarquee();
      // O pin do público é criado ANTES de tudo que vem depois dele na página.
      const removeAudienceScrollScene = createAudienceScrollScene();
      createSectionMotionBelow();
      ScrollTrigger.sort();
      return () => {
        interactionController.abort();
        removeMarquee?.();
        removeAudienceScrollScene?.();
        splits.splice(splitStart).forEach((split) => split.revert());
        accessibleCopies.splice(copyStart).forEach((copy) => copy.remove());
      };
    });
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 1101px)', createParallax);

    queueMotionRefresh();
    window.addEventListener('load', queueMotionRefresh, { once: true, signal });
  };

  const destroy = () => {
    controller.abort();
    cancelAnimationFrame(refreshFrame);
    media?.revert();
    splits.splice(0).forEach((split) => split.revert());
    accessibleCopies.splice(0).forEach((copy) => copy.remove());
  };

  (document.fonts?.ready || Promise.resolve()).then(boot).catch(() => {
    media?.revert();
    splits.splice(0).forEach((split) => split.revert());
    accessibleCopies.splice(0).forEach((copy) => copy.remove());
    document.documentElement.classList.remove('hero-motion-ready');
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) destroy();
  }, { signal });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) queueMotionRefresh();
  }, { signal });
})();
