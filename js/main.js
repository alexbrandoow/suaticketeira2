(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const scrollbarThumb = document.querySelector('.scrollbar-thumb');
  let lastFocusedElement = null;

  let scrollbarFrame = 0;
  let thumbHeight = 0;
  let scrollbarNeedsMeasure = true;
  let measuredDocumentHeight = 0;
  const updateScrollbar = () => {
    scrollbarFrame = 0;
    if (!scrollbarThumb) return;

    const root = document.documentElement;
    const viewportHeight = window.innerHeight;
    if (scrollbarNeedsMeasure) {
      measuredDocumentHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
      scrollbarNeedsMeasure = false;
    }
    const documentHeight = measuredDocumentHeight;
    const scrollRange = documentHeight - viewportHeight;

    if (scrollRange <= 1) {
      scrollbarThumb.classList.remove('is-visible');
      return;
    }

    thumbHeight = Math.max(48, viewportHeight * (viewportHeight / documentHeight));
    const thumbRange = viewportHeight - thumbHeight;
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
    scrollbarThumb.style.height = `${thumbHeight}px`;
    scrollbarThumb.style.transform = `translate3d(0,${progress * thumbRange}px,0)`;
    scrollbarThumb.classList.add('is-visible');
  };

  const scheduleScrollbarUpdate = (measure = false) => {
    if (measure === true) scrollbarNeedsMeasure = true;
    if (!scrollbarFrame) scrollbarFrame = requestAnimationFrame(updateScrollbar);
  };

  let draggingScrollbar = false;
  let dragStartY = 0;
  let dragStartScroll = 0;

  scrollbarThumb?.addEventListener('pointerdown', (event) => {
    draggingScrollbar = true;
    dragStartY = event.clientY;
    dragStartScroll = window.scrollY;
    scrollbarThumb.setPointerCapture(event.pointerId);
    scrollbarThumb.classList.add('is-dragging');
    document.body.style.userSelect = 'none';
  });

  scrollbarThumb?.addEventListener('pointermove', (event) => {
    if (!draggingScrollbar) return;
    const viewportHeight = window.innerHeight;
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const thumbRange = Math.max(1, viewportHeight - thumbHeight);
    const scrollRange = Math.max(0, documentHeight - viewportHeight);
    window.scrollTo(0, dragStartScroll + (event.clientY - dragStartY) * (scrollRange / thumbRange));
  });

  const stopScrollbarDrag = (event) => {
    if (!draggingScrollbar) return;
    draggingScrollbar = false;
    if (scrollbarThumb.hasPointerCapture(event.pointerId)) scrollbarThumb.releasePointerCapture(event.pointerId);
    scrollbarThumb.classList.remove('is-dragging');
    document.body.style.userSelect = '';
  };

  scrollbarThumb?.addEventListener('pointerup', stopScrollbarDrag);
  scrollbarThumb?.addEventListener('pointercancel', stopScrollbarDrag);
  window.addEventListener('scroll', scheduleScrollbarUpdate, { passive: true });
  window.addEventListener('resize', () => scheduleScrollbarUpdate(true), { passive: true });
  window.addEventListener('load', () => scheduleScrollbarUpdate(true), { once: true });
  new ResizeObserver(() => scheduleScrollbarUpdate(true)).observe(document.body);
  scheduleScrollbarUpdate();

  const menuFocusableElements = () => [...(nav?.querySelectorAll('a[href], button:not([disabled])') ?? [])];

  const closeMenu = ({ restoreFocus = false } = {}) => {
    const wasOpen = nav?.classList.contains('is-open');
    nav?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Abrir menu');
    if (restoreFocus && wasOpen && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    if (wasOpen) document.dispatchEvent(new CustomEvent('menu:toggle', { detail: { open: false } }));
  };

  menuButton?.addEventListener('click', () => {
    const opening = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', opening);
    document.body.classList.toggle('menu-open', opening);
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Fechar menu' : 'Abrir menu');
    document.dispatchEvent(new CustomEvent('menu:toggle', { detail: { open: opening } }));
    if (opening) {
      lastFocusedElement = document.activeElement;
      requestAnimationFrame(() => menuFocusableElements()[0]?.focus());
    }
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu({ restoreFocus: true });
    if (event.key !== 'Tab' || !nav?.classList.contains('is-open')) return;
    const focusable = [menuButton, ...menuFocusableElements()].filter(Boolean);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) closeMenu();
  });

  const carousel = document.querySelector('[data-process-carousel]');
  const processCards = [...(carousel?.querySelectorAll('[data-process-card]') ?? [])];
  const processStatus = carousel?.querySelector('[data-process-status]');
  const processPagination = carousel?.querySelector('.process-pagination');
  const processCardClasses = ['is-prev-far', 'is-prev', 'is-active', 'is-next', 'is-next-far'];
  const processDots = processCards.map((card, index) => {
    const dot = document.createElement('button');
    dot.className = 'process-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir para a etapa ${index + 1}`);
    dot.addEventListener('click', () => {
      activeProcessCard = index;
      renderProcessCarousel();
    });
    processPagination?.appendChild(dot);
    return dot;
  });
  let activeProcessCard = Math.min(2, processCards.length - 1);
  let processPointerStart = null;

  const renderProcessCarousel = () => {
    processCards.forEach((card, index) => {
      card.classList.remove(...processCardClasses);
      const distance = (index - activeProcessCard + processCards.length) % processCards.length;
      const positionClass = distance === 0 ? 'is-active'
        : distance === 1 ? 'is-next'
          : distance === 2 ? 'is-next-far'
            : distance === processCards.length - 1 ? 'is-prev'
              : 'is-prev-far';
      card.classList.add(positionClass);
      card.setAttribute('aria-hidden', String(index !== activeProcessCard));
    });
    processDots.forEach((dot, index) => {
      const isActive = index === activeProcessCard;
      dot.classList.toggle('is-active', isActive);
      if (isActive) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    if (processStatus) processStatus.textContent = `Etapa ${activeProcessCard + 1} de ${processCards.length}`;
    document.dispatchEvent(new CustomEvent('process:change', {
      detail: { activeCard: processCards[activeProcessCard], cards: processCards }
    }));
  };

  const showPreviousProcessCard = () => {
    activeProcessCard = (activeProcessCard - 1 + processCards.length) % processCards.length;
    renderProcessCarousel();
  };

  const showNextProcessCard = () => {
    activeProcessCard = (activeProcessCard + 1) % processCards.length;
    renderProcessCarousel();
  };

  carousel?.querySelector('.process-arrow-prev')?.addEventListener('click', showPreviousProcessCard);

  carousel?.querySelector('.process-arrow-next')?.addEventListener('click', showNextProcessCard);

  carousel?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
    if (event.key === 'ArrowLeft') showPreviousProcessCard();
    if (event.key === 'ArrowRight') showNextProcessCard();
  });

  carousel?.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    processPointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  carousel?.addEventListener('pointerup', (event) => {
    if (processPointerStart === null || processPointerStart.id !== event.pointerId) return;
    const distance = event.clientX - processPointerStart.x;
    const verticalDistance = event.clientY - processPointerStart.y;
    processPointerStart = null;
    if (Math.abs(distance) < 45 || Math.abs(distance) <= Math.abs(verticalDistance)) return;
    if (distance > 0) showPreviousProcessCard();
    else showNextProcessCard();
  });
  carousel?.addEventListener('pointercancel', () => { processPointerStart = null; });

  if (processCards.length) renderProcessCarousel();

  const videoSection = document.querySelector('[data-video-showcase]');
  const showcaseVideo = videoSection?.querySelector('.showcase-video');
  const videoToggle = videoSection?.querySelector('.video-toggle');
  const videoSound = videoSection?.querySelector('.video-sound');
  const videoProgress = videoSection?.querySelector('.video-progress');
  const videoVolume = videoSection?.querySelector('.video-volume');
  const videoTime = videoSection?.querySelector('.video-time');
  const mobileVideoQuery = window.matchMedia('(max-width: 1100px)');
  const portraitVideoQuery = window.matchMedia('(max-width: 1100px) and (orientation: portrait)');
  let videoIsVisible = false;
  let videoIsSeeking = false;
  let videoWantsSound = true;
  let videoUserPaused = false;
  let videoSoundBlocked = false;
  let videoPlayRequest = 0;

  const formatVideoTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  const syncVideoControls = () => {
    if (!showcaseVideo) return;
    const isPlaying = !showcaseVideo.paused && !showcaseVideo.ended;
    const hasSound = !showcaseVideo.muted && showcaseVideo.volume > 0;
    videoToggle?.classList.toggle('is-playing', isPlaying);
    videoToggle?.setAttribute('aria-pressed', String(isPlaying));
    videoToggle?.setAttribute('aria-label', isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo');
    const controlsAreVisible = videoSection?.classList.contains('is-controls-visible');
    showcaseVideo.setAttribute('aria-label', mobileVideoQuery.matches
      ? (controlsAreVisible ? 'Ocultar controles do vídeo' : 'Mostrar controles do vídeo')
      : (isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'));
    showcaseVideo.setAttribute('aria-expanded', String(mobileVideoQuery.matches && controlsAreVisible));
    videoSound?.classList.toggle('has-sound', hasSound);
    videoSound?.setAttribute('aria-pressed', String(hasSound));
    videoSound?.setAttribute('aria-label', hasSound ? 'Desativar som' : 'Ativar som');

    const duration = showcaseVideo.duration || 0;
    const progress = duration ? (showcaseVideo.currentTime / duration) * 100 : 0;
    if (videoProgress && !videoIsSeeking) videoProgress.value = String(progress);
    if (videoVolume && document.activeElement !== videoVolume) videoVolume.value = String(Math.round(showcaseVideo.volume * 100));
    if (videoTime) videoTime.textContent = formatVideoTime(showcaseVideo.currentTime);
  };

  const playShowcaseVideo = async () => {
    if (!showcaseVideo) return;
    const request = ++videoPlayRequest;
    showcaseVideo.muted = !videoWantsSound || showcaseVideo.volume === 0;
    try {
      await showcaseVideo.play();
      if (request !== videoPlayRequest) return;
      videoSoundBlocked = false;
    } catch (error) {
      // Uma pausa ou troca de fonte cancela o pedido; nao deve reiniciar o video.
      if (request !== videoPlayRequest || error.name !== 'NotAllowedError') return;
      videoSoundBlocked = videoWantsSound && showcaseVideo.volume > 0;
      showcaseVideo.muted = true;
      await showcaseVideo.play().catch(() => {});
      if (request !== videoPlayRequest) return;
    }
    syncVideoControls();
  };

  const setVideoSoundForVisibility = async () => {
    if (!showcaseVideo) return;
    if (!videoIsVisible || document.hidden) {
      showcaseVideo.muted = true;
      syncVideoControls();
      return;
    }

    if (!videoUserPaused) await playShowcaseVideo();
  };

  if (videoSection && showcaseVideo) {
    showcaseVideo.volume = Number(videoVolume?.value ?? 80) / 100;
    showcaseVideo.addEventListener('play', syncVideoControls);
    showcaseVideo.addEventListener('pause', syncVideoControls);
    showcaseVideo.addEventListener('volumechange', syncVideoControls);
    showcaseVideo.addEventListener('timeupdate', syncVideoControls);
    showcaseVideo.addEventListener('loadedmetadata', syncVideoControls);

    // Define uma unica fonte: horizontal no desktop e vertical no mobile em retrato.
    const updateVideoSource = () => {
      const source = portraitVideoQuery.matches
        ? showcaseVideo.dataset.srcMobile
        : showcaseVideo.dataset.srcDesktop;
      if (!source || showcaseVideo.getAttribute('src') === source) return;

      videoSection.classList.remove('is-controls-visible', 'is-controls-hovered');
      videoPlayRequest += 1;
      showcaseVideo.setAttribute('src', source);
      showcaseVideo.load();
      if (videoIsVisible) setVideoSoundForVisibility();
      else showcaseVideo.pause();
      syncVideoControls();
    };
    portraitVideoQuery.addEventListener('change', updateVideoSource);
    mobileVideoQuery.addEventListener('change', syncVideoControls);
    updateVideoSource();

    const toggleShowcaseVideo = () => {
      videoUserPaused = !showcaseVideo.paused;
      if (!videoUserPaused) playShowcaseVideo();
      else {
        videoPlayRequest += 1;
        showcaseVideo.pause();
      }
    };
    videoToggle?.addEventListener('click', toggleShowcaseVideo);

    const activateShowcaseVideo = () => {
      if (!mobileVideoQuery.matches) {
        toggleShowcaseVideo();
        return;
      }

      videoSection.classList.toggle('is-controls-visible');
      syncVideoControls();
    };

    showcaseVideo.addEventListener('click', activateShowcaseVideo);
    showcaseVideo.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activateShowcaseVideo();
    });

    videoSound?.addEventListener('click', () => {
      videoWantsSound = showcaseVideo.muted || showcaseVideo.volume === 0;
      if (videoWantsSound && showcaseVideo.volume === 0) showcaseVideo.volume = 0.8;
      showcaseVideo.muted = !videoWantsSound;
      videoSoundBlocked = false;
      if (!videoUserPaused) playShowcaseVideo();
      syncVideoControls();
    });

    videoSection.addEventListener('pointermove', (event) => {
      const bounds = videoSection.getBoundingClientRect();
      const distanceFromBottom = bounds.bottom - event.clientY;
      const isOverVideoFooter = distanceFromBottom >= 0 && distanceFromBottom <= 110;
      videoSection.classList.toggle('is-controls-hovered', isOverVideoFooter);
    }, { passive: true });

    videoSection.addEventListener('mouseleave', () => {
      videoSection.classList.remove('is-controls-hovered');
    });

    const finishVideoSeek = () => {
      if (!videoIsSeeking) return;
      videoIsSeeking = false;
      syncVideoControls();
    };

    videoProgress?.addEventListener('pointerdown', () => {
      videoIsSeeking = true;
    });

    videoProgress?.addEventListener('input', () => {
      if (!showcaseVideo.duration) return;
      showcaseVideo.currentTime = (Number(videoProgress.value) / 100) * showcaseVideo.duration;
      syncVideoControls();
    });

    videoProgress?.addEventListener('pointerup', finishVideoSeek);
    videoProgress?.addEventListener('pointercancel', finishVideoSeek);
    videoProgress?.addEventListener('change', finishVideoSeek);
    videoProgress?.addEventListener('blur', finishVideoSeek);
    document.addEventListener('pointerup', finishVideoSeek, { passive: true });

    videoVolume?.addEventListener('input', () => {
      const volume = Number(videoVolume.value) / 100;
      showcaseVideo.volume = volume;
      videoWantsSound = volume > 0;
      showcaseVideo.muted = volume === 0;
      videoSoundBlocked = false;
      if (!videoUserPaused) playShowcaseVideo();
      syncVideoControls();
    });

    const unlockMedia = (event) => {
      if (event?.target?.closest?.('[data-video-showcase]')) return;
      if (videoIsVisible && videoSoundBlocked && videoWantsSound && !videoUserPaused) playShowcaseVideo();
    };
    document.addEventListener('click', unlockMedia);
    document.addEventListener('touchend', unlockMedia, { passive: true });
    document.addEventListener('keydown', unlockMedia);

    const videoPreloadObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      showcaseVideo.preload = 'metadata';
      videoPreloadObserver.disconnect();
    }, { rootMargin: '800px' });
    videoPreloadObserver.observe(videoSection);

    const syncVideoPageVisibility = () => {
      if (document.hidden) {
        videoPlayRequest += 1;
        showcaseVideo.muted = true;
        showcaseVideo.pause();
      } else if (videoIsVisible) setVideoSoundForVisibility();
    };
    document.addEventListener('visibilitychange', syncVideoPageVisibility);
    window.addEventListener('pagehide', () => {
      videoPlayRequest += 1;
      showcaseVideo.muted = true;
      showcaseVideo.pause();
    });
    window.addEventListener('pageshow', syncVideoPageVisibility);

    const videoObserver = new IntersectionObserver(([entry]) => {
      const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      if (isVisible === videoIsVisible) return;
      videoIsVisible = isVisible;
      if (videoIsVisible) setVideoSoundForVisibility();
      else {
        videoSection.classList.remove('is-controls-visible');
        videoPlayRequest += 1;
        showcaseVideo.muted = true;
        showcaseVideo.pause();
        syncVideoControls();
      }
    }, { threshold: [0, 0.1, 0.65] });
    videoObserver.observe(videoSection);
  }

  const faqItems = [...document.querySelectorAll('.faq-item')];
  const setFaqState = (item, open) => {
    const answer = item.querySelector('.faq-answer');
    const button = item.querySelector('button');
    const fromHeight = answer?.getBoundingClientRect().height ?? 0;
    item.classList.toggle('is-open', open);
    button?.setAttribute('aria-expanded', String(open));
    const toHeight = open ? (answer?.scrollHeight ?? 0) : 0;
    document.dispatchEvent(new CustomEvent('faq:toggle', {
      detail: { item, answer, button, open, fromHeight, toHeight }
    }));
  };

  faqItems.forEach((item) => {
    const button = item.querySelector('button');
    const indicator = button?.querySelector('span');
    if (indicator) indicator.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    button?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      faqItems.forEach((entry) => {
        if (entry.classList.contains('is-open')) setFaqState(entry, false);
      });
      if (!wasOpen) setFaqState(item, true);
    });
  });

  const phoneInput = document.querySelector('#telefone');
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length < 2) return `(${digits}`;
    if (digits.length === 2) return `(${digits}) `;

    const areaCode = digits.slice(0, 2);
    const number = digits.slice(2);
    if (number.length <= 4) return `(${areaCode}) ${number}`;

    return `(${areaCode}) ${number.slice(0, -4)}-${number.slice(-4)}`;
  };

  phoneInput?.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  phoneInput?.addEventListener('keydown', (event) => {
    const cursorAtEnd = phoneInput.selectionStart === phoneInput.value.length
      && phoneInput.selectionEnd === phoneInput.value.length;
    if (event.key !== 'Backspace' || !cursorAtEnd || !/\D$/.test(phoneInput.value)) return;

    event.preventDefault();
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, -1);
    phoneInput.value = formatPhone(digits);
  });

  const form = document.querySelector('.contact-form');
  form?.querySelectorAll('input,textarea').forEach((field) => {
    field.addEventListener('input', () => field.removeAttribute('aria-invalid'));
    field.addEventListener('invalid', () => field.setAttribute('aria-invalid', 'true'));
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const honeypot = form.querySelector('[name="website"]');
    form.querySelectorAll('input[type="text"],input[type="email"],textarea').forEach((field) => {
      if (field !== honeypot) field.value = field.value.trim();
    });
    if (honeypot?.value) {
      status.textContent = 'Não foi possível validar a solicitação.';
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = 'Confira os campos obrigatórios.';
      return;
    }
    status.textContent = 'Formulário validado. O canal seguro de envio ainda não está configurado.';
  });
  const finePointer = window.matchMedia('(pointer: fine)');
  const reducedCursorMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (finePointer.matches && !reducedCursorMotion.matches) {
    const cursor = document.createElement('span');
    const cursorImage = document.createElement('img');
    const arrowCursorSrc = 'ASSETS/figma/cursor-orange-3d.png';
    const handCursorSrc = 'ASSETS/figma/cursor-orange-hand-3d.png';
    const handCursorPreload = new Image();
    cursor.className = 'site-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursorImage.alt = '';
    cursorImage.addEventListener('load', () => document.documentElement.classList.add('has-custom-cursor'), { once: true });
    cursorImage.src = arrowCursorSrc;
    handCursorPreload.src = handCursorSrc;
    cursor.appendChild(cursorImage);
    document.body.appendChild(cursor);

    const pointer = { x: -100, y: -100, hotspotX: 4, hotspotY: 4, frame: 0, visible: false };
    let cursorMode = 'arrow';
    const interactiveSelector = 'a,button,input,textarea,select,label,[role="button"],[data-circular-carousel]';

    const drawCursor = () => {
      pointer.frame = 0;
      cursor.style.transform = `translate3d(${pointer.x - pointer.hotspotX}px,${pointer.y - pointer.hotspotY}px,0)`;
    };

    const scheduleCursor = () => {
      if (!pointer.frame) pointer.frame = requestAnimationFrame(drawCursor);
    };

    window.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!pointer.visible) {
        pointer.visible = true;
        cursor.classList.add('is-visible');
      }
      scheduleCursor();
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      const interactive = event.target.closest?.(interactiveSelector);
      const isInteractive = Boolean(interactive);
      const nextMode = isInteractive ? 'hand' : 'arrow';
      if (nextMode === cursorMode) return;
      cursorMode = nextMode;
      cursor.classList.toggle('is-interactive', isInteractive);
      cursorImage.src = isInteractive ? handCursorSrc : arrowCursorSrc;
      pointer.hotspotX = isInteractive ? 12 : 4;
      pointer.hotspotY = isInteractive ? 1 : 4;
      scheduleCursor();
    }, { passive: true });

    window.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'), { passive: true });
    window.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'), { passive: true });
    document.documentElement.addEventListener('mouseleave', () => {
      pointer.visible = false;
      cursor.classList.remove('is-visible', 'is-pressed');
    });
  }
})();
