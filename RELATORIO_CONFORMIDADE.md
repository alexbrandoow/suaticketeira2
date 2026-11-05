# Relatório de adequação técnica, privacidade e acessibilidade

**Projeto:** landing page SuaTicketeira  
**Data da auditoria:** 27/10/2026  
**Escopo:** arquivos estáticos presentes neste repositório  
**Status:** melhorias técnicas implementadas; publicação condicionada às confirmações empresariais e à revisão jurídica indicadas neste relatório.

> Este documento não declara conformidade jurídica integral. A auditoria verificou o front-end disponível, sem acesso a contratos, infraestrutura de produção, servidor, banco de dados, CRM, adquirentes, processos internos ou evidências de governança.

## 1. Funcionalidades implementadas

### Documentos legais

- Rota `/politica-de-privacidade/` com identificação, inventário de dados, finalidades, bases a validar, direitos, compartilhamentos, retenção, segurança e pendências.
- Rota `/termos-de-servico/` limitada ao site institucional e sem inventar preços, SLA, taxas ou condições contratuais.
- Rota `/politica-de-cookies/` baseada no inventário real do código.
- Rota `/politica-de-reembolso/` preliminar, compatível com direitos obrigatórios e com marcações claras de informações operacionais pendentes.
- Layout responsivo alinhado às cores, tipografia e linguagem visual existentes.

### Consentimento e cookies

- Banner com “Aceitar todos”, “Rejeitar opcionais” e “Personalizar”.
- Modal acessível com categorias necessárias, analíticas, funcionais e marketing.
- Nenhuma categoria opcional pré-selecionada.
- Registro versionado em `localStorage`, sob a chave `st_cookie_preferences_v1`.
- Link permanente de preferências nos rodapés.
- Foco contido no modal, fechamento por `Escape`, restauração de foco e mensagens para leitores de tela.
- Mecanismo de bloqueio para scripts declarados como `type="text/plain"` e `data-consent-category`. Eles só são ativados após autorização da categoria.
- Evento `st:consentchange` e API de leitura/abertura em `window.STConsent` para integrações futuras.

### Formulário e LGPD

- Identificação dos campos obrigatórios e limites de tamanho.
- `autocomplete` apropriado para nome, organização, telefone e e-mail.
- Aviso de privacidade próximo ao botão, com link para a política.
- Ausência de checkbox genérico de consentimento: o contato solicitado pode usar base pré-contratual, sujeita à validação do fluxo real.
- Honeypot antispam.
- Remoção de espaços excedentes, validação HTML, estados `aria-invalid` e retorno em região `aria-live`.
- Mensagem transparente informando que o endpoint seguro ainda não está configurado.
- Nenhuma inclusão automática em marketing e nenhum campo de marketing pré-marcado.
- Nenhum dado pessoal escrito em console ou ferramenta analítica.

### Acessibilidade

- Preservado o link de salto para o conteúdo.
- Verificada a presença de um `h1` e um `main` em cada página.
- Modais e controles de cookies com nomes, foco visível e operação por teclado.
- Mensagens de formulário acessíveis e atômicas.
- Respeito a `prefers-reduced-motion` nas páginas existentes, legais e no gerenciador.
- Correção do contraste do CTA principal de cookies.
- Correção da proporção intrínseca de dois ícones no breakpoint móvel.
- Textos alternativos informativos preservados; elementos decorativos continuam com `alt=""`.

### Transparência de conteúdo

- Quatro depoimentos genéricos e avaliações por estrelas sem comprovação foram removidos.
- Os cards foram mantidos no layout como estados explícitos de validação, sem atribuir falas ou resultados a clientes inexistentes.
- Dados empresariais fornecidos foram adicionados de forma discreta aos rodapés, acompanhados de ressalva nos documentos legais.

### Segurança do front-end

- Política de Segurança de Conteúdo por `<meta>` nas páginas, adequada aos recursos atualmente carregados.
- `referrer-policy` configurada como `strict-origin-when-cross-origin`.
- Busca por credenciais, tokens e chaves sem achados aparentes.
- Busca por trackers sem encontrar GA4, GTM, Meta Pixel, Google Ads, Clarity, Hotjar ou equivalentes.

## 2. Arquivos criados e alterados

### Criados

