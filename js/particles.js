(() => {
  'use strict';

  const section = document.querySelector('.feedbacks');
  const canvas = section?.querySelector('.particles-canvas');
  const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });

  if (!section || !canvas || !context) return;

  const settings = {
    color: '#ec4e01',
    count: 200,
    speed: 0.1,
    glow: 0.5,
    twinkle: 0.3,
    hoverRadius: 140,
    hoverFactor: 1,
    clickBurst: true,
    introDuration: 1800,
    targetFps: 30
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles = [];
  const bursts = [];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false };
  const view = { width: 1, height: 1, ratio: 1 };
  const startedAt = performance.now();
  let frame = 0;
  let visible = false;
  let lastDraw = 0;

  // O brilho é desenhado uma única vez e reutilizado em todas as partículas.
  // Isso evita recalcular shadowBlur 200 vezes a cada quadro.
  const particleSprite = document.createElement('canvas');
  particleSprite.width = 64;
  particleSprite.height = 64;
  const spriteContext = particleSprite.getContext('2d');
  const spriteGlow = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  spriteGlow.addColorStop(0, 'rgba(236,78,1,1)');
  spriteGlow.addColorStop(0.12, 'rgba(236,78,1,.95)');
  spriteGlow.addColorStop(0.42, 'rgba(236,78,1,.28)');
  spriteGlow.addColorStop(1, 'rgba(236,78,1,0)');
  spriteContext.fillStyle = spriteGlow;
  spriteContext.fillRect(0, 0, 64, 64);

  // Gerador determinístico para manter a composição estável a cada recarga.
  let seed = 1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = 0; index < settings.count; index += 1) {
    const direction = random() * Math.PI * 2;
    const travelSpeed = 7 + random() * 11;
    particles.push({
      x: random(),
      y: random(),
      depth: 0.35 + random() * 0.65,
      size: 0.65 + random() * 2.65,
      phase: random() * Math.PI * 2,
      driftX: (random() - 0.5) * 18,
      driftY: (random() - 0.5) * 18,
      velocityX: Math.cos(direction) * travelSpeed,
      velocityY: Math.sin(direction) * travelSpeed,
      reveal: random() * 0.55
    });
  }

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const wrap = (value, range) => ((value % range) + range) % range;

  const resize = () => {
    const bounds = section.getBoundingClientRect();
    if (view.width === Math.max(1, bounds.width) && view.height === Math.max(1, bounds.height)) return;
    view.width = Math.max(1, bounds.width);
    view.height = Math.max(1, bounds.height);
    // DPR 1 é suficiente para pontos luminosos e reduz drasticamente a área
    // limpa e redesenhada em telas Retina/4K.
    view.ratio = 1;
    canvas.width = Math.round(view.width * view.ratio);
    canvas.height = Math.round(view.height * view.ratio);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    context.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    if (visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  };

  const localPoint = event => {
    const bounds = section.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  };

  const onPointerMove = event => {
    if (!visible || document.hidden || reducedMotion) return;
    const point = localPoint(event);
    pointer.targetX = point.x;
    pointer.targetY = point.y;
    pointer.inside = point.x >= 0 && point.x <= view.width && point.y >= 0 && point.y <= view.height;
    if (!frame && visible) frame = requestAnimationFrame(render);
  };

  const onPointerLeave = () => {
    pointer.inside = false;
  };

  const onPointerDown = event => {
    if (!settings.clickBurst || reducedMotion) return;
    const point = localPoint(event);
    bursts.push({ x: point.x, y: point.y, startedAt: performance.now() });
    if (bursts.length > 4) bursts.shift();
  };

  const particlePosition = (particle, elapsed, activeBursts) => {
    const speedFactor = settings.speed / 0.1;
    const margin = 32;
    const horizontalRange = view.width + margin * 2;
    const verticalRange = view.height + margin * 2;
    const motion = elapsed * (0.55 + particle.depth * 0.45) * speedFactor;
    let x = wrap(
      particle.x * view.width + particle.velocityX * elapsed * speedFactor + margin,
      horizontalRange
    ) - margin;
    let y = wrap(
      particle.y * view.height + particle.velocityY * elapsed * speedFactor + margin,
      verticalRange
    ) - margin;
    x += Math.sin(motion + particle.phase) * particle.driftX;
    y += Math.cos(motion * 0.82 + particle.phase) * particle.driftY;

    if (pointer.inside && !reducedMotion) {
      const centerX = (pointer.x / view.width - 0.5) * 2;
      const centerY = (pointer.y / view.height - 0.5) * 2;
      const strength = 22 * particle.depth * settings.hoverFactor;
      x -= centerX * strength;
      y -= centerY * strength;

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < settings.hoverRadius && distance > 0) {
        const influence = Math.pow(1 - distance / settings.hoverRadius, 2);
        x += (dx / distance) * influence * 10 * particle.depth;
        y += (dy / distance) * influence * 10 * particle.depth;
      }
    }

    activeBursts.forEach(burst => {
      const age = burst.age;
      const dx = x - burst.x;
      const dy = y - burst.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const waveRadius = age * 520;
      const wave = Math.exp(-Math.pow((distance - waveRadius) / 46, 2));
      const force = wave * Math.pow(Math.max(0, 1 - age / 1.5), 2) * 56;
      x += (dx / distance) * force;
      y += (dy / distance) * force;
    });

    return { x, y };
  };

  function render(now) {
    frame = 0;
    if (!visible || document.hidden) return;

    const frameInterval = 1000 / settings.targetFps;
    if (!reducedMotion && lastDraw && now - lastDraw < frameInterval) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastDraw = now;

    const elapsed = (now - startedAt) / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    bursts.splice(0, bursts.length, ...bursts.filter(burst => now - burst.startedAt < 1500));
    const activeBursts = bursts.map(burst => ({
      ...burst,
      age: (now - burst.startedAt) / 1000
    }));

    context.clearRect(0, 0, view.width, view.height);

    particles.forEach(particle => {
      const point = particlePosition(particle, elapsed, activeBursts);
      const intro = reducedMotion
        ? 1
        : easeOut((now - startedAt) / settings.introDuration - particle.reveal);
      if (intro <= 0) return;

      const twinkle = 1 - settings.twinkle * 0.5
        + Math.sin(elapsed * (2.2 + particle.depth * 2.8) + particle.phase) * settings.twinkle * 0.5;
      const alpha = clamp((0.32 + particle.depth * 0.58) * twinkle * intro, 0, 1);
      const radius = particle.size * (0.58 + particle.depth * 0.7);
      const spriteSize = radius * (6 + settings.glow * 4);

      context.globalAlpha = alpha;
      context.drawImage(
        particleSprite,
        point.x - spriteSize / 2,
        point.y - spriteSize / 2,
        spriteSize,
        spriteSize
      );
    });

    context.globalAlpha = 1;

    if (!reducedMotion) frame = requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
    if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '150px' });

  resizeObserver.observe(section);
  intersectionObserver.observe(section);
  section.addEventListener('pointermove', onPointerMove, { passive: true });
  section.addEventListener('pointerleave', onPointerLeave, { passive: true });
  section.addEventListener('pointerdown', onPointerDown, { passive: true });
  const pauseRendering = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const resumeRendering = () => {
    if (visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseRendering();
    else resumeRendering();
  });
  window.addEventListener('pagehide', pauseRendering);
  window.addEventListener('pageshow', resumeRendering);
  resize();
})();
