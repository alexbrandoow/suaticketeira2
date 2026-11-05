(() => {
  'use strict';

  const STORAGE_KEY = 'st_cookie_preferences_v1';
  const CONSENT_VERSION = 1;
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
  let preferencesWereSaved = false;
  const categories = ['necessary', 'analytics', 'functional', 'marketing'];
  const defaults = Object.freeze({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false
  });

  const parseRecord = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.preferences) return null;
      if (categories.some((category) => typeof parsed.preferences[category] !== 'boolean')) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const readCookie = () => {
    try {
      const prefix = `${STORAGE_KEY}=`;
      const cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
      return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
    } catch {
      return null;
    }
  };

  const readPreferences = () => {
    const records = [parseRecord(readCookie())];
    try { records.push(parseRecord(localStorage.getItem(STORAGE_KEY))); } catch { /* Usa o cookie. */ }
    const latest = records.filter(Boolean).sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))[0];
    return latest ? { ...defaults, ...latest.preferences, necessary: true } : null;
  };

  const persistPreferences = (preferences) => {
    const value = JSON.stringify({ version: CONSENT_VERSION, updatedAt: new Date().toISOString(), preferences });
    let savedLocally = false;
    let savedCookie = false;
    try {
      localStorage.setItem(STORAGE_KEY, value);
      savedLocally = localStorage.getItem(STORAGE_KEY) === value;
    } catch { /* Tenta o cookie de primeira parte. */ }
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
      savedCookie = readCookie() === value;
    } catch { /* O armazenamento local pode continuar disponivel. */ }
    return savedLocally || savedCookie;
  };

  const activateAllowedScripts = (preferences) => {
    document.querySelectorAll('script[type="text/plain"][data-consent-category]').forEach((blockedScript) => {
      const category = blockedScript.dataset.consentCategory;
      if (!preferences[category] || blockedScript.dataset.consentActivated === 'true') return;

      const script = document.createElement('script');
      [...blockedScript.attributes].forEach(({ name, value }) => {
        if (!['type', 'data-consent-category', 'data-consent-activated'].includes(name)) script.setAttribute(name, value);
      });
      script.textContent = blockedScript.textContent;
      blockedScript.dataset.consentActivated = 'true';
      blockedScript.after(script);
    });
  };

  const applyPreferences = (preferences, { persist = false } = {}) => {
    const normalized = { ...defaults, ...preferences, necessary: true };
    categories.forEach((category) => {
      document.documentElement.dataset[`consent${category[0].toUpperCase()}${category.slice(1)}`] = String(normalized[category]);
    });
    if (persist) {
      preferencesWereSaved = persistPreferences(normalized);
    }
    activateAllowedScripts(normalized);
    window.dispatchEvent(new CustomEvent('st:consentchange', { detail: { preferences: normalized } }));
    return normalized;
  };

  const siteRoot = document.documentElement.dataset.siteRoot || '.';
  const cookiePolicyUrl = `${siteRoot}/politica-de-cookies/index.htm`;
  const ui = document.createElement('div');
  ui.className = 'privacy-ui';
  ui.innerHTML = `
    <section class="cookie-banner" data-cookie-banner aria-label="Preferências de privacidade" hidden>
      <div class="cookie-banner__copy">
        <strong>Privacidade sob seu controle</strong>
        <p>Usamos armazenamento estritamente necessário para registrar sua escolha. Recursos opcionais permanecem bloqueados até sua autorização.</p>
        <a href="${cookiePolicyUrl}" data-legal-modal="cookies">Conheça a Política de Cookies</a>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="cookie-button cookie-button--ghost" data-cookie-customize>Personalizar</button>
        <button type="button" class="cookie-button cookie-button--ghost" data-cookie-reject>Rejeitar opcionais</button>
        <button type="button" class="cookie-button cookie-button--primary" data-cookie-accept>Aceitar todos</button>
      </div>
      <p class="cookie-banner__status" data-cookie-banner-status role="status" hidden></p>
    </section>
    <div class="cookie-modal" data-cookie-modal hidden>
      <section class="cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-dialog-title" aria-describedby="cookie-dialog-description">
        <div class="cookie-dialog__header">
          <div>
            <span class="cookie-dialog__eyebrow">Privacidade</span>
            <h2 id="cookie-dialog-title">Preferências de cookies</h2>
          </div>
          <button type="button" class="cookie-dialog__close" data-cookie-close aria-label="Fechar preferências">×</button>
        </div>
        <p id="cookie-dialog-description">Escolha quais categorias opcionais podem ser ativadas. Cookies necessários não podem ser desabilitados.</p>
        <div class="cookie-options">
          <label class="cookie-option">
            <span><strong>Necessários</strong><small>Registram sua escolha de privacidade e sustentam funções essenciais.</small></span>
            <input type="checkbox" data-cookie-category="necessary" checked disabled>
          </label>
          <label class="cookie-option">
            <span><strong>Analíticos</strong><small>Ajudariam a compreender o uso do site. Nenhuma ferramenta analítica foi identificada na versão auditada.</small></span>
            <input type="checkbox" data-cookie-category="analytics">
          </label>
          <label class="cookie-option">
            <span><strong>Funcionais</strong><small>Permitem recursos opcionais e preferências adicionais, quando instalados.</small></span>
            <input type="checkbox" data-cookie-category="functional">
          </label>
          <label class="cookie-option">
            <span><strong>Marketing</strong><small>Seriam usados para publicidade e mensuração de campanhas. Nenhum pixel foi identificado na versão auditada.</small></span>
            <input type="checkbox" data-cookie-category="marketing">
          </label>
        </div>
        <div class="cookie-dialog__actions">
          <button type="button" class="cookie-button cookie-button--ghost" data-cookie-modal-reject>Rejeitar opcionais</button>
          <button type="button" class="cookie-button cookie-button--primary" data-cookie-save>Salvar preferências</button>
        </div>
        <p class="cookie-dialog__status" data-cookie-status role="status" aria-live="polite" hidden></p>
      </section>
    </div>
    <div class="cookie-modal" data-legal-dialog hidden>
      <section class="cookie-dialog legal-document-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-document-title" aria-describedby="legal-document-description">
        <div class="cookie-dialog__header legal-document-dialog__header">
          <div>
            <span class="cookie-dialog__eyebrow" data-legal-eyebrow>Informações legais</span>
            <h2 id="legal-document-title" data-legal-title>Documento legal</h2>
          </div>
          <button type="button" class="cookie-dialog__close" data-legal-close aria-label="Fechar documento">×</button>
        </div>
        <p id="legal-document-description" class="legal-document-dialog__description" data-legal-description></p>
        <div class="legal-document-dialog__meta" data-legal-meta></div>
        <div class="legal-document-dialog__content" data-legal-content tabindex="0"></div>
      </section>
    </div>`;
  document.body.appendChild(ui);

  const banner = ui.querySelector('[data-cookie-banner]');
  const modal = ui.querySelector('[data-cookie-modal]');
  const dialog = ui.querySelector('.cookie-dialog');
  const status = ui.querySelector('[data-cookie-status]');
  const bannerStatus = ui.querySelector('[data-cookie-banner-status]');
  const legalModal = ui.querySelector('[data-legal-dialog]');
  const legalDialog = ui.querySelector('.legal-document-dialog');
  const legalEyebrow = ui.querySelector('[data-legal-eyebrow]');
  const legalTitle = ui.querySelector('[data-legal-title]');
  const legalDescription = ui.querySelector('[data-legal-description]');
  const legalMeta = ui.querySelector('[data-legal-meta]');
  const legalContent = ui.querySelector('[data-legal-content]');
  let lastFocusedElement = null;
  let lastLegalFocusedElement = null;
  let legalRequestId = 0;
  const storedPreferences = readPreferences();
  let currentPreferences = applyPreferences(storedPreferences || defaults, { persist: Boolean(storedPreferences) });

  const syncCheckboxes = () => {
    categories.forEach((category) => {
      const input = ui.querySelector(`[data-cookie-category="${category}"]`);
      if (input) input.checked = category === 'necessary' || Boolean(currentPreferences[category]);
    });
  };

  const showBanner = () => {
    banner.hidden = false;
  };

  const hideBanner = () => {
    banner.hidden = true;
  };

  const openModal = () => {
    lastFocusedElement = document.activeElement;
    syncCheckboxes();
    modal.hidden = false;
    document.body.classList.add('cookie-modal-open');
    requestAnimationFrame(() => ui.querySelector('[data-cookie-close]')?.focus());
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  };

  const legalDocuments = {
    privacy: { eyebrow: 'Privacidade', title: 'Política de Privacidade' },
    terms: { eyebrow: 'Condições de uso', title: 'Termos de Serviço' },
    cookies: { eyebrow: 'Transparência', title: 'Política de Cookies' },
    refund: { eyebrow: 'Consumidor', title: 'Política de Reembolso' }
  };

  const rewriteDocumentLinks = (container, sourceUrl) => {
    container.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        link.href = new URL(href, sourceUrl).href;
      } catch {
        // Mantém o endereço original caso ele não possa ser normalizado.
      }
    });
  };

  const openLegalModal = async (trigger) => {
    const documentInfo = legalDocuments[trigger.dataset.legalModal];
    if (!documentInfo) return;

    const requestId = ++legalRequestId;
    const documentUrl = new URL(trigger.href, window.location.href).href;
    lastLegalFocusedElement = document.activeElement;
    legalEyebrow.textContent = documentInfo.eyebrow;
    legalTitle.textContent = documentInfo.title;
    legalDescription.textContent = 'Carregando documento…';
    legalMeta.replaceChildren();
    legalContent.innerHTML = '<div class="legal-document-loading" role="status">Carregando conteúdo…</div>';
    legalModal.hidden = false;
    document.body.classList.add('cookie-modal-open');
    requestAnimationFrame(() => ui.querySelector('[data-legal-close]')?.focus());

    try {
      const response = await fetch(documentUrl, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const sourceContent = source.querySelector('.legal-content .legal-container');
      if (!sourceContent) throw new Error('Conteúdo legal não encontrado');
      if (requestId !== legalRequestId) return;

      sourceContent.querySelectorAll('script').forEach((script) => script.remove());
      rewriteDocumentLinks(sourceContent, response.url || documentUrl);
      legalEyebrow.textContent = source.querySelector('.legal-eyebrow')?.textContent?.trim() || documentInfo.eyebrow;
      legalTitle.textContent = source.querySelector('.legal-hero h1')?.textContent?.trim() || documentInfo.title;
      legalDescription.textContent = source.querySelector('.legal-hero p')?.textContent?.trim() || 'Informações legais da SuaTicketeira.';
      const sourceMeta = source.querySelector('.legal-meta');
      legalMeta.innerHTML = sourceMeta?.innerHTML || '';
      legalContent.innerHTML = sourceContent.innerHTML;
      legalContent.scrollTop = 0;
    } catch {
      if (requestId !== legalRequestId) return;
      legalDescription.textContent = 'Não foi possível carregar o documento dentro desta janela.';
      legalContent.innerHTML = '<p class="legal-document-error">Feche esta janela e tente abrir o documento novamente.</p>';
    }
  };

  const closeLegalModal = () => {
    if (legalModal.hidden) return;
    legalRequestId += 1;
    legalModal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
    if (lastLegalFocusedElement instanceof HTMLElement) lastLegalFocusedElement.focus();
  };

  const save = (preferences) => {
    currentPreferences = applyPreferences(preferences, { persist: true });
    if (!preferencesWereSaved) {
      const message = 'Sua escolha foi aplicada nesta página, mas o navegador não permitiu salvá-la para a próxima visita.';
      [status, bannerStatus].forEach((element) => {
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
      });
      showBanner();
      return;
    }
    if (bannerStatus) bannerStatus.hidden = true;
    if (status) status.hidden = true;
    hideBanner();
    closeModal();
    if (status) status.textContent = 'Preferências de privacidade atualizadas.';
  };

  ui.querySelector('[data-cookie-accept]')?.addEventListener('click', () => save({
    necessary: true, analytics: true, functional: true, marketing: true
  }));
  ui.querySelector('[data-cookie-reject]')?.addEventListener('click', () => save(defaults));
  ui.querySelector('[data-cookie-modal-reject]')?.addEventListener('click', () => save(defaults));
  ui.querySelector('[data-cookie-customize]')?.addEventListener('click', openModal);
  ui.querySelector('[data-cookie-close]')?.addEventListener('click', closeModal);
  ui.querySelector('[data-cookie-save]')?.addEventListener('click', () => {
    save(Object.fromEntries(categories.map((category) => {
      const input = ui.querySelector(`[data-cookie-category="${category}"]`);
      return [category, category === 'necessary' || Boolean(input?.checked)];
    })));
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  ui.querySelector('[data-legal-close]')?.addEventListener('click', closeLegalModal);
  legalModal.addEventListener('click', (event) => {
    if (event.target === legalModal) closeLegalModal();
  });
  legalModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLegalModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...legalDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    const legalTrigger = event.target.closest?.('[data-legal-modal]');
    if (legalTrigger) {
      event.preventDefault();
      openLegalModal(legalTrigger);
      return;
    }
    const trigger = event.target.closest?.('[data-cookie-settings]');
    if (!trigger) return;
    event.preventDefault();
    openModal();
  });

  window.STConsent = Object.freeze({
    get: () => ({ ...currentPreferences }),
    open: openModal,
    key: STORAGE_KEY
  });

  if (!storedPreferences) showBanner();
})();