- `politica-de-privacidade/index.htm`
- `termos-de-servico/index.htm`
- `politica-de-cookies/index.htm`
- `politica-de-reembolso/index.htm`
- `css/legal.css`
- `css/privacy.css`
- `js/privacy-controls.js`
- `RELATORIO_CONFORMIDADE.md`

### Alterados

- `index.htm`
- `css/refinements.css`
- `js/main.js`

## 3. Problemas corrigidos

- Ausência de páginas legais e links permanentes no rodapé.
- Ausência de gerenciamento de preferências para scripts opcionais futuros.
- Opções de consentimento agora começam desativadas.
- Falta de transparência sobre o formulário sem backend.
- Campos sem limites explícitos e ausência de proteção antispam básica.
- Depoimentos genéricos potencialmente enganosos.
- Contraste insuficiente no botão de aceite de cookies.
- Distorção de proporção de imagens detectada no mobile.
- Ausência de inventário documentado de trackers e armazenamento local.

## 4. Testes executados e resultados

### Testes estáticos

| Teste | Resultado |
|---|---|
| Sintaxe de todos os arquivos JavaScript com `node --check` | Aprovado |
| Estrutura básica dos cinco HTMLs (`main`, `h1`, pares de `section`) | Aprovado |
| Resolução de referências internas `href` e `src` | Aprovado, nenhum caminho quebrado |
| Balanceamento de chaves dos sete arquivos CSS | Aprovado |
| Busca de trackers conhecidos em código executável | Nenhum identificado |
| Busca de padrões aparentes de chaves, tokens, segredos e senhas | Nenhum identificado |
| Existência das quatro rotas legais | Aprovado |

### Lighthouse executado localmente

Categorias auditadas: acessibilidade, boas práticas e SEO.

| Página / viewport | Acessibilidade | Boas práticas | SEO |
|---|---:|---:|---:|
| Landing page — desktop | 100 | 100 | 100 |
| Landing page — tablet 768 × 1024 | 100 | 100 | 100 |
| Landing page — mobile 390 × 844 | 100 | 100 | 100 |
| Política de Privacidade — desktop | 100 | 100 | 100 |
| Termos de Serviço — desktop | 100 | 100 | 100 |
| Política de Cookies — desktop | 100 | 100 | 100 |
| Política de Reembolso — desktop | 100 | 100 | 100 |

O primeiro teste identificou contraste insuficiente no botão do banner e proporção incorreta em dois ícones móveis. Ambos foram corrigidos e as auditorias foram repetidas até não restarem falhas automáticas nas categorias selecionadas.

### Limites dos testes

- O projeto não possui processo de build; portanto, “build de produção” não se aplica. Os arquivos são servidos diretamente.
- Não foi realizado teste com leitor de tela real (NVDA, JAWS, VoiceOver ou TalkBack).
- A navegação por teclado foi revisada no código e pelo Lighthouse, mas requer uma rodada manual completa em navegadores suportados.
- O fluxo de consentimento foi verificado no código e carregado durante as auditorias; recomenda-se teste E2E de aceitar, rejeitar, personalizar e revogar no ambiente de homologação.
- Não foi possível testar backend, envio, persistência, rate limiting, sanitização no servidor ou resposta a incidentes porque não existe backend no escopo.

## 5. Riscos pendentes

### Crítico

Nenhum risco crítico foi comprovado apenas no código estático. Isso não significa ausência de risco na infraestrutura ou operação não fornecidas.

### Alto

| Risco | Justificativa | Solução necessária |
|---|---|---|
| Formulário sem backend | Leads não são enviados. Não há validação de servidor, rate limiting, CSRF, armazenamento ou processo de atendimento. | Definir endpoint, fornecedor, finalidade, base legal, retenção, autenticação, proteção antispam e validação server-side antes de ativar. |
| Processo de reembolso indefinido | Não há papéis, canal, prazos por meio de pagamento, taxas ou integração com adquirente. | Aprovar política operacional e jurídica antes de qualquer venda. |
| Governança LGPD não comprovada | Não foram apresentados inventário completo, registro de operações, contratos com operadores, política de retenção, plano de incidentes ou responsável. | Estruturar governança, evidências e responsáveis; revisar com profissional qualificado. |
| Direitos autorais e autorizações | Não há documentação de licenças para imagens, vídeo, fontes, ícones, marcas de clientes ou fotografias. | Reunir licenças e autorizações; substituir ou remover qualquer ativo sem cadeia de direitos comprovada. |

