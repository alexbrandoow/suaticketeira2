(() => {
  'use strict';

  const section = document.querySelector('.solutions');
  const container = section?.querySelector('.solutions-dot-field');
  const canvas = container?.querySelector('.dot-field__canvas');
  const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });

  if (!section || !container || !canvas || !context) return;

  const settings = {
    color: '#ec4e01',
    dotRadius: 0.6,
    dotSpacing: 14,
    cursorRadius: 230,
    bulgeStrength: 0.2,
    glowRadius: 120,
    glowIntensity: 0.5,
    baseOpacity: 0.55,
    holdToZoom: true,
    introDuration: 1800,
    targetFps: 30
  };

  const step = settings.dotRadius * 2 + settings.dotSpacing;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseLayer = document.createElement('canvas');
  const baseContext = baseLayer.getContext('2d', { alpha: true });
  const size = { width: 1, height: 1, offsetX: 0, offsetY: 0 };
  const pointer = { x: 0, y: 0, inside: false, down: false };
  const lens = { x: 0, y: 0, presence: 0, zoom: 0, ready: false };
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let lastDraw = 0;
  let intro = reducedMotion ? 1 : 0;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const buildBaseLayer = () => {
    baseLayer.width = Math.max(1, Math.round(size.width));
    baseLayer.height = Math.max(1, Math.round(size.height));
    baseContext.clearRect(0, 0, size.width, size.height);
    baseContext.fillStyle = settings.color;
    baseContext.globalAlpha = settings.baseOpacity;
    baseContext.beginPath();

    for (let y = size.offsetY; y <= size.height; y += step) {
      for (let x = size.offsetX; x <= size.width; x += step) {
        baseContext.moveTo(x + settings.dotRadius, y);
        baseContext.arc(x, y, settings.dotRadius, 0, Math.PI * 2);
      }
    }

    baseContext.fill();
    baseContext.globalAlpha = 1;
  };

  const resize = () => {
    const bounds = container.getBoundingClientRect();
    if (size.width === Math.max(1, bounds.width) && size.height === Math.max(1, bounds.height)) return;
    size.width = Math.max(1, bounds.width);
    size.height = Math.max(1, bounds.height);
    size.offsetX = (size.width % step) / 2;
    size.offsetY = (size.height % step) / 2;
    canvas.width = Math.round(size.width);
    canvas.height = Math.round(size.height);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    buildBaseLayer();
    wake();
  };

  const locate = event => {
    const bounds = container.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      inside: event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom
    };
  };

  const onPointerMove = event => {
    if (!visible || document.hidden) return;
    const point = locate(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.inside = point.inside;
    if (point.inside && !lens.ready) {
      lens.x = point.x;
      lens.y = point.y;
      lens.ready = true;
    }
    wake();
  };

  const onPointerDown = event => {
    if (!visible || document.hidden) return;
    const point = locate(event);
    if (!point.inside) return;
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.inside = true;
    pointer.down = true;
    wake();
  };

  const onPointerUp = event => {
    pointer.down = false;
    if (event.pointerType !== 'mouse') pointer.inside = false;
    wake();
  };

  const onPointerLeave = () => {
    pointer.inside = false;
    pointer.down = false;
    wake();
  };

  const drawInteractiveDots = (radius, strength) => {
    const clearRadius = radius * (1 + Math.max(0, strength)) + step * 2;

    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(lens.x, lens.y, clearRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    const glow = context.createRadialGradient(
      lens.x,
      lens.y,
      0,
      lens.x,
      lens.y,
      settings.glowRadius * (1 + lens.zoom * 0.1)
    );
    glow.addColorStop(0, `rgba(236,78,1,${0.2 * settings.glowIntensity * lens.presence})`);
    glow.addColorStop(1, 'rgba(236,78,1,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(lens.x, lens.y, settings.glowRadius * (1 + lens.zoom * 0.1), 0, Math.PI * 2);
    context.fill();

    const firstColumn = Math.floor((lens.x - clearRadius - size.offsetX) / step);
    const lastColumn = Math.ceil((lens.x + clearRadius - size.offsetX) / step);
    const firstRow = Math.floor((lens.y - clearRadius - size.offsetY) / step);
    const lastRow = Math.ceil((lens.y + clearRadius - size.offsetY) / step);

    context.fillStyle = settings.color;
    context.globalAlpha = settings.baseOpacity;
    context.beginPath();

    for (let row = firstRow; row <= lastRow; row += 1) {
      const sourceY = size.offsetY + row * step;
      if (sourceY < -step || sourceY > size.height + step) continue;

      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const sourceX = size.offsetX + column * step;
        if (sourceX < -step || sourceX > size.width + step) continue;

        const dx = sourceX - lens.x;
        const dy = sourceY - lens.y;
        const distance = Math.hypot(dx, dy);
        if (distance > clearRadius) continue;

        const normalized = distance / radius;
        const falloff = normalized < 1
          ? Math.pow(Math.max(0, 1 - normalized * normalized), 3)
          : 0;
        const growth = 1 + strength * falloff;
        const x = lens.x + dx * growth;
        const y = lens.y + dy * growth;
        const dotRadius = settings.dotRadius * (1 + falloff * 0.35 * lens.presence);
        context.moveTo(x + dotRadius, y);
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }

    context.fill();

    context.globalAlpha = 0.5 * settings.glowIntensity * lens.presence;
    context.beginPath();
    for (let row = firstRow; row <= lastRow; row += 1) {
      const sourceY = size.offsetY + row * step;
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const sourceX = size.offsetX + column * step;
        const dx = sourceX - lens.x;
        const dy = sourceY - lens.y;
        const distance = Math.hypot(dx, dy);
        if (distance > settings.glowRadius) continue;
        const falloff = Math.pow(1 - distance / settings.glowRadius, 2);
        const normalized = distance / radius;
        const bulge = normalized < 1
          ? Math.pow(Math.max(0, 1 - normalized * normalized), 3)
          : 0;
        const growth = 1 + strength * bulge;
        const x = lens.x + dx * growth;
        const y = lens.y + dy * growth;
        const glowDotRadius = settings.dotRadius * (1.15 + falloff * 0.9);
        context.moveTo(x + glowDotRadius, y);
        context.arc(x, y, glowDotRadius, 0, Math.PI * 2);
      }
    }
    context.fill();
    context.globalAlpha = 1;
  };

  const render = now => {
    frame = 0;
    if (!visible || document.hidden) return;

    const interval = 1000 / settings.targetFps;
    if (lastDraw && now - lastDraw < interval) {
      frame = requestAnimationFrame(render);
      return;
    }

    const delta = clamp((now - lastTime) / 1000 || 0, 0, 0.05);
    lastTime = now;
    lastDraw = now;

    if (intro < 1) intro = Math.min(1, intro + delta / (settings.introDuration / 1000));

    const presenceTarget = pointer.inside ? 1 : 0;
    const zoomTarget = pointer.inside && pointer.down && settings.holdToZoom ? 1 : 0;
    const response = reducedMotion ? 1 : 1 - Math.exp(-delta / 0.12);
    const presenceResponse = reducedMotion ? 1 : 1 - Math.exp(-delta / (pointer.inside ? 0.16 : 0.3));

    if (lens.ready) {
      lens.x += (pointer.x - lens.x) * response;
      lens.y += (pointer.y - lens.y) * response;
    }
    lens.presence += (presenceTarget - lens.presence) * presenceResponse;
    lens.zoom += (zoomTarget - lens.zoom) * response;

    const introEase = 1 - Math.pow(1 - intro, 3);
    context.clearRect(0, 0, size.width, size.height);
    context.globalAlpha = introEase;
    context.drawImage(baseLayer, 0, 0);

    if (lens.ready && lens.presence > 0.002) {
      const radius = settings.cursorRadius * (1 + lens.zoom * 0.12);
      const strength = settings.bulgeStrength * (1 + lens.zoom * 0.6) * lens.presence;
      drawInteractiveDots(radius, strength);
    }

    context.globalAlpha = 1;

    const moving = lens.ready
      && (Math.abs(pointer.x - lens.x) + Math.abs(pointer.y - lens.y) > 0.1);
    const settling = Math.abs(presenceTarget - lens.presence) > 0.003
      || Math.abs(zoomTarget - lens.zoom) > 0.003
      || moving;
    if (intro < 1 || settling) frame = requestAnimationFrame(render);
  };

  function wake() {
    if (frame || !visible || document.hidden) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) wake();
    if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '120px' });

  resizeObserver.observe(container);
  intersectionObserver.observe(container);
  section.addEventListener('pointermove', onPointerMove, { passive: true });
  section.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  section.addEventListener('pointerleave', onPointerLeave);
  const pauseRendering = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseRendering();
    else wake();
  });
  window.addEventListener('pagehide', pauseRendering);
  window.addEventListener('pageshow', wake);
  resize();
  wake();
})();
