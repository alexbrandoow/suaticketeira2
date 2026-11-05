(() => {
  const roots = [...document.querySelectorAll('[data-circular-carousel]')];
  if (!roots.length) return;

  const CARD_WIDTH = 360;
  const GAP = 25;
  const TILES = 1;
  const OVERLAP = 0;
  const TILT = -5;
  const PERSPECTIVE = 2500;
  const SPEED = 14;
  const MOMENTUM = .6;
  const DEPTH_FADE = .55;
  const STRETCH = .5;
  const PARALLAX = .3;
  const SPRING = 118;
  const SETTLE_SPEED = 9;
  const TO_RAD = Math.PI / 180;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)');
  // Aparelhos com pouca memoria/CPU recebem a mesma cena, sem sombras caras.
  const nav = typeof navigator === 'undefined' ? {} : navigator;
  const lite = (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4);
  // WebP derivado dos originais (ASSETS/figma/N.png permanecem intactos): 720px no desktop, 560px no touch.
  const IMAGE_SIZE = touchDevice.matches ? 560 : 720;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (degrees) => ((((degrees + 180) % 360) + 360) % 360) - 180;
  const easeOutQuint = (value) => 1 - Math.pow(1 - value, 5);

  const rotateX = (point, degrees) => {
    const radians = degrees * TO_RAD;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return [point[0], point[1] * cosine - point[2] * sine, point[1] * sine + point[2] * cosine];
  };

  const rotateY = (point, degrees) => {
    const radians = degrees * TO_RAD;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return [point[0] * cosine + point[2] * sine, point[1], -point[0] * sine + point[2] * cosine];
  };

  roots.forEach((root) => {
    const stage = root.querySelector('.circular-carousel__stage');
    const camera = root.querySelector('.circular-carousel__camera');
    const ring = root.querySelector('.circular-carousel__ring');
    const live = root.querySelector('.circular-carousel__live');
    if (!stage || !camera || !ring) return;

    const assetIndexes = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
    const items = assetIndexes.map((assetIndex) => ({
      src: `ASSETS/figma/carousel/${assetIndex}-${IMAGE_SIZE}.webp`,
      alt: 'Tela da plataforma SuaTicketeira',
      zoom: assetIndex === 3 ? 1.16 : 1,
      offsetY: assetIndex === 3 ? -56 : 0
    }));
    const count = items.length;
    const cardW = CARD_WIDTH;
    const cardH = CARD_WIDTH;
    const step = 360 / count;
    const pitch = cardW + GAP;
    const chord = pitch / (2 * Math.sin(Math.PI / Math.max(count, 3)));
    const arc = (count * pitch) / (2 * Math.PI);
    const radius = Math.max(arc, chord, cardW * .6);
    const bend = radius;
    const cards = [];
    const photos = [];
    const cardRenderState = [];
    const cardShades = [];
    const depthAt = angle => DEPTH_FADE * Math.pow((1 - Math.cos(angle * TO_RAD)) / 2, 1.25);

    const tileData = Array.from({ length: TILES }, (_, index) => {
      const length = cardW / TILES;
      const start = index * length - (index > 0 ? OVERLAP / 2 : 0);
      const end = (index + 1) * length + (index < TILES - 1 ? OVERLAP / 2 : 0);
      const center = (start + end) / 2 - cardW / 2;
      const alpha = center / bend;
      const shift = bend * Math.sin(alpha);
      const depth = -bend * (1 - Math.cos(alpha));
      const turn = alpha * 180 / Math.PI;
      return { index, start, end, size: end - start, move: `translate3d(${shift}px, 0, ${depth}px) rotateY(${turn}deg)` };
    });

    const createTile = (item, tile, back, shades) => {
      const strip = back ? TILES - 1 - tile.index : tile.index;
      const first = strip === 0;
      const last = strip === TILES - 1;
      const offset = back ? cardW - tile.end : tile.start;
      const tileElement = document.createElement('div');
      tileElement.className = 'circular-carousel__tile';
      tileElement.setAttribute('aria-hidden', 'true');
      tileElement.style.cssText = `left:${-tile.size / 2}px;top:${-cardH / 2}px;width:${tile.size}px;height:${cardH}px;transform:${tile.move}${back ? ' rotateY(180deg)' : ''}`;

      const frame = document.createElement('div');
      frame.className = 'circular-carousel__frame';
      frame.style.height = `${cardH}px`;
      frame.style.borderRadius = `${first ? 'var(--cc-radius)' : 0} ${last ? 'var(--cc-radius)' : 0} ${last ? 'var(--cc-radius)' : 0} ${first ? 'var(--cc-radius)' : 0}`;

      const image = document.createElement('img');
      image.className = 'circular-carousel__photo';
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      photos.push({ image, src: item.src });
      const imageWidth = cardW * item.zoom;
      const imageHeight = cardH * item.zoom;
      const imageLeft = -(imageWidth - cardW) / 2 - offset * item.zoom;
      image.style.cssText = `left:${imageLeft}px;top:${item.offsetY}px;width:${imageWidth}px;height:${imageHeight}px`;
      frame.appendChild(image);

      if (back) {
        const inner = document.createElement('div');
        inner.className = 'circular-carousel__inner';
        frame.appendChild(inner);
      }

      const shade = document.createElement('div');
      shade.className = 'circular-carousel__shade';
      shades.push(shade);
      frame.appendChild(shade);
      tileElement.appendChild(frame);
      return tileElement;
    };

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'circular-carousel__card';
      card.dataset.ccIndex = String(index);
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${item.alt}, ${index + 1} de ${count}`);
      const shades = [];
      tileData.forEach((tile) => card.appendChild(createTile(item, tile, false, shades)));
      tileData.forEach((tile) => card.appendChild(createTile(item, tile, true, shades)));
      ring.appendChild(card);
      cards.push(card);
      cardRenderState.push({});
      cardShades.push(shades);

      card.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        state.hovered = index;
        card.dataset.hovered = '';
        wake();
      });

      card.addEventListener('pointerleave', () => {
        if (state.hovered === index) state.hovered = -1;
        delete card.dataset.hovered;
        wake();
      });
    });

    const state = {
      angle: 0,
      velocity: 0,
      target: null,
      fit: 1,
      shift: 0,
      drop: 0,
      yaw: 0,
      pitch: 0,
      hover: false,
      dragging: false,
      moved: false,
      pressX: 0,
      pressAngle: 0,
      samples: [],
      pointerInside: false,
      pointerX: 0,
      pointerY: 0,
      pointerSample: null,
      visible: false,
      last: 0,
      raf: 0,
      active: 0,
      introStart: 0,
      introDone: reducedMotion.matches,
      holdUntil: 0,
      hovered: -1,
      measuredWidth: 0,
      measuredHeight: 0,
      wakeTimer: 0,
      cruise: null,
      nativeDisabled: false,
      cameraTransform: '',
      ringTransform: ''
    };

    const nearest = (angle) => Math.round(angle / step) * step;

    // Baixa as texturas so quando a secao se aproxima e libera a cena depois do decode,
    // para nenhuma imagem ser decodificada no meio do giro (causa do trava/destrava).
    let photosRequested = false;
    const loadPhotos = () => {
      if (photosRequested) return;
      photosRequested = true;
      const pending = new Map();
      photos.forEach(({ image, src }) => {
        if (!pending.has(src)) pending.set(src, image);
        image.src = src;
      });
      const settled = [...pending.values()].map((image) => (typeof image.decode === 'function'
        ? image.decode().then(() => true, () => false)
        : Promise.resolve(true)));
      const release = (okay) => { if (okay) root.dataset.loaded = ''; wake(); };
      Promise.all(settled).then((results) => release(results.every(Boolean)));
      // Rede lenta: libera mesmo assim; imagens restantes entram assim que chegarem.
      setTimeout(() => release(true), 6000);
    };

    const measure = () => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (rect.width === state.measuredWidth && rect.height === state.measuredHeight) return;
      state.measuredWidth = rect.width;
      state.measuredHeight = rect.height;
      const width = rect.width * 1.12;
      const height = rect.height * .92;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const corners = [[-cardW / 2, -cardH / 2], [cardW / 2, -cardH / 2], [-cardW / 2, cardH / 2], [cardW / 2, cardH / 2]];

      for (let angle = -180; angle <= 180; angle += 7.5) {
        corners.forEach(([cornerX, cornerY]) => {
          let point = rotateX(rotateY([cornerX, cornerY, radius], angle), TILT);
          point = [point[0], point[1], point[2] - radius];
          if (point[2] >= PERSPECTIVE * .95) return;
          const scale = PERSPECTIVE / (PERSPECTIVE - point[2]);
          minX = Math.min(minX, point[0] * scale);
          maxX = Math.max(maxX, point[0] * scale);
          minY = Math.min(minY, point[1] * scale);
          maxY = Math.max(maxY, point[1] * scale);
        });
      }

      state.fit = Math.min(1, width / Math.max(maxX - minX, 1), height / Math.max(maxY - minY, 1));
      state.shift = -((minY + maxY) / 2) * state.fit;
      state.drop = (rect.height / state.fit) * .55 + cardH;
      stage.style.perspective = `${PERSPECTIVE}px`;
      stage.style.transform = `translate3d(0, ${state.shift}px, 0) scale(${state.fit})`;
    };

    const setActive = (index) => {
      if (index === state.active) return;
      state.active = index;
      if (live) live.textContent = `${items[index].alt}, ${index + 1} de ${count}`;
    };

    const render = (now) => {
      const stretch = 1 + STRETCH * .12 * Math.min(1, Math.abs(state.velocity) / 420);
      const currentRadius = radius * stretch;
      const cameraTransform = `translate3d(0, 0, ${(-currentRadius).toFixed(3)}px) rotateX(${(TILT + state.pitch).toFixed(3)}deg) rotateY(${state.yaw.toFixed(3)}deg)`;
      if (cameraTransform !== state.cameraTransform) {
        camera.style.transform = cameraTransform;
        state.cameraTransform = cameraTransform;
      }
      const ringTransform = `rotateY(${state.angle}deg)`;
      if (ringTransform !== state.ringTransform) {
        ring.style.transform = ringTransform;
        state.ringTransform = ringTransform;
      }

      cards.forEach((card, index) => {
        const base = index * step;
        let lift = 0;
        if (!state.introDone) {
          const elapsed = state.introStart ? now - state.introStart : 0;
          const reach = Math.abs(wrap(base + state.angle));
          const delay = (reach / 180) * 480;
          const progress = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1));
          lift = (1 - progress) * state.drop;
        }
        const transform = `rotateY(${base}deg) translateZ(${currentRadius.toFixed(3)}px) translateY(${lift.toFixed(3)}px)`;
        const previous = cardRenderState[index];
        if (previous.transform !== transform) {
          card.style.transform = transform;
          previous.transform = transform;
        }
        const depth = depthAt(wrap(base + state.angle)).toFixed(3);
        if (previous.depth !== depth) {
          // Opacity direto evita invalidar a arvore por uma variavel herdada.
          cardShades[index].forEach(shade => { shade.style.opacity = depth; });
          previous.depth = depth;
        }
      });

      const active = ((Math.round(-state.angle / step) % count) + count) % count;
      setActive(active);
    };

    // No touch, o giro constante usa transform/opacity nativos. O JS continua
    // responsavel pela entrada, pelo arraste e pela inercia, sem reduzir FPS.
    const startNativeCruise = (now) => {
      if (!touchDevice.matches || state.nativeDisabled || typeof ring.animate !== 'function') return false;
      if (!state.introDone || state.dragging || state.hover || state.target !== null
        || reducedMotion.matches || now < state.holdUntil || state.pointerInside
        || Math.abs(state.velocity + SPEED) > .03 || Math.abs(state.yaw) + Math.abs(state.pitch) > .002) return false;
      const animations = [];
      try {
        state.velocity = -SPEED;
        state.yaw = state.pitch = 0;
        render(now);
        const baseAngle = state.angle;
        const options = { duration: 360 / SPEED * 1000, iterations: Infinity, easing: 'linear' };
        const rotation = ring.animate([
          { transform: `rotateY(${baseAngle}deg)` },
          { transform: `rotateY(${baseAngle - 360}deg)` }
        ], options);
        animations.push(rotation);
        cardShades.forEach((shades, index) => {
          const keyframes = Array.from({ length: 73 }, (_, frame) => ({
            offset: frame / 72,
            opacity: depthAt(index * step + baseAngle - frame * 5)
          }));
          shades.forEach(shade => animations.push(shade.animate(keyframes, options)));
        });
        const startTime = document.timeline?.currentTime;
        if (typeof startTime === 'number') animations.forEach(animation => { animation.startTime = startTime; });
        state.cruise = { baseAngle, rotation, animations };
        state.last = 0;
        return true;
      } catch {
        animations.forEach(animation => animation.cancel());
        state.nativeDisabled = true;
        return false;
      }
    };

    const stopNativeCruise = () => {
      const cruise = state.cruise;
      if (!cruise) return;
      // Retoma exatamente no angulo exibido, inclusive apos varias voltas.
      state.angle = wrap(cruise.baseAngle - Number(cruise.rotation.currentTime || 0) * SPEED / 1000);
      state.cruise = null;
      render(performance.now());
      cruise.animations.forEach(animation => animation.cancel());
      state.last = 0;
    };

    const tick = (now) => {
      state.raf = 0;
      if (!state.visible || document.hidden) return;
      if (state.pointerSample) {
        const rect = root.getBoundingClientRect();
        state.pointerX = clamp(((state.pointerSample.x - rect.left) / rect.width) * 2 - 1, -1, 1);
        state.pointerY = clamp(((state.pointerSample.y - rect.top) / rect.height) * 2 - 1, -1, 1);
        state.pointerSample = null;
      }
      const deltaTime = state.last ? Math.min((now - state.last) / 1000, .05) : 1 / 60;
      state.last = now;

      if (!state.introStart) state.introStart = now;
      if (!state.introDone && now - state.introStart >= 1400) state.introDone = true;

      const paused = state.hover || state.dragging || now < state.holdUntil || reducedMotion.matches;
      const cruise = paused || !state.introDone ? 0 : -SPEED;

      if (state.dragging) {
        // The pointer handler controls the angle while dragging.
      } else if (state.target !== null) {
        let remaining = deltaTime;
        const damping = 2 * Math.sqrt(SPRING);
        while (remaining > 0) {
          const stepTime = Math.min(remaining, 1 / 240);
          const acceleration = SPRING * (state.target - state.angle) - damping * state.velocity;
          state.velocity += acceleration * stepTime;
          state.angle += state.velocity * stepTime;
          remaining -= stepTime;
        }
        if (Math.abs(state.target - state.angle) < .004 && Math.abs(state.velocity) < .03) {
          state.angle = state.target;
          state.velocity = 0;
          state.target = null;
        }
      } else {
        const tau = .18 + MOMENTUM * 1.5;
        state.velocity += (cruise - state.velocity) * (1 - Math.exp(-deltaTime / tau));
        state.angle += state.velocity * deltaTime;
        if (cruise === 0 && Math.abs(state.velocity) < SETTLE_SPEED && !reducedMotion.matches) {
          const snap = nearest(state.angle);
          if (Math.abs(snap - state.angle) > .004) state.target = snap;
          else state.velocity = 0;
        }
      }

      const easing = 1 - Math.exp(-deltaTime / .35);
      const targetYaw = state.pointerInside ? state.pointerX * PARALLAX * 9 : 0;
      const targetPitch = state.pointerInside ? -state.pointerY * PARALLAX * 6 : 0;
      state.yaw += (targetYaw - state.yaw) * easing;
      state.pitch += (targetPitch - state.pitch) * easing;

      render(now);
      if (startNativeCruise(now)) return;
      const moving = !state.introDone || state.dragging || state.target !== null || cruise !== 0
        || Math.abs(state.velocity) > .03 || Math.abs(targetYaw - state.yaw) + Math.abs(targetPitch - state.pitch) > .002;
      if (moving && state.visible && !document.hidden) state.raf = requestAnimationFrame(tick);
      else {
        state.last = 0;
        if (state.visible && !document.hidden && !state.hover && !reducedMotion.matches && state.holdUntil > now) {
          clearTimeout(state.wakeTimer);
          state.wakeTimer = setTimeout(wake, state.holdUntil - now + 16);
        }
      }
    };

    const wake = () => {
      clearTimeout(state.wakeTimer);
      stopNativeCruise();
      if (!state.raf && state.visible && !document.hidden) state.raf = requestAnimationFrame(tick);
    };

    const updatePointer = (event) => {
      // Touch usa apenas deslocamento para arrastar; nao precisa medir layout.
      if (event.pointerType === 'mouse') state.pointerSample = { x: event.clientX, y: event.clientY };
    };

    root.addEventListener('pointerenter', (event) => {
      state.hover = event.pointerType === 'mouse';
      state.pointerInside = event.pointerType === 'mouse';
      updatePointer(event);
      wake();
    });

    root.addEventListener('pointerleave', () => {
      state.hover = false;
      state.pointerInside = false;
      state.hovered = -1;
      cards.forEach((card) => { delete card.dataset.hovered; });
      wake();
    });

    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      stopNativeCruise();
      state.dragging = true;
      state.pointerId = event.pointerId;
      state.moved = false;
      state.pressX = event.clientX;
      state.pressAngle = state.angle;
      state.target = null;
      state.velocity = 0;
      state.samples = [{ time: performance.now(), angle: state.angle }];
      root.dataset.dragging = '';
      root.setPointerCapture(event.pointerId);
      updatePointer(event);
      wake();
    });

    root.addEventListener('pointermove', (event) => {
      updatePointer(event);
      wake();
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      const delta = event.clientX - state.pressX;
      if (Math.abs(delta) > 5) state.moved = true;
      const degreesPerPixel = 180 / (Math.PI * radius * state.fit);
      state.angle = state.pressAngle + delta * degreesPerPixel;
      const now = performance.now();
      state.samples.push({ time: now, angle: state.angle });
      state.samples = state.samples.filter((sample) => now - sample.time <= 120);
    });

    const releasePointer = (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.dragging = false;
      delete root.dataset.dragging;
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
      const first = state.samples[0];
      const last = state.samples[state.samples.length - 1];
      const seconds = first && last ? (last.time - first.time) / 1000 : 0;
      state.velocity = event.type !== 'pointercancel' && seconds > .008 ? clamp((last.angle - first.angle) / seconds, -1400, 1400) : 0;
      if (event.pointerType !== 'mouse') state.pointerInside = false;
      state.holdUntil = performance.now() + 260;
      state.samples = [];
      wake();
    };

    root.addEventListener('pointerup', releasePointer);
    root.addEventListener('pointercancel', releasePointer);
    root.addEventListener('lostpointercapture', releasePointer);

    root.addEventListener('click', (event) => {
      if (state.moved) {
        state.moved = false;
        event.preventDefault();
        return;
      }
      const card = event.target.closest('[data-cc-index]');
      if (!card) return;
      stopNativeCruise();
      const index = Number(card.dataset.ccIndex);
      let target = -index * step;
      target += 360 * Math.round((state.angle - target) / 360);
      state.target = target;
      state.holdUntil = performance.now() + 1200;
      wake();
    });

    root.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      stopNativeCruise();
      if (event.key === 'Home') state.target = 0;
      else if (event.key === 'End') state.target = -(count - 1) * step;
      else {
        const direction = event.key === 'ArrowRight' ? -1 : 1;
        state.target = (state.target ?? nearest(state.angle)) + direction * step;
      }
      state.holdUntil = performance.now() + 1200;
      wake();
    });

    new ResizeObserver(() => {
      measure();
      wake();
    }).observe(root);

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadPhotos();
    }, { rootMargin: '900px 0px' }).observe(root);

    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible) {
        loadPhotos();
        wake();
      } else pauseRendering();
    }).observe(root);

    const pauseRendering = () => {
      stopNativeCruise();
      clearTimeout(state.wakeTimer);
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
        state.last = 0;
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseRendering();
      else wake();
    });
    window.addEventListener('pagehide', pauseRendering);
    window.addEventListener('pageshow', wake);

    reducedMotion.addEventListener?.('change', () => {
      stopNativeCruise();
      state.introDone = true;
      state.velocity = 0;
      state.target = null;
      wake();
    });
    touchDevice.addEventListener?.('change', wake);

    if (lite) root.dataset.lite = '';
    measure();
    render(performance.now());
    root.dataset.ready = '';
    if (live) live.textContent = `${items[0].alt}, 1 de ${count}`;
    wake();
  });
})();
