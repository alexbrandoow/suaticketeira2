# Auditoria Front-end — SuaTicketeira

Data: 04/11/2026. Alterações locais sobre o projeto existente, sem reconstrução ou publicação.

## Erros investigados

| Aviso | Diagnóstico e ação |
| --- | --- |
| GSAP `Invalid property invalidateOnRefresh` | A opção estava em um tween comum do marquee. Removida desse nível; o refresh agora recalcula distância/duração e preserva progresso. Mantida nos objetos `scrollTrigger` em que é válida. Plugins continuam registrados antes da inicialização. |
| CSP: Inter/Roboto | Não há Google Fonts no HTML, CSS ou JavaScript do projeto. A identidade utiliza Satoshi local. Nenhuma origem Google foi liberada e a CSP não foi enfraquecida. |
| CSP: script inline | Todas as tags de script das cinco páginas apontam para arquivos externos locais; não há código executável inline ou atributos de evento. O hash apresentado no console não identifica código existente no projeto. Não foi adicionado `unsafe-inline`, hash arbitrário ou nonce para autorizar uma injeção desconhecida. |
| Permissions Policy: `unload` | A mensagem fornecida aponta para `VM41 inspector.b9415ea5.js:406`, arquivo ausente do projeto. O código usa `pagehide`, `pageshow` e `visibilitychange`, sem listeners de `unload`. |
| `runtime.lastError` | Não há chamadas de mensageria `chrome.runtime`/`browser.runtime` no site. O aviso é compatível com extensão/inspetor injetado; a atribuição exata depende da URL completa e stack do código que o gerou. `index.htm:1` isoladamente não prova origem no HTML. |

Os avisos de injeção podem continuar enquanto o inspetor/extensão responsável estiver ativo. Não foi ocultado o console nem desativada proteção para silenciá-los.

## Correções e otimizações implementadas

- GSAP, ScrollTrigger e SplitText **3.15.0** servidos localmente, preservando a versão anterior e os arquivos oficiais. Removidas as três requisições de scripts CDN, o CSS Lenis sem uso e os preconnects correspondentes. Avisos de licença em `js/vendor/gsap/NOTICE.md`.
- Inicialização protegida contra duplicação; mudança do breakpoint de 520px reconstrói as cenas pertinentes. A navegação pelo cache de histórico não destrói definitivamente as animações.
- Refresh do ScrollTrigger agrupado por frame; timers e listeners de cenas removidos no descarte. A recuperação de falhas não apaga indiscriminadamente os transforms de outros componentes.
- Removido `will-change` permanente dos itens do marquee, cards do carrossel e palavras de texto. Efeitos visuais, blur e movimentos mantidos; hover de logos limitado a ponteiros adequados.
- Canvas e carrossel deixam de agendar frames quando fora da região visível ou em aba oculta. Canvas evita reconstrução com dimensões idênticas; eventos de ponteiro do campo de pontos ficam restritos à seção.
- Carrossel evita escritas repetidas de transform/sombreamento e interrompe frames quando está parado. Retoma interação ao mover o ponteiro; cancelamento de touch não aplica impulso indevido. Uma imagem original serve de fallback se o script não inicializar.
- Barra de scroll reutiliza a altura medida do documento; mudanças de layout invalidam a medida. Swipe de etapas distingue movimento horizontal, vertical e cancelamento.
- Imagens posteriores à Hero usam carregamento adiado e decodificação assíncrona. A cena de público aquece suas imagens ao se aproximar da tela; duas fontes Satoshi já existentes recebem preload.
- Vídeo começa com `preload="none"`, prepara metadados ao se aproximar e pausa em aba oculta. Mantidos seleção desktop/mobile, enquadramento existente, controles, mute escolhido e pausa explícita. Som automático permanece sujeito à política de autoplay do navegador.
- Hero/preloader: validada a ordem de entrada existente, sem reproduzir novamente a Hero ao mudar de breakpoint ou receber bibliotecas atrasadas. O preloader tem saída de segurança em caso de falha.
- `overflow-x: clip`, quando suportado, contém transbordamento horizontal decorativo sem criar um contêiner adicional de scroll.
- Adicionados `index.html` idênticos aos `index.htm` na raiz e páginas legais, com `.nojekyll`. Não há redirecionamento/F5. Caminhos continuam relativos ao projeto no GitHub Pages.
- Versões de cache de CSS/JS derivadas do conteúdo, com normalização de finais de linha Windows/Linux. `prepare:site` sincroniza entradas e versões; `check` detecta divergências.

## Arquivos envolvidos

| Arquivos | Alteração |
| --- | --- |
| `index.htm`, `index.html` | Recursos locais, preload/lazy loading, fallback do carrossel, versões de cache e entrada Pages. |
| `js/animations.js` | Configuração GSAP, refresh, ciclo de vida, touch e aquecimento de imagens. |
| `js/main.js` | Scroll, swipe, carregamento e pausa de vídeo. |
| `js/circular-carousel.js`, `js/particles.js`, `js/dot-field.js` | Agendamento de renderização, visibilidade e redução de trabalho repetido. |
| `css/style.css`, `css/animations.css`, `css/circular-carousel.css` | Overflow, remoção de camadas permanentes, hover adequado e fallback. |
| Quatro diretórios de páginas legais | Apenas versões de recursos e novas cópias `index.html`; conteúdo preservado. |
| `js/vendor/gsap/*` | Bibliotecas locais e aviso de licença. |
| `scripts/prepare-site.cjs`, `package.json`, `.nojekyll`, `README.md` | Preparação e verificação da publicação estática. |
| `tests/media-consent.test.cjs`, `tests/motion.test.cjs`, `tests/carousel.test.cjs`, `tests/site.test.cjs` | Cobertura de comportamento, ciclo de vida, CSP, referências e cache. Testes existentes de preloader mantidos. |