### Médio

| Risco | Justificativa | Solução necessária |
|---|---|---|
| Dados cadastrais e canais não verificados | CNPJ, sede, e-mail e Instagram foram fornecidos ou já estavam no projeto, mas não foram comprovados por documento oficial nesta auditoria. | Validar Receita Federal, contrato social, domínio, e-mail e contas oficiais antes da publicação. |
| Dependências por CDN | GSAP e Lenis são carregados de jsDelivr/unpkg, sem cópia local ou SRI. Isso adiciona risco de cadeia de suprimento e processamento técnico por terceiros. | Preferir hospedagem local versionada ou adicionar SRI/CORS e avaliar contratos/transferências. |
| Cabeçalhos de segurança de servidor | CSP por meta não cobre todos os controles; HSTS, `X-Content-Type-Options`, `Permissions-Policy`, `frame-ancestors` e cookies seguros dependem do servidor. | Configurar e testar cabeçalhos HTTP na hospedagem de produção. |
| Retenção e descarte indefinidos | Não existem prazos aprovados para leads, logs, contratos e atendimento. | Criar tabela de temporalidade por finalidade e obrigação legal. |
| Uso de marcas e fotos de clientes | O site exibe logos e peças de eventos sem evidência de autorização no repositório. | Confirmar autorização escrita e escopo de uso de cada material. |

### Baixo

| Risco | Justificativa | Solução necessária |
|---|---|---|
| Preferência de cookies sem expiração automática | A escolha permanece até limpeza ou mudança de versão. | Definir período de renovação com base em política empresarial e orientação jurídica. |
| Validação manual assistiva pendente | Auditoria automatizada não cobre todos os critérios WCAG. | Testar leitores de tela, zoom 200/400%, alto contraste, teclado e dispositivos reais. |

## 6. Informações empresariais a confirmar

- Situação cadastral atual de Sua Ticketeira Ltda - ME e do CNPJ 48.422.722/0001-60.
- Endereço completo da sede.
- Titularidade e monitoramento de `contato@suaticketeira.com.br`.
- Canal oficial de privacidade e atendimento de direitos dos titulares.
- Necessidade de indicação e identidade do encarregado de dados.
- Canal oficial de WhatsApp e horário de atendimento.
- Papéis da Sua Ticketeira, organizador, adquirente e demais fornecedores.
- Fornecedor de hospedagem, localização, logs e retenção.
- CRM, e-mail, API ou banco que receberá o formulário.
- Fornecedores de pagamento, antifraude, suporte e emissão de ingressos.
- Licenças e autorizações de todas as imagens, vídeo, fontes, ícones, logos e marcas.
- Política comercial real, SLA, suporte, preços, taxas e cancelamento.
- Fluxo, canal e prazos reais de reembolso.

## 7. Questões que exigem revisão jurídica especializada

- Bases legais definitivas para cada operação real de tratamento.
- Papéis de controlador, operador, controladores conjuntos e suboperadores.
- Contratos de tratamento, transferências internacionais e fornecedores de CDN/hospedagem.
- Aplicação do direito de arrependimento e regras de reembolso em cada modalidade de evento.
- Responsabilidades da plataforma e dos organizadores perante consumidores.
- Termos comerciais B2B, limitações de responsabilidade, SLA e solução de conflitos.
- Tratamento de dados de compradores, participantes, menores, equipes e operadores na plataforma completa.
- Programa de governança, resposta a incidentes, exercício de direitos e relatório de impacto quando necessário.

## Referências oficiais utilizadas

- [Lei Geral de Proteção de Dados — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Direitos dos titulares — Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [Código de Defesa do Consumidor — Lei nº 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
- [Web Content Accessibility Guidelines (WCAG) 2.2 — W3C](https://www.w3.org/TR/WCAG22/)

## Conclusão

O front-end agora possui documentação legal preliminar, consentimento funcional, formulário mais transparente, melhorias de acessibilidade e redução de conteúdo potencialmente enganoso. A publicação definitiva depende das confirmações empresariais, da implementação segura do backend e da revisão jurídica das práticas reais. Os resultados Lighthouse refletem somente as páginas e categorias testadas em 27/10/2026 e não equivalem a certificação WCAG ou LGPD.