## Verificações realizadas

- `npm.cmd run check`: **30 testes aprovados**, sem falhas. Inclui cookies/localStorage com falhas de armazenamento, controles de vídeo e bloqueio de autoplay simulado, Hero/preloader, marquee, pausa/retomada do carrossel, referências e segurança estática.
- Todos os scripts distribuídos analisados sintaticamente. Dependências locais verificadas na versão 3.15.0.
- Referências locais de HTML/CSS verificadas com correspondência exata de maiúsculas/minúsculas, inclusive fontes, vídeos e imagens montadas dinamicamente pelo carrossel. Nenhum caminho ausente detectado; URLs relativas compatíveis com o subdiretório do Pages.
- Nenhum ID duplicado ou script inline executável nas cinco páginas. CSP preservada.
- Texto renderizável das cinco páginas comparado com o commit-base e preservado.
- **86 arquivos de `ASSETS`, totalizando 200.663.044 bytes, conferidos por SHA-256 com o inventário anterior à auditoria: todos idênticos.** Nenhuma imagem, vídeo ou fonte foi comprimida, convertida, substituída ou editada; imagem da Hero intacta.
- `git diff --check` sem erros de whitespace.

## Limites da validação

Os testes de comportamento usam DOM/mídia simulados em Node; não equivalem a execução em Safari ou Chrome reais. O host de acesso ao navegador estava indisponível nesta sessão. Portanto, não foi possível concluir comparação visual renderizada em desktop/tablet/mobile, testes em aparelhos Android/iOS reais, medição de FPS/Core Web Vitals ou Lighthouse. Nenhuma pontuação ou ganho percentual é alegado.

As otimizações reduzem requisições externas, trabalho fora de tela e operações repetidas; a magnitude do ganho depende do aparelho e da rede. O peso dos arquivos originais foi preservado conforme solicitado. A versão publicada ainda precisa receber estes arquivos; não houve commit, push ou deploy nesta auditoria.

Referências técnicas: [`invalidateOnRefresh` no ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia/), [entrada do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Rodada 2 — Preloader no canto, carrossel pesado e deploy (05/11/2026)

### Preloader deslocado para o canto direito (celulares rápidos)
- **Causa:** no mobile, o menu `.main-nav` fica fora da tela (`position:fixed` + `translateX(105%)`). Enquanto o header anima com `filter`/`translate` (entrada da Hero via GSAP), ele deixa de ser contido pelo viewport e vira transbordamento horizontal. O Chrome/Android então **alarga o layout viewport** (390 → 749 px num celular de 390 px) e o overlay `fixed; inset:0` do preloader passa a medir o dobro, empurrando o logo para o canto direito/inferior. Só ocorria quando o GSAP carregava em menos de 350 ms (celulares/redes rápidos), por isso parecia aleatório.
- **Correção:** `overflow-x` contido em `html` e no `.site-header`; `minimum-scale=1.0` no viewport das 5 páginas; overlay do preloader centralizado por flex com `height:100dvh`, sem `vw`.
- **Evidência (Chrome headless, emulação mobile):** antes, o layout viewport dobrava em todos os tamanhos de 320 a 820 px e o centro do logo ficava em x=374 num aparelho de 390 px. Depois, o layout viewport permanece igual ao da tela e o logo fica no centro exato em 18 tamanhos (280×653 a 2560×1440, retrato e paisagem).

### Carrossel da segunda seção
- 11 PNGs de ~1 MB (1254×1254, ~66 MB decodificados) viravam 22 faces 3D. Agora usam WebP derivados em `ASSETS/figma/carousel/` (720 px no desktop, 560 px no touch; 474 KB no total). **Os PNGs originais permanecem intactos.** Rede do carrossel no celular: 11,71 MB → 0,19 MB; memória de texturas ~66 MB → ~13 MB.
- `loading="lazy"` removido das faces (atrasava o decode no meio da rotação, causa do trava/destrava). As texturas são pedidas 900 px antes da seção e a cena só aparece depois de decodificada; o fallback (também WebP) cobre a espera.
- Modo `data-lite` (≤4 GB de RAM ou ≤4 núcleos): mesma cena, sem sombras e transições por face.

### Deploy
- `index.htm/index.html` estavam com `?v=` desatualizado em relação a `circular-carousel.js/css`; `npm run check` falhava. Regenerado com `npm run prepare:site`.
- CSP: removidas as origens `cdn.jsdelivr.net` e `unpkg.com` (nada mais carrega delas desde o GSAP local).
- Testes novos em `tests/layout.test.cjs` e carrossel atualizado: **42 testes aprovados**.

### Limites desta rodada
Validado em Chrome headless (Chromium 131) com emulação mobile, não em Safari/iOS nem em aparelhos reais. O fps do carrossel não foi medido (o raster por software do headless não representa GPU de celular); os ganhos declarados são de bytes, memória de textura e ausência de decode durante a rotação. O formulário ainda não envia dados (aviso já presente na página).
