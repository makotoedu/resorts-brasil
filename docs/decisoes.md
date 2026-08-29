# Decisões técnicas

Registro do porquê de cada escolha da refatoração de 2026. A intenção é que
quem mexer no projeto daqui a um ano não precise redescobrir o raciocínio —
nem repetir os erros.

---

## Astro em vez de 11ty

Os dois foram avaliados. O site tinha três problemas medidos — 191 imagens sem
otimizar, 1.3 MB de CSS/JS sem minificar e ausência de `hreflang` num site
trilíngue — e a diferença entre os geradores é onde essas soluções moram.

**O 11ty entrega as peças; o Astro entrega a esteira montada.** No 11ty,
otimizar imagem é instalar `@11ty/eleventy-img` e configurar formatos e paths;
minificar CSS é instalar `lightningcss` e escrever um filtro `cssmin` à mão. No
Astro, imagem é `import { Image } from 'astro:assets'` e a minificação é o Vite,
que já vem dentro.

O contra-argumento real do 11ty é que ele aceitaria os 40 arquivos `.html`
quase como estavam, e sua árvore de dependências é bem menor — o que envelhece
melhor num site institucional mexido poucas vezes por ano.

Pesou a favor do Astro o fato de o `<nav>` ser byte a byte idêntico nas 40
páginas: um único layout cobria o site inteiro, o que tornou a conversão para
`.astro` bem mais barata do que o normal.

---

## JavaScript nativo em vez de jQuery

O tema carregava 504 KB (`jquery.js` + `plugins.js` + `functions.js`) por
pageview. A investigação mostrou que o site usava quase nada disso.

O `functions.js` inicializava Magnific Popup, parallax, contagem regressiva,
gráficos de pizza, barras de progresso, widget do Instagram, backgrounds de
Vimeo/YouTube, sticky sidebar e infinite scroll — e nenhum desses componentes
existe em qualquer uma das 40 páginas. Não há um lightbox, um filtro de
portfólio ou um formulário no site inteiro.

**Três exceções, todas descobertas tarde e do jeito difícil.** O padrão se
repetiu: um plugin removido deixava para trás CSS que dependia dele, e o CSS
falhava em silêncio — sem erro de console, sem mudança de altura, sem teste
reprovado.

| plugin | o que dependia dele | sintoma |
|---|---|---|
| `breakpoints` | 15 regras via `body.breakpoint-*` | grade e espaçadores presos no tamanho de desktop |
| Isotope | `.grid-layout > *` com `opacity: 0` | 6 páginas com o conteúdo **invisível** |
| flickity | contexto de empilhamento do `.slide` | o zoom do hero **não acontecia** |

O caso do Isotope ilustra por que a busca inicial não achou: procurei por
`isotope`, `grid-filter` e `portfolio` no markup, mas a classe que dispara a
inicialização é `grid-layout`. Cada um tem sua seção adiante.

Sobraram 9 comportamentos reais, hoje em [`src/scripts/site.js`](../src/scripts/site.js).
São 10 desde agosto/2026, com a fachada dos vídeos, e cerca de 10 KB minificados.

Dois achados encurtaram bastante o trabalho:

- **O "slider" da home tem um slide só.** Não é carrossel: é um hero estático
  com efeito Ken Burns, que é `@keyframes` CSS.
- **O cabeçalho fixo no scroll nunca executava.** O handler do tema começa com
  `if (!$header.is(".header-disable-fixed"))` e as 40 páginas têm exatamente
  essa classe. O caminho mobile dependia de `data-responsive-fixed="true"`,
  ausente em todas.

A chave para o baixo risco foi o módulo novo aplicar **as mesmas classes de
estado do tema** (`.toggle-active`, `.mainMenu-open`, `.menu-animate`,
`.dropdown-active`, `.kenburns-bg-animate`, `.modal-active`, `.active`), de modo
que o CSS existente continuou valendo sem alteração.

---

## A armadilha: `body.breakpoint-*`

**Esta é a parte mais importante deste documento.**

O tema Inspiro não usa media queries para parte do comportamento responsivo. O
plugin `breakpoints` do jQuery aplicava classes `breakpoint-xs` / `sm` / `md` /
`lg` no `<body>` a cada resize, e **15 regras do `style.css` dependiam delas**.

Ao remover o jQuery, esse mecanismo sumiu e as 15 regras deixaram de valer. O
sintoma mais visível: a grade de logos dos resorts ficava em 6 colunas em
qualquer largura, com os logos renderizando a **38×38 px em vez de 124×124**.
Os espaçadores `hr.space` (28 usos) mantinham a altura de desktop em telas
pequenas, e a fonte da página 404 não reduzia no mobile.

A correção está em [`public/css/ajustes.css`](../public/css/ajustes.css),
que converte as regras para media queries de verdade. Preferiu-se isso a
reimplementar as classes em JS porque elimina a dependência de runtime para
layout — não há salto visual depois que o script carrega — e porque media
queries sobrevivem à purga de CSS.

### As faixas — e o array errado

O plugin traz um array padrão próprio, em `js/plugins.js`:

```js
breakpoints: [ {name:"xs",width:0}, {name:"sm",width:768},
               {name:"md",width:992}, {name:"lg",width:1200} ]
```

**Não é esse.** O site sobrescreve o array na chamada de configuração, em
`js/functions.js` (commit `069b3b4`, linhas 68-88), e são estes os valores que
valem:

| classe | faixa | media query equivalente |
|---|---|---|
| `xs` | 0 – 575 | `(max-width: 575px)` |
| `sm` | 576 – 767 | `(min-width: 576px) and (max-width: 767px)` |
| `md` | 768 – 1024 | `(min-width: 768px) and (max-width: 1024px)` |
| `lg` | 1025 – 1199 | `(min-width: 1025px) and (max-width: 1199px)` |
| `xl` | 1200+ | `(min-width: 1200px)` |

A primeira conversão usou o array do plugin e ficou deslocada uma faixa inteira.
O sintoma é traiçoeiro porque o erro **não aparece nos extremos**: a 390px e a
1440px o resultado coincidia, e a divergência se concentrava no meio da escala —
o tablet a 768px caía em `sm` em vez de `md` e os `hr.space` ficavam 10px curtos
em várias páginas. Foram 22 das 40 comparações de tablet.

Existe `xl`, ao contrário do que esta página afirmou por um tempo. As duas regras
do tema que dependem dele são de fato inertes aqui, mas por outro motivo: os
seletores apontam para `.pricing-table`, que não existe em nenhuma das 40
páginas. A distinção importa — "a classe nunca é aplicada" teria sido motivo para
não reproduzir a regra; "a classe é aplicada mas nada casa" não é.

O resolvedor do plugin escolhe a maior faixa cuja largura seja menor ou igual à
atual (`t >= n.width && (e = n.name)`), então as bordas são inclusivas embaixo.

Os mesmos valores governam o número de colunas do carrossel de logos — ver a
seção sobre o carrossel adiante.

Duas lições que valem para qualquer mexida futura neste tema:

1. **Este tema resolve em JavaScript coisas que pareceriam CSS.** Antes de
   remover qualquer script, procure por seletores que dependam de classes que
   nenhum HTML estático contém.
2. **Testes de comportamento não pegam regressão de layout.** A suíte passou
   14/14 durante todo o período em que a grade estava quebrada. Quem pegou foi o
   diff visual. Veja [verificacao.md](verificacao.md).

---

## As grades `.grid-layout` e o Isotope

A segunda armadilha da mesma família, e a de consequência mais grave.

O tema mantinha os filhos de `.grid-layout` invisíveis até o Isotope
inicializar:

```css
.grid-layout > *             { opacity: 0; transition: opacity .5s; }
.grid-layout.grid-loaded > * { opacity: 1; }
```

Quem adicionava `.grid-loaded` era o JavaScript. Sem jQuery, ninguém adicionava
— e o conteúdo das **seis páginas com grade** (publicações e estatísticas nos
três idiomas) ficava com `opacity: 0`. Invisível, não apenas desalinhado.

A correção tem duas metades:

1. **A visibilidade ficou no CSS**, em [`ajustes.css`](../public/css/ajustes.css),
   não no JavaScript. Se o script falhar, o conteúdo aparece de qualquer jeito —
   é mais robusto que o original, onde uma falha de JS escondia a página.
2. **O empacotamento ficou no JavaScript**, em `gridLayout()` dentro do
   [`site.js`](../src/scripts/site.js). Cheguei a tentar resolver só com o
   `float: left` que o tema já aplica, mas os itens têm alturas desiguais e os
   floats produzem escada: no tablet a página ficava 583 px mais alta que o
   original. O Isotope faz masonry de verdade — coloca cada item na coluna mais
   curta — e isso precisa de JS.

As calhas entre os itens vinham do atributo `data-margin`, que o Isotope
convertia em `padding` nos itens e margem negativa no contêiner. Isso está
reproduzido em CSS por seletor de atributo — **incluindo o padrão de 20px de
quando o atributo não existe** (`data-margin || 20`, em `js/functions.js`). Uma
das grades do site não traz o atributo, e reproduzir só o caso `data-margin="30"`
deixava as três páginas de estatísticas com calha de 10px e 38px a mais.

---

## O Ken Burns que não acontecia

A terceira armadilha da mesma família, e a mais silenciosa das três.

A camada de zoom do hero é um `<div class="kenburns-bg">` com
`position: absolute; z-index: -1`, sobre um `.slide` que tem **a mesma imagem de
fundo**. O z-index negativo põe a camada atrás do *conteúdo* do slide e à frente
do *fundo* dele — mas só se o slide for um contexto de empilhamento. No original
quem garantia isso era o flickity, que posicionava cada slide com
`position: absolute; z-index: 2`.

Sem flickity o slide voltou a ser estático e deixou de criar contexto. O
`z-index: -1` passou a valer no contexto de um ancestral, e a camada foi parar
**atrás do fundo do próprio slide**. Como a imagem é a mesma, a home continuava
parecendo correta — só que estática. **O efeito Ken Burns não acontecia.**

A correção é uma linha em [`ajustes.css`](../public/css/ajustes.css):
`position: relative` sem deslocamento, que não move nada e restaura o contexto.

O que torna este caso instrutivo é o que *não* pegou:

- a altura da página não mudava;
- o `<div>` existia, com a classe `.kenburns-bg-animate` aplicada;
- a verificação comportamental checava exatamente isso — e passava.

Quem pegou foi o diff de pixel, e mesmo assim indiretamente: a divergência
aparecia como um "enquadramento diferente" da fotografia. Hoje há uma verificação
que compara o hero consigo mesmo com 1,5 s de intervalo e exige que os pixels
mudem. Sem a correção ela mede variação **0,00**.

Moral, de novo: **verificar que o mecanismo foi montado não é verificar que ele
funciona.**

---

## O carrossel de logos e a fórmula da célula

O flickity dimensionava as células assim (`js/functions.js`, linhas 1092-1128):

```
colunas   = items / itemsLg / itemsMd / itemsSm / itemsXs, conforme a faixa
célula    = (largura útil + margem) / colunas
padding-right da célula = margem
```

Dois detalhes que parecem irrelevantes e não são:

- **A margem entra na divisão e só depois vira `padding`.** As colunas somadas
  preenchem exatamente a largura útil, e o `padding-right` da última célula fica
  para fora, no corte do `overflow`. Dividir a largura pelo número de colunas
  deixa cada logo alguns pixels menor — 5px a 10px, o bastante para o diff
  visual reprovar as três home.
- **"Largura útil" é a largura de conteúdo**, sem o `padding` horizontal do
  contêiner, porque o tema media com `$(window).width()`/`elem.width()` do
  jQuery, que exclui `padding`. Aqui isso são 28px de diferença.

A contagem de colunas vem de uma cadeia de tetos: `itemsLg = min(items, 4)`,
`itemsMd = min(itemsLg, 3)`, `itemsSm = min(itemsMd, 2)`, `itemsXs = 1` — cada
`data-items-*` explícito interrompe a cadeia. Com `data-items="6"`, o carrossel
do site vai de 1 coluna no celular a 6 no desktop grande.

As faixas são as de `functions.js` da seção anterior, não as do plugin.

---

## `<h1>` de verdade sem mudar o desenho

As páginas não tinham `<h1>`: o título de cada uma era um `<h2>`. Corrigir isso
era um dos motivos da refatoração, mas promover a tag muda a aparência — no
tema, `h1` é maior e mais pesado que `h2` (33px/600 contra 25px/500 no celular),
o que empurrava a página inteira para baixo.

A saída foi usar a classe utilitária `.h2` **que o próprio tema já traz**:

```html
<h1 class="text-md h2">Título</h1>
```

Assim a semântica é a correta e o desenho é exatamente o de antes, sem uma linha
de CSS novo. As quatro páginas que já tinham `<h1>` no original (a 404 e as três
do ebook) ficaram intocadas.

---

## A variante de cabeçalho das páginas do ebook

As três páginas do ebook são as únicas do site **sem `#topbar`**, e as únicas
cujo `<header>` leva a classe `dark`. As duas coisas andam juntas e não são
decorativas: sem o topbar, muda qual regra do tema vence a cascata do
deslocamento sob o cabeçalho transparente.

```css
#header[data-transparent="true"] + .fullscreen           { top: -80px }
#topbar ~ #header[data-transparent="true"] + .fullscreen { top: -120px }
```

O `ajustes.css` reproduz **as duas** regras, com o `<main>` no lugar da seção.
Fixar só o `-120px` deixava as páginas do ebook 40px altas demais — e como o
build também acrescentava um topbar de 41px que o original não tinha, os dois
erros quase se cancelavam na altura total (+1px no desktop) enquanto o conteúdo
inteiro ficava fora de lugar. Vale como aviso: **altura total igual não é prova
de layout igual.**

---

## Subset de fonte em vez de SVG inline

Os 16 ícones em uso (8 do FontAwesome, 8 do Inspiro) custavam 247 KB de fonte.

Trocar por SVG inline daria o melhor resultado teórico — zero requisição de
fonte — mas exigiria editar `<i class="icon-*">` espalhado pelas 40 páginas, com
risco de divergência de tamanho, alinhamento e cor.

O subset ([`scripts/subset-fonts.py`](../scripts/subset-fonts.py)) atinge
praticamente o mesmo ganho **sem tocar uma linha de markup ou CSS**, então o
risco visual é zero. A família `fa-regular-400` sai por inteiro: nenhum ícone
`.far` aparece em qualquer página.

**Aplicado em agosto/2026: 247 KB → 2,9 KB (−98,8%).** Junto vieram três
correções que o script original não tinha:

- **A lista de glifos estava incompleta e teria quebrado 6 páginas** — tem seção
  própria adiante, é o achado principal.
- **Origem e destino passaram a ser separados.** O script lia e escrevia em
  `public/webfonts/`, apagando os originais: rodar duas vezes subsetava um
  subset, e mudar a lista depois de commitado exigia recuperar do git. Hoje os
  originais moram em `vendor/webfonts/` e `public/webfonts/` é inteiramente
  gerado. Rodar duas vezes dá byte a byte o mesmo resultado.
- **A `inspiro-icons` virou `woff2`.** Era o único arquivo do site ainda em
  `woff`, o formato sem compressão Brotli.

E uma armadilha de cache que só aparecia daqui a um ano: o `vercel.json` serve
`/webfonts/` com `immutable, max-age=31536000` e **os nomes não têm hash**.
Sobrescrever `fa-solid-900.woff2` no lugar entrega a fonte antiga a quem já
visitou, por até 12 meses — inofensivo desta vez, porque o subset é subconjunto
do que estava lá, mas fatal na próxima, quando um ícone novo virar tofu. A saída
foi adotar o padrão que o próprio tema já usava em `inspiro-icons.woff?ijzgpf`:
uma query de versão (`?v=2026-08`) em todos os `src:`, declarada em
`scripts/glifos.json` e **conferida no build**.

---

## A quarta armadilha: o glifo que não tem classe

O padrão das três armadilhas anteriores era *plugin removido, CSS inerte*. Esta
é a mesma família com outra roupa: **inventário tirado do lugar errado**.

A lista de codepoints do `subset-fonts.py` foi montada varrendo os
`<i class="fa-*">` e `<i class="icon-*">` das 40 páginas. Dá 14 ícones. Mas dois
glifos entram por **pseudo-elemento**, e pseudo-elemento não tem classe no HTML:

```css
.list-icon.list-icon-arrow  li:before { content: "\f054"; font-family: "Font Awesome 5 Free" }
.list-icon.list-icon-circle li:before { content: "\f192"; font-family: "Font Awesome 5 Free" }
```

O `.list-icon li:before` fixa `font-weight: 900`, então os dois caem no
`fa-solid-900` — a mesma fonte que o script reduzia a **um único glifo**
(`U+F05A`, o `info-circle` da faixa de cookies).

Rodar aquele script apagava as setas de `politica-de-privacidade` e as bolinhas
de `historia`, **nos três idiomas**. Sem erro de build, sem erro de console, sem
mudança de altura — o glifo ausente vira tofu, que ocupa exatamente 1em, e
`historia` tem só 3 dessas listas.

### A varredura certa é a do CSS purgado

O `dist/css/` depois da purga é o único lugar onde sobra **exatamente** o que as
40 páginas usam — pseudo-elemento incluído. E é fácil de ler: o lightningcss já
converteu os escapes `\f054` em caractere literal, então basta varrer o
intervalo de uso privado (`U+E000`–`U+F8FF`).

Foi essa varredura que achou os dois. Ela virou
[`scripts/check-glifos.mjs`](../scripts/check-glifos.mjs), encadeado no `build`
depois da purga, no mesmo modelo do `purge-css.mjs`: **aborta, não avisa.**
Confere três coisas — todo codepoint do CSS está em `scripts/glifos.json`, todo
`src:` de fonte carrega a query de versão, e todo arquivo publicado é
referenciado por alguma folha.

Ela tem um falso positivo, e ele está anotado no JSON: `U+E919`
(`.icon-award`) sobrevive à purga por causa do caminho
`/images/ebook/icon-award.png` — o extrator do PurgeCSS casa a substring. Não
existe `<i class="icon-award">` no site. O campo `ignorar` existe para isso, com
o motivo por escrito.

### Duas verificações, porque são duas coisas diferentes

O `check-glifos` garante que **a lista cobre o que o CSS pede**. Não garante que
o arquivo gerado contém os glifos da lista — um `pyftsubset` com a flag errada
passa nele e falha no navegador.

Por isso há também uma verificação na suíte comportamental. Ela pinta cada
codepoint num `<canvas>` e compara com um codepoint sabidamente ausente da mesma
família: tofu é idêntico para qualquer codepoint que falte, então bitmaps iguais
significam glifo perdido.

**Medir largura não serve**, e vale registrar por quê: o tofu ocupa 1em, e vários
ícones também. O `info-circle` e o `dot-circle` medem exatamente os mesmos 100px
que a caixa vazia. E `document.fonts.check()` **também não serve**: no Chromium
ele responde `true` para um codepoint ausente, porque verifica se a família
carregou, não se ela tem aquele glifo. As duas tentativas foram feitas antes de
chegar no canvas.

Conferido: com o subset antigo no lugar, a verificação reprova nomeando
`chevron-right` e `dot-circle`.

---

## Google Fonts: o `@import` que ninguém via

A linha 9 do `style.css` era:

```css
@import url("https://fonts.googleapis.com/css?family=Poppins:100,200,400,500,600,700,800|Nunito:300,400,600,700,800");
```

Ela sobrevivia à purga e ia para produção **na primeira linha do CSS**. Como
`@import` dentro de folha, o navegador só descobria a fonte depois de baixar e
analisar o `style.css` inteiro: HTML → `style.css` → `googleapis` → `gstatic`,
três saltos em série, sem `preconnect` em nenhum.

Foi para o `<head>` do `BaseLayout` como `<link>`, com os dois `preconnect`. É a
**única edição de conteúdo** feita no `style.css` do tema, e não tinha
alternativa: um `@import` não pode ser desfeito pelo `ajustes.css`.

Três outras coisas mudaram junto, e todas vieram de medição:

- **A Nunito saiu inteira.** Cinco pesos baixados, e **nenhuma regra
  `font-family` em qualquer um dos três CSS a menciona** — a única ocorrência da
  palavra no repositório era a própria URL do `@import`.
- **O endpoint passou de `css?` (v1) para `css2`**, que aceita `display=swap`.
  Sem ele o texto inteiro do site ficava invisível por até 3 s.
- **A lista de pesos passou a ser a medida.** Varrendo `getComputedStyle` de
  todo elemento com texto nas 14 páginas em português, o site renderiza Poppins
  em **400, 500, 600, 700 e 800** e mais nada. O `@import` pedia 100 e 200, que
  não aparecem em lugar nenhum, e as duas regras de peso 300 que sobrevivem à
  purga (`.display-4` e `.heading-text.heading-section p`) **não casam elemento
  algum** — não há `<p>` dentro daqueles `<div>`.

Essa última merece atenção: a intuição dizia que trocar o peso 200 pelo 300
mudaria os `.heading-text.heading-section p` das páginas do ebook, e a
expectativa era divergência no diff. A medição mostrou que a regra é inerte, e a
mudança saiu de graça. **Neste tema, meça antes de concluir pelo seletor** —
vale para peso de fonte como valia para o `.dropdown-menu`.

### O que ficou de fora, e por quê

**Preload das faces não dá.** As URLs do `fonts.gstatic.com` são opacas e mudam
sem aviso; um `<link rel="preload">` apontando para elas quebra em silêncio. É
uma limitação direta de manter as fontes no Google.

**O IP do visitante continua indo para o Google**, em toda visita, antes de
qualquer consentimento — `preconnect` não muda isso, só o acelera. Auto-hospedar
resolveria; a decisão foi manter. Fica registrado ao lado da foto do Unsplash em
`/resorts-brasil`, que é a mesma natureza de decisão.

---

## Sintaxe de media query e alvos do lightningcss

Sem `targets` configurados, o lightningcss emite a sintaxe de range do Media
Queries Level 4 — `@media (width<=767px)` — que só funciona em Chrome 104+,
Safari 16.4+ e Firefox 102+. Em navegador mais antigo a media query é **ignorada
em silêncio**, o que traria de volta exatamente a regressão descrita acima.

Por isso [`scripts/purge-css.mjs`](../scripts/purge-css.mjs) fixa alvos
conservadores, forçando a sintaxe clássica de `min-width`/`max-width`. Se algum
dia alguém remover essa configuração, o site quebra em telas pequenas de
aparelhos antigos sem nenhum erro visível no build.

---

## Purga de CSS contra o HTML gerado

A purga roda sobre `dist/`, não sobre o fonte: é o único lugar onde as classes
finais das 40 páginas existem juntas.

Duas armadilhas encontradas ao configurar:

- **Um glob errado faz o PurgeCSS purgar contra nada** e cortar quase tudo, com
  um aviso discreto (`No files found from the passed PurgeCSS option 'content'`).
  Na primeira tentativa o `style.css` foi de 452 KB para 11.7 KB, e o único
  sinal foi aquela linha no log.
- **Safelist ampla anula o ganho.** Safelistar `/^fa-/` por precaução retinha o
  set inteiro do FontAwesome e deixava o `plugins.css` em 130 KB. Como os ícones
  em uso aparecem no HTML, o purge os encontra sozinho; sem a safelist ampla o
  arquivo caiu para 8 KB.

A safelist mantida cobre só o que o purge não tem como enxergar: as classes que
o [`site.js`](../src/scripts/site.js) aplica em runtime.

---

## Preservação de URLs

Manter as URLs foi requisito, não detalhe — o site tem histórico de indexação.

A combinação que preserva é `build.format: 'file'` no
[`astro.config.mjs`](../astro.config.mjs), que gera `historia.html` em vez de
`historia/index.html`, com o `cleanUrls: true` que já existia no
[`vercel.json`](../vercel.json). O i18n foi configurado com
`prefixDefaultLocale: false` e `redirectToDefaultLocale: false` justamente para
não introduzir nenhum redirect implícito.

A única URL removida foi `/arena-conexoes`, a pedido, com redirect 301 para `/`.

---

# Refino de 2026 — segunda passagem

A refatoração terminou com 120/120 no diff visual, e foi justamente por ser fiel
ao original que ela **preservou os defeitos dele**. Esta segunda passagem
separou o trabalho por risco visual: primeiro tudo o que não move um pixel,
depois a extração de dados, cada bloco com sua rodada de diff.

---

## O critério: risco visual, não tamanho

O que tornou esta passagem barata foi ordenar por risco em vez de por esforço.
Meta tags, `sitemap.xml`, JSON-LD, `aria-*`, `rel="noopener"`, nomes acessíveis
e foco visível **não movem um pixel em repouso** — o diff visual não foca nada e
não lê atributo. Deu para fazer os 40 arquivos de uma vez e confirmar com uma
única rodada: `120/120`.

Isso vale como método: neste projeto, antes de estimar uma mudança, pergunte se
ela aparece num screenshot parado. Se não aparece, o custo de verificação é
quase zero e ela pode ir junto com outras.

---

## Foco visível: `:focus-visible`, não `:focus`

O tema apaga o indicador de foco do site inteiro:

```css
a:not(.btn):not(.badge):hover,
a:not(.btn):not(.badge):focus,
a:not(.btn):not(.badge):active { outline: none }
```

O `:hover` está no mesmo seletor do `:focus`, então não dá para simplesmente
remover a regra: isso mudaria o desenho do hover, que é visível e está no diff.

A saída foi acrescentar `:focus-visible` no `ajustes.css`. O navegador só o
aplica quando o foco veio do teclado, então o clique de mouse continua sem
contorno — nada muda para quem usa ponteiro, e o diff visual segue idêntico.

## Submenu que abria no `:hover` e não no foco

Medido no navegador, não deduzido do CSS: com o item pai **focado**, o
`.dropdown-menu` tinha altura **0**; no `:hover`, 136px. Quem navegava por
teclado tabulava para dentro de um submenu invisível — os links recebiam foco
sem nada aparecer na tela.

A causa é `display: none` → `display: block` no `:hover`, sem equivalente para
foco. Um `:focus-within` no `ajustes.css` resolve.

Vale registrar o caminho: a primeira hipótese foi que os submenus de desktop
estavam **quebrados**, porque a única regra que os revela no `style.css`
depende de `.hover-active`, classe que ninguém aplica desde a saída do jQuery.
Um teste no navegador mostrou que abrem normalmente — a regra do `.hover-active`
está dentro de `@media (max-width: 991.98px)` e o desktop usa outro caminho.
**Neste tema, meça antes de concluir:** o CSS é grande o bastante para que ler
o seletor errado leve a um diagnóstico inteiro errado.

---

## Guarda na purga de CSS

O `decisoes.md` já contava que um glob errado faz o PurgeCSS purgar contra nada,
levando o `style.css` de 452 KB para 11.7 KB com um aviso discreto de uma linha
como único sinal. O aviso continuava lá, e nada impedia o estrago.

Agora o script aborta em três situações:

1. `dist/` não tem exatamente 40 páginas;
2. o PurgeCSS devolve menos folhas do que existem em `dist/css/`;
3. qualquer folha encolhe mais de 99,5%.

A (2) é a que pega o caso real: rodar o script de outro diretório fazia os dois
globs não casarem nada, e ele terminava com `TOTAL 0.0 KB` e **código de saída
0** — um sucesso silencioso que um pipeline daria por bom.

---

## Dados em vez de markup, em duas etapas

A extração de `src/data/` foi feita para ser **verificável**, não só menor. A
regra: o HTML gerado tem de ter a mesma árvore de antes.

Para conferir isso sem depender só do diff de pixel, a comparação foi feita no
HTML: normaliza espaço em branco, ignora atributos que não afetam layout
(`href`, `alt`, `aria-*`, `rel`) e compara a sequência de tags, classes e texto.
Isso localiza a divergência em segundos, com o nome da tag — enquanto o diff
visual diz só que a página mudou.

Foi assim que apareceram as duas omissões da primeira tentativa:

- **os 11 `<div class="line">`** entre estados na página de associados, que o
  extrator não capturou por não serem dados;
- **os `</div>` de fechamento** do carrossel da home, engolidos por um recorte
  que ia até o próximo comentário HTML.

Nenhuma das duas apareceria como erro de build. A segunda teria fechado o
`<section>` cedo demais.

### O que mudou de propósito

Três mudanças deliberadas de conteúdo, todas invisíveis no diff:

| mudança | por quê |
|---|---|
| o logo `wyndham-gramado` entrou na home em espanhol | as outras duas homes já o tinham; era o ES que estava desatualizado |
| os 71 `href="#"` do carrossel viraram os sites reais | as URLs já estavam em `/associados`; eram 71 links que o teclado percorria para lugar nenhum |
| `alt` normalizado nos três idiomas | EN e ES tinham dois nomes em caixa baixa |

O carrossel fica `hidden` durante o diff (ver [verificacao.md](verificacao.md)),
e é de uma linha só, então acrescentar um logo não muda a altura da página.
Confirmado: `120/120` depois da extração.

Quem **não** tem site continua com um `<a>` sem `href`, em vez de `href="#"`.
Isso mantém a caixa que o carrossel mede e o ícone que a grade desenha, mas tira
o item da ordem de tabulação — um `<a>` sem `href` não é link para o leitor de
tela.

---

## Achados de conteúdo, e o que o cliente decidiu

A extração de `src/data/` tornou visíveis divergências que a duplicação
escondia. Nenhuma delas era decisão de engenharia. As respostas do cliente, em
20/08/2026:

### Decidido e aplicado

**O Wyndham Gramado deixou de ser associado.** Ele aparecia no carrossel da home
em PT e EN, mas não constava de `/associados` e não tinha URL em lugar nenhum —
o ES já o havia removido. Saiu de [`carrossel-home.ts`](../src/data/carrossel-home.ts),
que passou a ter 70 logos.

Não gera divergência no diff visual: o carrossel fica `hidden` durante a
comparação e é de uma linha só, então um logo a menos não muda altura.

**A lista de parceiros correta é a portuguesa.** A versão inglesa de associe-se
listava 10 parceiros, dois a mais (`talge` e `villa-camarao`) — e os dois já
apareciam na faixa de *mantenedores* da mesma página, o que reforça terem sido
duplicados por engano. A página inglesa passou a usar a mesma constante
`parceiros` das outras duas, e o `parceirosJoinUsEn` deixou de existir.

**Esta muda o layout de propósito**: −144px no mobile e −197px no tablet de
`/en-us/join-us`. No desktop fecha idêntica, porque 10 e 8 logos ocupam as mesmas
duas linhas numa grade de 6 colunas. Junto com a tradução dos cargos (adiante), o
valor de referência do diff passou a ser **117/120** — ver
[verificacao.md](verificacao.md).

**A foto de hero do Unsplash em `/resorts-brasil` fica.** É uma dependência de
terceiro numa página que hospeda todo o resto, e entrega o IP do visitante a
outro domínio, mas a decisão foi mantê-la. Registrado para quem reencontrar o
`https://images.unsplash.com/...` no meio de 42 caminhos locais e achar que é
descuido: não é.

**O seletor de idioma passa a levar à tradução da página atual.** Antes o
destino era `url('home', ...)` fixo: trocar de idioma em `/historia` jogava o
visitante na home inglesa. O mapa `routes` já tinha o slug traduzido de cada
página — faltava usá-lo. O `BaseLayout` passa a `route` ao `Header`, que resolve
o destino e ainda marca o link com `hreflang`. Só a 404 cai na home, por não ter
tradução.

Muda só atributos, então não aparece no diff visual — mas aparece no uso.

**Os dois LinkedIn trocados foram corrigidos.** Antonio Dias e Laini Melo
apontavam ambos para `carlos-jacobina-b0362b4b` — que é, de fato, o perfil do
Carlos Jacobina, membro do Conselho Consultivo. O endereço certo dele estava lá;
tinha sido copiado por cima dos outros dois. Hoje os três estão corretos e não há
LinkedIn repetido no arquivo.

**Os cargos da diretoria passaram a ser traduzidos** — e a correção obrigou a
uma distinção que o markup escondia. O campo `cargo` carrega duas coisas
diferentes:

| grupo | o que o campo traz | traduz? |
|---|---|---|
| Diretoria | um cargo ("Vice-Presidente de Operações") | **sim** |
| Conselho Consultivo | a empresa do conselheiro ("Grupo Aviva") | **não** — é nome próprio |

Por isso o tipo é `string | Record<Locale, string>`: string simples para o que
não traduz, Record por idioma para o que traduz. Traduzir os dois teria posto
"Aviva Group" no site. Tratar os dois como a mesma coisa foi justamente o que
deixou a página inteira em português nos três idiomas.

Sobre gênero: **o espanhol marca o que o português marca, e nada além disso.**
"Vice-Presidente Administrativo-Financeira" já vinha no feminino no original,
então o espanhol acompanha; "Vice-Presidente de Inteligência Humana" é invariável
em português e segue invariável em espanhol. A regra é espelhar a fonte, não
inferir a partir do nome.

As traduções valem uma conferência do cliente antes de ir ao ar: são títulos
oficiais de pessoas reais, e "Vice-Presidente Comercial" em inglês pode ser
*Vice President of Sales* ou *Commercial Vice President* conforme o que a
associação usa em documento.

**Efeito no layout, e uma lição sobre o diff.** O inglês é mais curto: "Chair of
the Board" cabe numa linha onde "Presidente do Conselho" ocupava duas, e a página
`/en-us/board` encolheu 23px no mobile — divergência aceita e registrada.

Já `/es-es/directorio` trocou os seis cargos e **passou no diff como idêntica**:
o espanhol tem comprimento parecido com o português, coube nas mesmas linhas, e
os 0,15%–0,24% de pixels alterados ficaram abaixo do limiar de 0,5%. Ou seja: o
diff visual pega o que empurra layout, não o que troca palavra. Para trabalho de
tradução, confira o texto no HTML gerado — está detalhado em
[verificacao.md](verificacao.md).

### Ainda em aberto

- **O contador diz 83 resorts associados; a lista tem 78.**
- **As páginas do ebook seguem em português nas três versões** — 1.089 linhas
  cada, é trabalho de tradutor.

---

# O consentimento que não consentia

Agosto/2026. Esta seção conta o segundo dos dois trabalhos da terceira passagem;
o primeiro é o subset de fontes, acima.

## O diagnóstico, medido

O `BaseLayout` injetava `GTM-PK7DG6MD` de forma síncrona no `<head>`, mais um
`<iframe>` de `noscript` no topo do `<body>`. A faixa aparecia **2 s depois** e
gravava `cookiebar21_cbe=1` ou `=0` — valor que **nenhum código lia**. Aceitar e
recusar faziam exatamente a mesma coisa.

Antes de mexer, valeu medir o que de fato saía do navegador numa visita com
cookie limpo, sem tocar em nada:

| destino | o que é |
|---|---|
| `googletagmanager.com/gtm.js` e `/gtag/js` | o container e o carregador de tags |
| `analytics.google.com/g/collect` | GA4 coletando o pageview |
| `stats.g.doubleclick.net/g/collect` | GA4 com Google Signals |
| `googleads.g.doubleclick.net/pagead/id`, `google.com.br/ads/ga-audiences` | remarketing |

E os cookies gravados: `_ga` e `_ga_2S6ZPL4J2P`, ambos com **400 dias**. Esse
sufixo é o ID da propriedade GA4 (`G-2S6ZPL4J2P`) — foi assim que se descobriu,
de fora, o que o container carrega. **Medir foi o que produziu a tabela da
política**; sem isso, ela teria sido escrita por suposição, como a anterior.

## Bloquear, e não só sinalizar

Havia duas posturas possíveis. O Consent Mode v2 sozinho mantém o GTM carregando
sempre, com os sinais em `denied` — as tags do Google passam a mandar pings sem
cookie. É o desenho que o Google recomenda, e preserva a modelagem de conversão.
Mas ainda é uma requisição a um domínio do Google, com o IP do visitante, antes
de qualquer escolha.

A escolha foi **bloquear**: os defaults do Consent Mode ficam no `dataLayer`,
inline e sem rede, e o `gtm.js` só é injetado depois da decisão. Recusa total não
carrega o container — não há o que medir, e seria uma requisição a terceiro sem
finalidade.

Isso obriga o bloco a ser **inline e síncrono no `<head>`**, e não um módulo em
`src/scripts/`: os defaults precisam preceder qualquer carregamento, e a decisão
de injetar depende de ler o cookie sem esperar o `DOMContentLoaded`. Ele fica
**antes dos `<link>` de CSS** de propósito — um `<script>` depois de uma folha
pendente espera essa folha carregar para executar.

O `<noscript>` saiu. Sem JavaScript não há como pedir nem registrar
consentimento, então ele era a única coisa da página que ainda disparava
incondicionalmente.

## Três categorias, e o cookie novo

A política publicada já prometia, por escrito, que o visitante podia *"escolher
quais as categorias de cookies quer permitir ou recusar"*. O painel nunca
existiu. As três categorias da interface são as mesmas três da política, pelo
mesmo componente, então não têm como discordar.

O `cookiebar21_cbe` **não é herdado**: guardava uma escolha que não controlava
nada, tomada sem informação. Quem decidiu antes decide de novo, e o cookie velho
é expirado. O novo é `rb_consent`, 180 dias, com uma versão no valor
(`v1|a:1|p:0|t:…`) — quando uma categoria ou um fornecedor mudar, basta subir a
versão para a faixa voltar.

Duas decisões de interface que são de conformidade, não de estética:

- **Os três botões usam a mesma classe.** O original punha `btn-outline` no
  "Recusar" contra o `btn-light` sólido no "Aceitar" — recusar tem de ser tão
  fácil e tão visível quanto aceitar.
- **O atraso de 2 s virou zero.** Ele só fazia sentido quando a faixa era
  decorativa; agora nada é medido enquanto ela não for respondida, e adiar a
  pergunta é adiar a medição.

A faixa mudou de lugar no DOM, para logo depois do skip link, e nasce `hidden`.
São dois detalhes com o mesmo motivo: no original os botões ficavam na ordem de
tabulação **mesmo fora da tela e mesmo para quem já tinha decidido** — a faixa
sai de cena por `transform`, que não tira nada do foco.

> O `[hidden]` precisou de reforço no `ajustes.css`: o tema dá
> `display: inline-block` a `.modal-strip`, e declaração de autor vence o
> `display: none` que o navegador aplica a `[hidden]`.

## Custo zero no diff, e o motivo

`.modal-strip` é `position: fixed`, portanto **fora do fluxo**: a faixa pode
crescer, ganhar um terceiro botão e abrir um painel inteiro sem mover um pixel de
página nenhuma. E o `visual-diff.mjs` já a escondia.

O mesmo raciocínio escolheu onde pôr o botão de revogar. Ele foi para a faixa de
copyright, que o diff **também** já esconde (o ano virou dinâmico), e não para a
lista "Navegação" — lá, um `<li>` a mais mudaria a altura do rodapé em 39 páginas
× 3 viewports.

Vale como método: neste projeto, antes de escolher onde pôr uma coisa nova,
olhe o que o `FREEZE` do diff visual já neutraliza.

## Os vídeos, e o `iframe` que a purga levaria

As 6 páginas com YouTube embutiam `youtube.com/embed` direto — contato no
carregamento, antes de qualquer escolha, puxando junto `i.ytimg.com`,
`doubleclick.net` e `jnn-pa.googleapis.com`. Viraram fachada de
clique-para-carregar, com destino `youtube-nocookie.com`. **O clique é o
consentimento daquele vídeo**, então a fachada não depende da faixa.

A miniatura é local. Puxá-la de `i.ytimg.com` faria a fachada chamar a CDN do
Google, que é o problema que ela existe para resolver.

E a fachada é um `<a href>` de verdade, não um `<button>` — mesmo raciocínio do
`href="#top"` do `#scrollTop`: sem JavaScript um botão aqui não faria nada e o
visitante ficaria sem o vídeo. Com JavaScript, o `preventDefault` troca a fachada
pelo embed ali mesmo; sem ele, o link leva à página do vídeo.

E aqui apareceu mais uma da família "seletor que ninguém enxerga": depois da
fachada e da saída do `<noscript>`, **não existe um único `<iframe>` nas 40
páginas**. O PurgeCSS levaria embora o `iframe{width:100%}` do tema e o
`.yt-facade iframe{height:100%}` do `ajustes.css` — e o `<iframe>`, que nasce no
clique, nasceria com os 300×150 do padrão do navegador.

`iframe` entrou na safelist do `purge-css.mjs`. É a primeira entrada que **não é
uma classe**, e o comentário no arquivo explica por quê. O diff visual não pegaria:
em repouso a página mostra a fachada, e o estrago só existe depois de um clique.

## A tabela de cookies descrevia outro site

A política listava `__privaci_cookie_consents` e mais três da mesma plataforma de
consentimento — **que nunca foi instalada aqui** —, `Wordpress_test_cookie` (o
site não é WordPress), `http_token` e `exitIntentFlag` (Poptin, ausente),
`Mc_ session` e `_gali`, com validades vencidas em 2021 e 2023. E **não citava o
único cookie que o site realmente gravava**.

É resíduo do site anterior, copiado na migração. A seção inteira virou
[`SecaoCookies.astro`](../src/components/SecaoCookies.astro) alimentado por
[`src/data/cookies.ts`](../src/data/cookies.ts), pelo mesmo motivo de sempre:
estava escrita à mão nos três idiomas, e conteúdo triplicado neste projeto sempre
divergiu. Uma tabela de tratamento de dados desatualizada em um idioma só seria
pior que um logo a menos.

O componente **aborta o build** se faltar a finalidade de algum cookie em algum
idioma. Célula vazia numa tabela dessas não pode passar em silêncio: ninguém
repara, e ela vai ao ar afirmando nada sobre um cookie que existe.

> **Duas pendências que não se resolvem no código.** Só o console do GTM diz o
> que mais pode ser disparado por uma tag ainda não publicada — a tabela precisa
> dessa conferência. E o texto é jurídico: vale revisão do cliente antes de
> publicar, como se fez com os cargos da diretoria.
>
> Do lado do GTM, falta ainda configurar *verificações de consentimento
> adicionais* por tag. Bloquear o carregamento cobre o pré-consentimento, mas não
> cobre quem aceita só "Desempenho": aí o container carrega, e só as tags do
> Google respeitam `ad_storage` sozinhas.

## O que o `#scrollTop` revelou

A verificação do voltar-ao-topo passou a falhar: a faixa, agora sem atraso, cobre
o canto onde o botão vive (`z-index` 999 contra 199).

O encontro **não é novo** — mesma CSS, mesmos z-index, e no original a faixa
também passava por cima assim que aparecia. O atraso de 2 s só escondia o
encontro do teste. O teste passou a decidir antes de rolar a página, que é o que
um visitante faz.

Fica registrado por ser o tipo de coisa que, daqui a um ano, parece regressão
introduzida aqui.

# Design system: Tailwind v4 sobre o tema

## A folha nova não pode entrar pelo layout

A instalação do Tailwind v4 (`@tailwindcss/vite`, via `astro add tailwind`) foi
feita importando `src/styles/global.css` no `BaseLayout`, para valer em todas as
páginas — as migradas e as que ainda usam o tema.

A hipótese era que as camadas bastavam: o Tailwind emite tudo dentro de
`@layer theme, base, components, utilities`, e CSS **sem** camada vence CSS
**em** camada, independentemente da ordem dos `<link>`. O tema é todo sem
camada, logo continuaria ganhando.

A primeira medição pareceu confirmar. Numa página legada, `:root` seguia em
14px, e `body`, `h1`, `h3`, `p` e `li` mantinham os mesmos valores computados de
antes da instalação.

**Estava errado, e o erro era de escopo.** A camada garante que o tema vence onde
ele *declara a mesma propriedade*. Onde o tema não declara, o Preflight vence o
padrão do navegador — e aí muda a página. O diff visual reprovou 22 das 40.

O vazamento, medido comparando cada página consigo mesma com a folha ligada e
desligada:

| propriedade | sem a folha | com a folha | ocorrências |
|---|---|---|---|
| `border-*-style` | `none` | `solid` | ~2200 |
| `display` (img, svg) | `inline` | `block` | 124 |
| `max-width` (img, svg) | `none` | `100%` | 221 |
| `list-style-type` | `circle` | `none` | 25 |
| `tab-size` | `8` | `4` | 2382 |

O `border-style` é o mais instrutivo. Parece inerte por vir com largura zero —
não é: elementos a que o tema dá `border-width` sem dar `border-style` contavam
com o `none` padrão para ficarem invisíveis. Com `solid`, a borda desenha.

Havia um segundo vazamento, em sentido contrário: por padrão o Tailwind varre o
`src/` inteiro e **gera utilitárias para nomes de classe que o tema já usa** —
`.container`, `.border`, `.table`, `.card`, `.row`, `.small`, `.active`. Elas
colidem com o CSS do tema. Foi o que produziu os `display: block -> grid` que
apareceram na varredura.

### A saída foi isolamento por ausência

Conter o vazamento pela cascata (uma classe `tema-legado` desfazendo o Preflight)
funciona para o caso conhecido e deixa a próxima regra vazar em silêncio — o
padrão que este projeto já pagou três vezes.

A folha passou a entrar pelo **frontmatter da página migrada**, nunca pelo
layout:

```astro
---
import '../styles/global.css';
---
<BaseLayout legado={false} ...>
```

O Astro empacota CSS pelo grafo de módulos de cada página, então quem não importa
não recebe. Página do tema fica literalmente sem o arquivo. Verificado no build:
`historia.html` não tem nenhum `<link>` para `/_astro/`, e `design.html` não tem
nenhum para `/css/`.

Do outro lado, `@import 'tailwindcss' source(none)` mais `@source` explícitos
tiram da varredura tudo que ainda não migrou, eliminando a colisão de nomes.

**Acrescente um `@source` a cada componente ou página migrada.** Esquecer não
quebra o build: a utilitária simplesmente não é gerada e o estilo some.

A invariante virou checagem no `scripts/verifica-sistema.mjs`, sobre o `dist/`:
nenhuma página pode carregar as duas camadas, e nenhuma pode ficar sem as duas.
É afirmação sobre o artefato, não sobre a intenção.

## O `rem` valia 14px

O `plugins.css` fixava `:root { font-size: 14px }`. Duas consequências que só
apareceram ao montar os tokens:

1. a escala do Tailwind é montada em `rem` sobre 16px — mantido o root em 14px,
   todo valor padrão encolheria 12,5% em silêncio;
2. fixar o root em `px` **anula a preferência de tamanho de fonte do navegador**,
   o que é falha de acessibilidade, não detalhe de escala.

O root voltou a `100%` no `base.css` e os tokens expressam, em `rem` sobre 16px,
o mesmo tamanho em pixel que foi medido. Renderização igual, preferência do
usuário devolvida, escala alinhada.

## A base foi medida, não lida

Os valores de `src/styles/base.css` saem de `scripts/medir-base.mjs`, que lê os
valores computados no navegador em 9 páginas × 3 viewports. O `style.css` tem 21
mil linhas e a regra que parece valer frequentemente não é a que vence — a cor
herdada do `<body>`, por exemplo, é `#001e6c` (medida em 169 elementos) e não a
`#1e2022` que o `plugins.css` declara.

A primeira versão do medidor pegava a **primeira** ocorrência de cada tag no
documento, e no `<header>` ela vem antes do `<main>`: o `a` saía com 40px e peso
800 (o logotipo) e o `ul` com `line-height: 80px` (a barra de navegação). Passou
a medir dentro de `main`, excluindo o cromo, e a reportar o valor **dominante**
por frequência, não o primeiro.

## Etapa 1: três valores do `tokens.css` não resistiram à medição

Os tokens da Etapa 0 foram medidos com `medir-base.mjs`, que cobre o **elemento
nu** — `h1`–`h6`, `p`, `ul`, `a`, `body`. O que tem classe ficou de fora, e é ali
que estavam os erros. `scripts/medir-primitivos.mjs` fechou o buraco: botão em
cinco variantes, seção, container, grade e ícone, nos três viewports, **com o
hover medido de mouse em cima** — o único estado que não aparece no HTML nem no
diff visual, e portanto o mais fácil de inventar.

Três correções saíram dali, todas do mesmo tipo (valor plausível, não medido):

| token | estava | medido | como o erro entrou |
|---|---|---|---|
| `--container-conteudo` | 1140px | **1500px** | é o padrão do Bootstrap, que este tema sobrescreve |
| `--color-acao-primaria` | `--cor-azul-600` (#0c71c3) | **`--cor-azul-500`** (#2250fc) | contagem de ocorrências no markup, não medição |
| `--radius-sm` / `--radius-md` | 0.42rem / 0.82rem | **0.3675rem / 0.7175rem** | a fração do tema resolvida contra o root de 14px dele |

O do container é o mais caro dos três: a primeira página de conteúdo migrada
teria nascido **24% mais estreita** que o site, e sem referência de pixel
ninguém saberia dizer se aquilo era o refino ou um defeito.

O da ação primária é o mais instrutivo. O `#0c71c3` aparece 123 vezes no markup
— parecia a cor de ação por volume. As 123 são **todas** títulos de capítulo do
`ebook.astro`. Nenhuma é botão. Contar ocorrência de hex no HTML responde "qual
cor aparece mais", que não é a pergunta.

O dos raios é o `rem` de 14px de novo, um degrau abaixo: a escala tipográfica foi
compensada na Etapa 0 e os raios ficaram com a fração original, que sob root de
16px inflaria os dois em 14%.

### O que muda de propósito

Quatro deltas deliberados, registrados aqui porque nenhum aparece em pixel hoje
— só quando a primeira página de conteúdo migrar:

- **botão `sm` sobe de 11px para 12px.** 11px não está na escala, e criar um
  degrau para um botão que só existe na faixa de cookies inverteria a relação
  entre sistema e exceção;
- **o container deixa de travar em 540px entre 576 e 767px.** É um degrau do
  Bootstrap que faz o conteúdo *encolher* quando a tela cresce, e saltar para a
  largura inteira em 768;
- **o `#4c5667` do texto do botão claro em hover** foi consolidado no cinza de
  parágrafo (`#525e75`), 6 pontos por canal;
- **botão ganha estado pressionado.** O tema não devolvia nada ao clique.

## Ícone: SVG antes da hora, e de propósito

O plano previa os ícones em SVG lá na frente. Foram antecipados para a Etapa 1,
porque `<Icone>` é um primitivo e um primitivo com implementação provisória
contamina tudo que o usa.

Os 16 contornos são extraídos **das próprias webfonts do tema**, por
`python scripts/glifos-para-svg.py`, a partir de `scripts/glifos.json` — o mesmo
inventário que o subset usa, e pela mesma razão de sempre: dois glifos entram por
pseudo-elemento e não têm classe no HTML.

O modo de falha aqui é idêntico ao que já custou caro neste projeto: contorno
vazio, codepoint trocado ou eixo espelhado não quebram build nenhum, do mesmo
jeito que o glifo ausente virava tofu. Daí `tests/verify-icones.mjs`, que
compara **forma**: renderiza os dois desenhos grandes, recorta cada um no seu
retângulo de tinta, reescala para 96×96 e mede a divergência. Assim a métrica da
fonte — que o navegador resolve com a tabela OS/2, não com o `hhea` que o gerador
leu — sai da conta e sobra o desenho.

Calibração: os 16 ficam entre 0% e 5,1% de divergência; trocar entre si os dois
glifos **mais parecidos do conjunto** (`chevron-right` e `chevron-up`) dá 33%. O
limiar está em 8%. E o primeiro erro de execução do próprio teste serviu de teste
negativo: a página montada com `setContent` não resolve `@font-face` relativo em
`about:blank`, a webfont não carregou, e os 16 reprovaram por tofu — exatamente o
sintoma que a checagem existe para pegar. A página passou a ser servida de dentro
da origem do preview, por interceptação de rota.

## O `/design` entrou na varredura de geometria

Ele fica fora de `tests/paginas.mjs` porque não é página de conteúdo — o diff
visual não tem contra o que compará-lo, já que não existe no site original. Mas
hoje é a única página que roda **só** sobre o sistema novo, então um primitivo
quebrado aparece ali antes de qualquer outro lugar.

Valeu na primeira execução: a escala tipográfica do catálogo transbordava 25px na
horizontal em 390px — rótulo de 12rem somado ao degrau `4xl`. Nenhum outro portão
viu, e a página que existe para denunciar problema estava com um.

## A purga agora encolhe sozinha

`scripts/purge-css.mjs` alimentava o PurgeCSS com `dist/**/*.html`, o que incluía
o `/design` — uma página que não carrega **uma linha** do tema mas cujas classes
mantinham regras do tema vivas para as 40 que carregam. Medido: 1,1 KB a mais em
`plugins.css` + `style.css`.

Passou a considerar só as páginas que de fato referenciam `/css/*.css`. O efeito
é o inverso e é automático: **cada página migrada sai da lista e leva junto as
regras que só ela mantinha**, então o CSS do tema encolhe ao longo da migração em
vez de ficar parado até a Etapa 11 apagá-lo.

# Etapa 2 — pipeline de imagens

## O acervo saiu de `public/`, e as 40 páginas do tema não souberam

O `astro:assets` só otimiza o que está em `src/`, então as 198 imagens foram
para `src/assets/imagens/`. Só que nenhuma página de conteúdo migrou ainda, e as
40 do tema pedem `/images/…` por HTTP — em 162 `<img src>` e 42
`background-image` inline. Mover sem mais nada quebraria o acervo inteiro delas.

A saída é [`scripts/imagens.mjs`](../scripts/imagens.mjs), que lê o HTML gerado e
copia para `dist/images/` **exatamente as imagens que ainda são pedidas**. É o
mesmo mecanismo que o `purge-css.mjs` passou a usar na Etapa 1, e pela mesma
razão: cada página migrada leva junto o que só ela mantinha, então o peso cai a
cada etapa em vez de esperar a Etapa 11. Quando a última página migrar, o script
copia zero e pode ser apagado.

De quebra, uma guarda que não existia: **referência sem arquivo aborta o build**.
Antes, caminho de imagem errado atravessava tudo e virava 404 no navegador.

### A ordem no `npm run build` importa

O script roda **depois** do `purge-css.mjs`. Rodando antes, ele lê o `style.css`
inteiro do tema, que referencia oito imagens que nunca existiram neste projeto
(`expand.png`, `triangle-divider-top.png`, quatro `overlay-pattern/`…) — sobras
de um tema comprado. A guarda abortava o build por causa de regras que a purga
apaga em seguida.

### Dois arquivos com acento quase viraram 404

O primeiro relatório listou 19 imagens "sem nenhuma referência". Dezessete são
peso morto de verdade. As outras duas — `Patrícia-Azevedo.jpg` e
`Paulo-Mélega.jpg`, do ebook — **estão em uso**, e o que não funcionava era o
regex da ponte: `[A-Za-z0-9._%\-/]+` parece cobrir nome de arquivo e não cobre os
deste site. As duas não eram copiadas, e não entravam na lista de faltantes
porque não eram sequer vistas. Passou a ser "tudo menos delimitador".

A lição não é sobre acentos: **classe de caracteres permitidos é uma suposição
sobre os dados**; classe de delimitadores é um fato sobre o formato.

## O `import.meta.glob` custou 8,5 MB que ninguém pediu

[`src/imagens.ts`](../src/imagens.ts) resolve `/images/almenat.png` para o módulo
otimizado com um `import.meta.glob` eager. É o que permite os **183 caminhos de
`src/data/` continuarem strings** — sem ele, adotar o pipeline significaria
trocar cada `logo: '/images/…'` por um `import`, que é exatamente o contrário da
regra "dado não é markup".

O preço apareceu na medição: o Vite **emite todo arquivo importado**, usado ou
não. As 198 imagens foram parar em `dist/_astro/`, 8,5 MB duplicados ao lado da
ponte. O `dist/` foi de 9 MB para 25 MB.

A purga do que ninguém referencia entrou no mesmo script, pelo mesmo critério do
CSS. Não é gambiarra: é a contrapartida honesta de um mapa que existe para
manter o dado simples.

## `quality: 80` fazia o AVIF ser 50% maior que o WebP

A primeira medição do pipeline pareceu dizer que AVIF não valia a pena:

| largura | AVIF q80 | WebP q80 |
|---|---|---|
| 640 | 96 KB | 62 KB |
| 1280 | 292 KB | 197 KB |
| 2048 | 585 KB | 415 KB |

A conclusão estava errada, e o erro é instrutivo: **`quality` não é uma escala
comum entre codecs.** 80 em AVIF pede muito mais fidelidade do que 80 em WebP, e
comparar os dois no mesmo número compara duas coisas diferentes.

[`scripts/medir-imagens.mjs`](../scripts/medir-imagens.mjs) refaz a pergunta pela
fidelidade, com pixelmatch contra o original — a mesma métrica do
`verify-icones.mjs`, e pelo mesmo motivo: ela responde "dá para ver?", que é a
pergunta. Em foto, retrato e logo chapado:

| | q40 | q50 | q80 |
|---|---|---|---|
| AVIF (hero 1080px) | 59 KB, 0,08% | **87 KB, 0,00%** | 225 KB, 0,00% |
| WebP (hero 1080px) | 80 KB, 0,18% | 93 KB, 0,04% | 150 KB, 0,00% |

**50 é o piso medido**, não um chute conservador: abaixo dele aparece diferença
perceptível, acima só aumenta o arquivo. Resultado no hero da home: 646 KB de
JPEG viram 36 KB no mobile e 113 KB em 1280px.

E o teste teve o próprio defeito de método: a primeira versão comparava com
`removeAlpha()`, o que confronta os RGB de pixels **transparentes** — cada codec
os preenche como quer. O logo aparecia com 6% de diferença em toda qualidade de
WebP, número que não mudava com `quality` justamente porque não era compressão.
Achatar sobre branco compara o que o olho vê.

### Um formato a menos

`formats={['avif']}` com `fallbackFormat="webp"`, e não a escada de três que o
`<Picture>` monta por padrão. O alvo do projeto é Safari 15.4+ / Chrome 105+: o
AVIF cobre Chrome 105+ e Safari 16.4+, e o WebP cobre o resto do alvo desde o
Safari 14. A escada de JPEG só seria baixada por navegador fora do alvo, e
custava 1,9 MB de `dist/` só no hero do catálogo.

## O `sizes` não é opcional de fato

Com `escala="largura-total"` e sem `tamanhos`, o navegador assume `100vw`. O hero
do catálogo vive dentro de 60rem, então ele baixava a variante de 1440px para uma
caixa de 862px — pipeline inteiro montado, e ainda assim o dobro do necessário.

A regra que ficou registrada no catálogo: **se a imagem não ocupa a largura da
janela, diga a largura que ela ocupa.**

## Orçamento de performance: catraca, não teto

[`tests/verify-orcamento.mjs`](../tests/verify-orcamento.mjs) é o quarto portão
duro previsto no plano, e o que faltava. Sem o diff visual como critério, nada
impedia o site de ficar mais bonito e mais lento ao mesmo tempo — comportamento e
geometria passam felizes com um hero de 646 KB.

Teto único não serviria: reprovaria a home e liberaria a 404 no mesmo número.
Cada página tem a própria linha de base em `tests/orcamento.json`, e o que
reprova é **engordar** acima de 5%. Página migrada emagrece, a base é regravada
mais apertada, e o peso nunca volta.

A primeira execução mediu errado, e o defeito é o mesmo de sempre — medir a
ordem em vez do objeto: com um contexto de navegador por viewport, a segunda
página em diante herdava CSS, JS e fontes do cache, e só a `index` aparecia com
67 KB de CSS. Passou a ser um contexto por página, que é também o caso real de um
visitante novo.

A linha de base inicial, com o tema ainda em 40 páginas:

| página | peso | imagem |
|---|---|---|
| `index` (e as duas traduções) | 4,4 MB | 4,3 MB |
| `ebook` | 1,1 MB | 1,0 MB |
| `associe-se` | 770 KB | 744 KB |
| `404` | 100 KB | 5 KB |
| `design` (a única migrada) | **78 KB** | 0 KB |

Os 67 KB de CSS do tema contra os 23 KB do design system aparecem em toda linha.

## Dezessete imagens que ninguém pede

O relatório da ponte separa "já pelo pipeline" de "sem nenhuma referência". A
segunda lista tem 17 arquivos, ~460 KB, que **nenhuma página, nenhum dado e
nenhum CSS mencionam**: `logo.png`, `logo.svg`, dois de `publicacoes/`, onze de
`parceiros/` e quatro de `associados/`.

Ficaram no repositório de propósito — remover conteúdo é decisão de quem edita o
site, não da migração. `DETALHE=1 node scripts/imagens.mjs` lista os nomes.

# Etapa 3 — padrões

Nove composições estavam previstas; foram entregues **dez**, e o décimo explica a
etapa melhor que os outros nove. O `.item-link` do tema — "Saiba mais >" — aparece
dentro da chamada de ação, do cartão de publicação e do cartão de modalidade. Sem
componente, os três repetiriam a mesma marcação **e o mesmo hover**, que é
justamente a parte que este projeto aprendeu a não inventar.

| padrão | substitui | usos no site |
|---|---|---|
| [`CartaoMembro`](../src/components/padroes/CartaoMembro.astro) | `.team-member` | 124 |
| [`ChamadaAcao`](../src/components/padroes/ChamadaAcao.astro) | `.call-to-action`, 3 superfícies | 51 |
| [`CaixaIcone`](../src/components/padroes/CaixaIcone.astro) | `.icon-box.small.clean` | 36 |
| [`CartaoPublicacao`](../src/components/padroes/CartaoPublicacao.astro) | `.post-item` | 27 |
| [`LinkAcao`](../src/components/padroes/LinkAcao.astro) | `.item-link` | ~78 |
| [`ListaIcones`](../src/components/padroes/ListaIcones.astro) | `.list-icon-circle` e `-arrow` | 24 |
| [`Hero`](../src/components/padroes/Hero.astro) | `.inspiro-slider` e o Ken Burns | 3 |
| [`FaixaDestaque`](../src/components/padroes/FaixaDestaque.astro) | `.box-fancy.section-fullwidth` | 15 |
| [`Contador`](../src/components/padroes/Contador.astro) | `.counter[data-to]` | 15 |
| [`Abas`](../src/components/padroes/Abas.astro) | `.nav-tabs` e o `tabs()` do `site.js` | 3 |

Os valores saem de [`scripts/medir-padroes.mjs`](../scripts/medir-padroes.mjs),
terceiro da família do `medir-base.mjs` e do `medir-primitivos.mjs`. Ele mede as
nove composições no navegador, nos três viewports, com o **hover incluído** — o
`.item-link`, o LinkedIn do cartão e a aba inativa têm estado, e estado não
aparece no HTML nem no diff visual.

## "Portar os componentes existentes" não cabia nesta etapa

O plano fechava a Etapa 3 com uma linha: *"Portar os componentes existentes para
os primitivos novos."* Ela não foi executada — e não por falta de tempo.
**Fazê-la agora quebraria as páginas do tema.**

`GradeMembros`, `GradeLogos`, `CarrosselAssociados` e `AssociadosTabs` são
renderizados pelas 40 páginas que ainda carregam o `style.css`. Reescrevê-los com
os primitivos novos significa emitir markup que só o design system estiliza — e a
regra número um do projeto é que a folha nova entra pelo frontmatter da **página**
migrada, nunca pelo layout. Portar o componente sem migrar a página o deixaria
sem estilo nenhum.

Ou seja: **portar aqueles componentes é migrar as páginas deles**, que é o que as
Etapas 5–9 fazem. Cada padrão desta etapa é o substituto que já espera:

| componente do tema | vira | etapa |
|---|---|---|
| `GradeMembros` | `<Grade>` de `<CartaoMembro>` | 5 (diretoria) |
| `AssociadosTabs` | `<Abas>` com `<Grade>` dentro | 8 (associados) |
| `GradeLogos` e `CarrosselAssociados` | `<Grade>` de `<Imagem>` | 8 e 9 |

## A superfície escura da marca não era a superfície inversa

`--color-superficie-inversa` valia `#0c101b`, e esse valor tinha sido obtido por
**contagem de ocorrências no markup** — 135 delas. Medindo
`.call-to-action.background-dark` no navegador, a cor é `rgb(0, 30, 108)`: o navy
do site.

As ocorrências do carvão são reais, mas as 141 estão todas nas três páginas do
**ebook**, que tem paleta própria. São duas superfícies escuras com papéis
diferentes, e achatar as duas num token só pintaria a chamada de ação de
preto-azulado sem que ninguém tivesse pedido. Entrou `--color-superficie-marca`.

É o mesmo erro de método que a Etapa 1 encontrou em `--color-acao-primaria`
(`#0c71c3` por contagem, `#2250fc` medido no `.btn`). **Contar no HTML continua
não sendo medir.**

## O `:where()` que zerava a própria regra

O `base.css` tinha, desde a Etapa 0:

```css
:where(.superficie-inversa) :where(p, li, small) { color: inherit; }
```

A intenção: dentro de uma seção escura o parágrafo herda a cor da seção em vez do
cinza `#525e75`, que sobre navy dá 1,5:1. **A regra nunca valeu.** `:where()` zera
a especificidade do que está dentro dele, então o seletor inteiro pesa `0-0-0` e
perde para o `p { color: var(--color-texto-paragrafo) }` de vinte linhas acima,
que pesa `0-0-1`.

Nada acusou: o diff visual não tem seção escura para comparar (o `/design` não
existe no site original), a varredura de geometria não lê cor, e a checagem de
contraste que o plano prevê ainda não está implementada. **Apareceu numa captura
de tela da chamada de ação escura** — cinza sobre navy, medido em
`rgb(82, 94, 117)` sobre `rgb(0, 30, 108)`.

A classe saiu do `:where()` e passou a carregar o peso (`0-1-0`); a lista de
elementos continua dentro dele, barata, para que um componente consiga sobrepor
quando quiser. O mesmo valia para a regra irmã do `a[href]`.

Vale como aviso geral: **um seletor inteiramente dentro de `:where()` só vence o
padrão do navegador.** Contra qualquer declaração de tipo, ele perde.

## O véu, o `z-index` e a lição de sempre

A quarta armadilha do tema seria fácil de reintroduzir. O `.bg-overlay` era uma
camada com `background: rgba(0,0,0,0.59)` **e** `opacity: 0.5` — e opacidade de
camada esmaece também o que estiver dentro dela. O `.kenburns-bg` tinha
`z-index: -1` e dependia de um contexto de empilhamento que o flickity criava;
sem o plugin, o zoom parou de acontecer sem quebrar nenhum teste.

Nos padrões novos não há `opacity` de camada nem `z-index` negativo: a foto é um
filho posicionado por `inset: 0`, o véu vem depois dela e o conteúdo depois do
véu — a ordem do documento faz o empilhamento. `--color-veu` carrega a
transparência na própria cor, com o valor **medido no efeito final** (0,295,
arredondado para 0,3).

## Três coisas que dependiam do JavaScript e não deviam

Nenhuma era bug conhecido. As três apareceram ao reescrever o padrão:

1. **O número do contador não existia sem script.** O markup era
   `<span data-to="83"></span>` — vazio. Quem escrevia o valor era o `counters()`.
   Sem JavaScript, a seção mostrava cinco rótulos sem número: "Resorts
   Associados", "Quartos", "Estados". O dado, que é a única coisa que a seção
   existe para dizer, dependia de uma animação. Agora o valor final é o conteúdo
   do elemento, e a animação apenas conta **até** ele.

2. **As legendas do hero nasciam com `opacity: 0`.** É exatamente a forma da
   regressão que deixou seis páginas deste projeto invisíveis quando o Isotope
   saiu. O `<Hero>` faz a cascata com `animation-fill-mode: both` a partir de um
   quadro transparente: se a animação não rodar, o texto fica visível. A falha
   aponta para o lado seguro por escolha, não por acaso.

3. **`prefers-reduced-motion` zerava a duração e não o atraso.** Bastava enquanto
   ninguém escalonava entradas. O `<Hero>` escalona três, em 1s, 1,35s e 1,7s — e
   com `both` o quadro inicial vale durante o atraso. Quem pedisse menos
   movimento ficaria 1,7s olhando para um hero sem título. `animation-delay: 0s`
   entrou na mesma regra do `base.css`.

## O que o catálogo pegou antes de qualquer página

Duas vezes — e é para isso que ele entrou na varredura de geometria na Etapa 1.

A primeira: a `<FaixaDestaque>` com seis blocos num container de 862px deu 144px
por bloco, dos quais 92 eram recuo, e o título saiu **cortado dos dois lados**. A
escada de colunas tinha sido copiada da `<Grade>` (30rem e 48rem), mas as células
da `<Grade>` não têm recuo próprio e as da faixa têm. Duas correções: a escada
passou a esperar 64rem e 80rem para 4 a 6 colunas, e o recuo ganhou teto
proporcional ao bloco — `min(clamp(…), 15%)`, onde os 15% são a proporção
**medida** no desktop (73px num bloco de 489px). Nos casos reais os dois valores
coincidem; o `min` só age quando o bloco é estreito demais para o recuo que a
janela pediria.

A segunda: `"21 mil"` quebrava em duas linhas no `<Contador>`, e cada indicador da
fileira ficava com uma altura diferente, desalinhando os rótulos. O sufixo saiu
para um elemento próprio — em corpo menor, porque em 50px ele competia com o
número — e isso resolveu de passagem um problema que ainda não tinha aparecido: a
animação reescreve `textContent` a cada quadro, o que apagaria qualquer marcação
dentro do mesmo nó.

## Quatro tons novos, e o contraste que eles corrigem

A `<FaixaDestaque>` precisava de cinco cores que só existiam como
`style="background-color: #570A57"` no markup — 24 ocorrências somadas nos três
idiomas. Entraram como primitivas (`--cor-indigo-900`, `--cor-verde-600`,
`--cor-roxo-800`, `--cor-magenta-700`), e o `#efb72c` de `/resorts-brasil` foi
consolidado no `--cor-ambar-500` que `/historia` já usava para a mesma faixa: dois
amarelos a 11 pontos de distância pintando a mesma coisa é ruído, não decisão.

Cada tom semântico traz o **próprio par de texto**, e é aí que está a correção. O
tema escrevia branco sobre todos os cinco fundos:

| fundo | texto do tema | contraste | texto novo | contraste |
|---|---|---|---|---|
| âmbar `#fac213` | branco | **1,6:1** | navy | 9,1:1 |
| verde `#28b055` | branco | **2,9:1** | navy | 5,2:1 |
| índigo, índigo-escuro, roxo, magenta | branco | 7,1:1 a 17:1 | branco | inalterado |

Os dois primeiros reprovam o critério 1.4.3 da WCAG com folga. O par vive no
`tokens.css`, e não dentro do componente, para que a escolha não possa divergir do
fundo: quem passa `tom="ambar"` não tem como pedir texto branco.

## Sangria sem `100vw`

O `.section-fullwidth` do tema somava `width: 100vw` a uma margem negativa. `100vw`
**inclui a barra de rolagem**, então toda página com aquela classe transbordava
alguns pixels na horizontal — e transbordo horizontal é um dos cinco defeitos que
a varredura de geometria procura.

A `<FaixaDestaque>` não tem truque de sangria nenhum: ela ocupa a largura de quem
a contém. Para ir de borda a borda, basta colocá-la dentro de `<Secao>` **sem**
`<Container>`, já que a seção é larga e o container é que estreita. Composição no
lugar de conta.

## O catálogo engordou 62 KB, e está certo

`/design` passou de 78 KB para 140 KB e o orçamento de performance reprovou —
corretamente, porque ele é uma catraca e não sabe distinguir conteúdo novo de
peso desnecessário. A linha de base foi regravada depois de conferir, no
`git diff`, que **só as duas linhas do `/design` mudaram**.

Vale registrar de onde vêm os 52 KB de HTML: cada `<Icone>` embute o caminho SVG
inteiro, e o catálogo agora desenha o mesmo chevron cerca de dez vezes. Numa
página de conteúdo isso não se repete assim; se algum dia repetir, a saída é um
sprite com `<use>` — não vale antecipar.

# Etapa 4 — conteúdo

Duas coleções, 9 itens, 27 blocos de markup a menos. O schema está em
[`src/content.config.ts`](../src/content.config.ts), os dados em
[`src/content/`](../src/content/), e quem resolve idioma e ordem é
[`src/conteudo.ts`](../src/conteudo.ts).

## O número do plano estava errado, e pelo motivo de sempre

O plano dizia "publicações (7)". São **5**. O 7 é a contagem de arquivos em
`src/assets/imagens/publicacoes/`, e duas daquelas capas não são referenciadas
por página nenhuma — `impacto-ibs-cbs-2023.jpg` e
`importancia-socioeconomica-do-turismo-2023.jpg`, que já apareciam na lista de 17
imagens órfãs da Etapa 2.

É o terceiro caso do mesmo método: contar artefatos e supor que a contagem
descreve o conteúdo. Antes foram as 123 ocorrências de `#0c71c3` (todas do ebook,
nenhuma botão) e as 141 de `#0c101b` (idem). Agora, duas capas sem publicação.

## Por que YAML, e por que um arquivo por coleção

O `file()` loader do Astro lê JSON, YAML ou TOML e devolve um item por elemento
do array. YAML porque um mapa de traduções em YAML se lê como uma tabela, e
porque não há corpo de texto para justificar Markdown — o `resumo` é uma linha, e
traduz, então não poderia ser o corpo de um `.md` de qualquer forma.

Um arquivo por coleção, e não um por publicação, porque é assim que o resto do
projeto guarda dado: `src/data/associados.ts` tem os 78 resorts num arquivo só.
Nove itens em dois arquivos ficam legíveis; nove arquivos de dez linhas, não.

## O campo que às vezes traduz

Publicação e estudo têm, no mesmo item, campos que traduzem (título, resumo) e
campos que não (URL do PDF, capa). E o título nem sempre traduz: dois dos quatro
estudos foram publicados só em português, e o "Radar Resorts Brasil Jul/25" é
nome próprio.

É o mesmo problema que o `cargo` do [`diretoria.ts`](../src/data/diretoria.ts) já
tinha resolvido — cargo de diretoria traduz, empresa de conselheiro não —, e a
solução é a mesma:

```ts
const traduzivel = z.union([z.string(), z.object(porIdioma)]);
```

`porIdioma` é declarado como `Record<Locale, z.ZodString>`. Isso amarra o schema
ao `src/i18n/ui.ts`: **um quarto idioma no projeto para de compilar aqui**, em vez
de gerar três páginas com um campo vazio. E quando o campo é mapa, os três
idiomas são obrigatórios — "esqueci de traduzir" vira erro de build.

## A coleção que existe por causa de um defeito real

Os dois estudos mais recentes — a Cartilha Executiva da Reforma Tributária e a
Pesquisa de Canais de Distribuição — foram acrescentados direto no markup das
três páginas. A tradução ficou pela metade: as páginas inglesa e espanhola
passaram a ter **dois cartões dizendo "Leia agora"** e dois dizendo "Read now" /
"Lea ahora", lado a lado.

Não é descuido de quem editou; é o que acontece quando a mesma informação existe
em 27 lugares. O rótulo agora vem do `ui.ts`, onde ele é um só por idioma.

## O `alt` era o nome acessível do link, e ninguém tinha percebido

Nas páginas de publicações, as capas tinham `alt="capa"`. Como a imagem é o único
conteúdo do `<a>` que a envolve, esse texto **é** o nome acessível do link: quinze
links diferentes, todos anunciados como "capa". Nas páginas de estudos era pior
de outro jeito — o `alt` era descritivo, mas em português nas três traduções.

O `alt` passou a ser o título da publicação, nos dois casos. Não muda pixel, e
some na Etapa 7: no `<CartaoPublicacao>` o título é que carrega o link, e a capa
volta a ser decorativa com `alt=""`.

## O espaço que o Astro come

`{t.leiaAgora} <i class="icon-chevron-right" />` gera `Leia agora<i>`, sem o
espaço: o Astro apara o espaço em branco em volta de uma expressão. O chevron
ficou colado na palavra nas seis páginas.

Quem pegou foi a **comparação de HTML normalizado**, antes de qualquer captura de
tela — o método que o [CLAUDE.md](../CLAUDE.md) manda usar ao extrair markup para
componente. Vale acrescentar à lista de coisas que só ele pega, ao lado dos 11
`<div class="line">` e dos `</div>` do carrossel: **espaço em branco significativo
ao lado de expressão**. A correção é `{t.leiaAgora}{' '}`.

## Uma divergência antiga que só agora foi medida

O diff visual das seis páginas deu 17/18. A que sobra, `/publicacoes` no mobile,
**não é desta etapa**: reconstruí os builds da Etapa 2 e da Etapa 3 e os três dão
o mesmo 9,06% com +47px de altura.

A causa está no `gridLayout()` do [`site.js`](../src/scripts/site.js), o
substituto do Isotope. Medido nos dois lados, os cartões têm largura, altura e
coluna idênticas; o que muda é o empilhamento a partir do terceiro, 23px por
cartão. O Isotope punha `margin: 0 -30px -30px 0` na grade e absorvia parte do
recuo inferior do item; o nosso empilha pela altura cheia.

Não foi corrigida, e a razão é de sequenciamento: `gridLayout()` desaparece na
Etapa 7, quando publicações e estudos passarem a usar `<CartaoPublicacao>` dentro
de `<Grade>` — grade CSS, sem empacotamento em JavaScript. Está registrada em
[deltas-visuais.md](deltas-visuais.md) como pendência com prazo: se a Etapa 7 não
zerar, vira regressão.

Vale a nota de método: a Etapa 2 registrou "as seis páginas idênticas, incluindo
`publicacoes`". A divergência já existia. O que aquela rodada não fez foi separar
os viewports no relato — ela é só do mobile.

## O `z` mudou de porta no Astro 6

`import { z } from 'astro:content'` está deprecado; o Astro 6 empacota Zod v4 e o
reexporta em `astro/zod`. Continua funcionando, mas enche o `astro check` de
avisos — e `z.string().url()` também saiu, em favor de `z.url()`. Os dois estão
atualizados no schema.

---

# Design system — Etapa 5

## A prop `legado` não podia funcionar, e nenhuma página tinha usado

O plano previa um mecanismo simples para conviver com o tema: uma prop `legado`
no `BaseLayout`, `true` por padrão, decidindo se a página recebe os `<link>` de
`plugins.css` / `style.css` / `ajustes.css`. Estava lá desde a Etapa 0.

**Nenhuma das 40 páginas passou essa prop, nunca — e não podia.** O mesmo
`BaseLayout` renderiza `Header` e `Footer`, que são markup do tema estilizado
pelo `style.css`. Passar `legado={false}` entregaria uma página sem cabeçalho,
sem rodapé, sem faixa de cookies e sem botão de voltar ao topo. O catálogo
`/design` contorna isso não usando o `BaseLayout`, e o comentário no topo dele
sempre disse por quê — mas a consequência não tinha sido tirada: **não existia
Etapa 5 antes de existir cromo**.

Trocar a prop por um `if` no layout também não serve, e o motivo é o mesmo que
derrubou a primeira tentativa da Etapa 0: **o Astro empacota CSS pelo grafo de
módulos, não pelo que a página renderiza.** Bastaria o `BaseLayout` *importar*
`Cabecalho.astro` — mesmo dentro de um ramo que nunca executa — para o `<style>`
dele entrar no bundle das 40 páginas do tema, e a invariante de isolamento
reprovaria o build. Com razão.

Então a escolha subiu um nível: **dois layouts em vez de uma prop.**

| arquivo | quem usa |
|---|---|
| [`Cabeca.astro`](../src/layouts/Cabeca.astro) | os dois — meta, canonical, hreflang, Open Graph, JSON-LD, fonte, consentimento |
| [`BaseLayout.astro`](../src/layouts/BaseLayout.astro) | as 30 páginas que ainda não migraram |
| [`LayoutSistema.astro`](../src/layouts/LayoutSistema.astro) | as 10 migradas |

É mais forte do que a prop era: uma prop dá para esquecer, um layout errado
entrega uma página sem cabeçalho na primeira vez que você olha. O `Cabeca.astro`
**não tem `<style>`**, e isso é requisito e não acaso — um bloco de estilo ali
voltaria a atravessar as duas camadas.

## `cromo/` — a quarta camada, e por que ela não é nenhuma das três

`Cabecalho`, `Rodape`, `FaixaCookies`, `IconesSociais` e `VoltarAoTopo` não
couberam em `primitivos/` (não compõem nada), em `layout/` (não são ortogonais
entre si) nem em `padroes/` (aparecem uma vez por página, sempre no mesmo lugar).
São o que embrulha toda página, e ganharam diretório próprio.

`verifica-sistema.mjs` passou a cobrir `cromo/` no mesmo portão que já cobria as
outras três: componente que não aparece no `/design` reprova o build.

**Os nomes de estado continuam sendo os do tema, e isso é decisão, não inércia.**
`#mainMenu`, `#mainMenu-trigger`, `.p-dropdown`, `.dropdown-active`,
`.toggle-active`, `.mainMenu-open`, `.modal-active`, `#scrollTop`,
`.cookie-manage` — um [`site.js`](../src/scripts/site.js) só serve as duas
camadas durante a migração. Dois scripts divergiriam na primeira correção, e a
divergência apareceria em produção, num lado só.

A exceção é o seletor de idioma: o gatilho virou `<button>` (ele abre um menu,
não navega), e o `languageDropdown()` do `site.js` procura `.p-dropdown > a`. O
comportamento novo entrou num `<script>` dentro do `Cabecalho.astro` — que o
Astro empacota junto da página que usa o componente, então ele não chega nas 30
páginas do tema.

## O checador de headings lia o fonte, e parou de funcionar nos dois sentidos

A checagem de hierarquia do `verifica-sistema.mjs` procurava `<h[1-6]` nos
arquivos `.astro`. Na primeira página migrada ela quebrou duas vezes:

- **falso positivo**: as duas primeiras páginas reprovaram por causa dos
  **comentários**. O texto que documenta a correção cita `<h1 class="text-md h2">`
  e `<h3>`, e um regex não distingue documentação de markup;
- **falso negativo**, e este é o grave: página migrada não tem `<h1>` no fonte,
  tem `<Titulo nivel={1}>`. A checagem não via heading nenhum e dava a página por
  boa. Pior ainda: o cromo também emite headings — os títulos das listas do
  rodapé —, então **o sumário real da página nunca esteve no arquivo dela**.

A resposta é a mesma que este projeto já deu para o CSS, para as cores e para as
imagens: **medir no artefato em vez de ler a intenção.** A checagem passou a ler
o `dist/`, com comentários, `<script>` e `<style>` removidos antes. Sem `dist/`
ela não roda — não há aproximação possível a partir do fonte, e uma aproximação
que erra nos dois sentidos é pior do que a ausência.

De quebra, `migrada` também passou a sair do artefato (carrega bundle do Astro e
não carrega o CSS do tema) em vez da lista `MIGRADAS`. Uma página que alguém
esqueça de acrescentar à lista deixa de escapar das checagens por isso.

## O defeito que passou pelos quatro portões, e foi achado olhando

Na página de contato em 390px, o `contato@resortsbrasil.com.br` saía da própria
coluna e passava por cima do texto da coluna vizinha. **Nenhum portão viu.**

Não há caixa zerada, não há grade colapsada, não há transbordo horizontal da
página, e a checagem de irmãos sobrepostos compara **caixas** — as caixas
estavam exatamente onde deviam; quem vazava era o conteúdo dentro delas. E-mail,
URL e telefone são tokens sem ponto de quebra natural, e este site é feito deles.

Duas coisas mudaram por causa disso:

1. **`overflow-wrap: break-word` no `body`** ([base.css](../src/styles/base.css)).
   `break-word` e não `anywhere`: o primeiro só quebra quando a palavra não
   caberia de jeito nenhum.
2. **A varredura de geometria aprendeu a ver isso** — checagem 6,
   `scrollWidth > clientWidth` em elementos de texto. Confirmada por teste
   negativo: replantando o estado anterior, ela acusa
   `p — 208px de conteudo em 125px: "contato@resortsbrasil.com.br"`.

A checagem nova reprovou o catálogo na primeira execução, e o falso positivo é
instrutivo: um `<li>` de menu com submenu `position: absolute` "vaza" pelos 230px
do submenu enquanto o item mede 118. O popup existe justamente para sair da
caixa. Elemento fora do fluxo passou a ser exclusão explícita.

## Dois valores medidos que só faziam sentido um por causa do outro

A `<CaixaIcone>` carregava `margin-bottom: 3.125rem`, e os 50px são reais — no
tema a caixa vivia dentro de uma `.row` de colunas coladas, e aquela margem era a
única coisa separando uma linha de caixas da seguinte. **O valor estava certo e o
lugar, errado.** Dentro de uma `<Grade>`, quem separa é o `gap`, e a margem passa
a sobrar embaixo da última linha, por dentro do container.

A página de contato ficou com 55px de respiro em cima e 95 embaixo. Nenhum portão
viu — assimetria não é caixa zerada, nem transbordo, nem sobreposição.

O `p-t-100` do tema naquela mesma caixa existia **para compensar essa margem**.
Removida a margem, o recuo próprio da `<ChamadaAcao>` já fecha a caixa simétrica,
46/34, os dois medidos. Dois valores medidos que se anulavam.

A regra que fica: **espaço entre irmãos é do container, não do filho** — a mesma
que a `<Secao>` e a `<Grade>` já seguiam.

### E uma nota de cascata que vale guardar

A tentativa de manter os 100px com `class="pt-secao-lg"` **não funciona**. O
`<style>` de um componente Astro não está em `@layer`, e utilitária em
`@layer utilities` perde para regra sem camada. A prop `class` de um padrão serve
para acrescentar, não para sobrepor o desenho dele.

## O piso de colunas depende do que há dentro da célula

A `<Grade>` faz 4 e 6 colunas começarem em **duas** na menor largura, e a razão
está escrita no componente: cartão de associado e logo de parceiro ficam pequenos
demais empilhados um por linha. Vale para cartão e logo. Não vale para texto — na
página de contato, aquele piso pôs e-mails de 28 caracteres em células de 150px.

Entrou a prop `piso`, e ela mora numa consulta de **largura máxima** de propósito:
`.colunas-4.piso-1` pesaria `0-2-0` e venceria as consultas de 30rem e 48rem, que
pesam `0-1-0` — a grade ficaria presa numa coluna em qualquer largura. Escrita
como `@container (max-width: 29.9375rem)`, as duas escadas não se encontram.

## A suíte comportamental testava a camada nova achando que testava a antiga

`verify-behaviors.mjs` usava `/historia.html` como página de referência para
tudo: menu, seletor de idioma, cookies, glifos. Aquela página migrou nesta etapa.

Enquanto as duas camadas convivem, **o que é cromo roda nas duas** — e não é
zelo: os dois cabeçalhos são dirigidos pelo mesmo `site.js`, e essa é a aposta
que sustenta a migração inteira. A suíte foi de 14 para **51 checagens**, com
`PAGINA_TEMA` e `PAGINA_SISTEMA` no topo. `PAGINA_TEMA` some na Etapa 11.

O teste de glifos mudou de página pelo motivo oposto: as três webfontes servem só
as páginas não migradas, e rodá-lo numa migrada mediria tofu contra tofu e
passaria sempre.

## O contraste do ouro, e o que não tem solução bonita

O item destacado do menu era `#d39e00` sobre branco (**2,42:1**) e
`rgb(211,180,4)` sobre o azul da topbar (**2,84:1**) — dois `style=` inline, a 11
pontos um do outro, e os dois reprovando o critério 1.4.3 da WCAG, que pede 4,5:1.

**Nenhum ouro que ainda pareça ouro passa sobre branco.** A decisão foi por faixa:
no menu, o âmbar escurecido até `#8f6a00` (**4,96:1** medido); na topbar, o item
deixa de ser dourado e fica branco como o irmão ao lado (**5,80:1**),
distinguido por peso.

Escurecer um ouro o aproxima do marrom, e isso é uma perda real. A alternativa —
transformar "Fale conosco" num botão de fundo âmbar com texto navy, usando o par
`--color-acento-ambar` que já existe e mede 9,1:1 — preserva melhor a intenção de
marca e muda mais o desenho do menu. Ficou registrada em
[deltas-visuais.md](deltas-visuais.md) em vez de tomada sozinha.

## Onze cores e duas sombras que só existiam medidas

`scripts/medir-cromo.mjs` é o quarto da família, e o primeiro que precisou medir
**estado aberto**: menu mobile, submenu de desktop e seletor de idioma não têm
geometria em repouso, e a faixa de cookies nasce `hidden`. Sem `preparo` no
navegador, os três medem zero.

O que ele achou, e que nenhuma leitura de CSS daria:

- as **quatro cores de rede social** do rodapé são cores de marca de terceiros
  (`#5d82d1`, `#e53d00`, `#238cc8`, `#ef4e41`), e são as únicas do sistema que não
  respondem a uma decisão nossa — viraram primitivas próprias, sem consolidar;
- o fundo do rodapé é `rgb(249,249,250)` e o `.background-grey` é
  `rgb(247,249,252)`: **dois pontos de distância, ruído**, consolidados. A faixa
  de copyright é `rgb(241,241,243)` — **oito pontos**, e existe justamente para se
  distinguir do rodapé acima. Ganhou token próprio;
- as duas sombras dos menus suspensos. São tokens também por um motivo mecânico:
  cor de sombra se escreve em `rgb()`, e cor literal dentro de componente reprova
  o build;
- o cabeçalho **não tem fundo, borda nem sombra** — é transparente sobre o que
  vier abaixo. Contraria a expectativa, e as páginas com hero contam com isso.

E uma variante do `<Botao>` que faltava: os três botões da faixa de cookies são o
`.btn-light` **cheio**. A Etapa 1 leu `.btn-light` no markup, achou os 17 usos com
`.btn-outline` junto e concluiu que a clara era sempre vazada. São 40 páginas de
`clara-solida`, e o repouso dela é exatamente o hover da `clara` — no tema, as
duas são a mesma regra vista de dois lados.

## O título em espanhol que duas páginas escrevem diferente

A faixa dos 20 anos em `/historia` destaca a mesma publicação que a página de
publicações lista. A capa e o PDF passaram a vir da coleção — são fatos que não
podem divergir, e estavam escritos em seis lugares.

**O título não veio junto**, e de propósito: a coleção traz, em espanhol,
`Memorias, sustentabilidad Y una marida hacia el futuro` — "marida" no lugar de
"mirada", com um `Y` maiúsculo no meio da frase. Está preservado lá por decisão
da Etapa 4 (corrigir texto publicado é de quem edita o site). A página de
história sempre exibiu a forma correta, e passar a usar o campo da coleção
**introduziria** o erro numa página que não o tem.

As duas só podem ser conciliadas na Etapa 7, que é quando `/publicacoes` migra.
Até lá o título daquela faixa é copy da página de história e vive no `ui.ts`.

## O `bienio` já existia

Ao separar "Biênio" (traduz, vai para o `ui.ts`) de "2026-2027" (não traduz, fica
em `src/data/diretoria.ts`), a constante foi acrescentada ao fim do arquivo — onde
ela **já estava**, desde antes. O `astro check` pegou na hora.

Nota de método: o arquivo tem 130 linhas e a leitura tinha parado na 60ª, o
suficiente para ver o `cargoEm` e não o resto. Ler o trecho que interessa é
barato; assumir que o resto não existe, não.

---

# Design system — Etapa 6

## A linha tinha 127 caracteres, e ninguém tinha medido

O plano pôs os dois documentos jurídicos nesta etapa com uma frase: "muito texto,
pouca estrutura — valida `base.css`". A medição achou algo mais concreto.

Nas duas páginas o `<p>` é **filho direto do `.row`**, sem nenhum `.col-*`. Ele
herda o container inteiro, e o container do tema tem 1500px. O resultado, medido
com [`medir-documento.mjs`](../scripts/medir-documento.mjs):

| viewport | caixa do texto | caracteres por linha |
|---|---|---|
| mobile (390) | 358px | 38 |
| tablet (768) | 688px | **75** |
| desktop (1440) | 1141px | **127** |

A faixa em que se lê sem perder a linha é 45–75. O desktop entregava o dobro do
teto — e o valor que corrige isso não precisou ser escolhido: **é o do tablet**.
688px é a caixa que a mesma página já produz numa tela estreita, e é onde ela
mede exatamente 75. Virou `--container-texto`, e é o que a `largura="estreita"`
do `<Container>` passa a valer.

Aquela prop apontava para `max-w-3xl`, um padrão do Tailwind. Mesma classe de
valor que já pôs o container em 1140px quando o real eram 1500 — um número que
parece razoável, escrito por quem não mediu. Ninguém tinha usado a prop ainda, o
que é a única razão de a correção ter saído de graça.

Nota de método: o script mede caracteres por linha com um `<canvas>`, medindo o
"0" na fonte computada do próprio elemento. Não dá para derivar isso do CSS —
`ch` depende da fonte real, e a fonte real depende de a Poppins ter carregado.

## O componente de prosa não redefine nada, e é isso que ele faz

O [`<Prosa>`](../src/components/padroes/Prosa.astro) responde por três coisas —
o vão entre capítulos, a citação e a cor da lista — e deliberadamente por mais
nenhuma. Tamanho, peso e cor continuam vindo do `base.css`.

A tentação é óbvia: um componente chamado "prosa" quer declarar tipografia. Mas
isso criaria uma **segunda base**, com valores que ninguém mediu, competindo com
a que a Etapa 0 mediu no navegador — e as duas páginas de texto são justamente
o teste de que a primeira está certa. Um componente que sobrepõe o `base.css`
aqui apagaria a única evidência que a etapa produz.

O mesmo raciocínio vale para a largura: quem limita a linha é o `<Container>`.
São dois eixos — o container decide onde a coluna começa e termina, a prosa
decide como o texto respira dentro dela. Misturá-los faria o padrão disputar
largura com a camada `layout/`, que existe exatamente para isso não acontecer.

### O detalhe de mecânica que faz o componente funcionar

Todos os seletores do `<style>` são `:global()`, e não por preguiça. O Astro
escopa o CSS marcando os elementos que o **próprio componente** renderiza; o
conteúdo de um `<slot>` é renderizado pela página, então carrega o escopo dela.
Um `.prosa h2 {}` simples não casaria com nada — sem erro, sem aviso, sem estilo.
O `.prosa` fica fora do `:global()` de propósito: é ele que carrega o escopo e
limita o alcance.

## O vão entre capítulos era um `<div>` vazio, 22 vezes

O tema separava as seções com `<div class="space"></div>` — 60px medidos, iguais
nos três viewports, repetidos à mão entre cada capítulo das duas páginas.

Passou a ser a `margin-top` do próprio título. A diferença não é de aparência, é
de durabilidade: um `<div>` de espaçamento é uma instrução de desenho escrita
dentro do conteúdo. Ele some quando alguém move um parágrafo, e não volta
sozinho. A margem do heading acompanha o heading.

O `<hr class="space">` da seção de cookies caiu junto, e esse tinha uma
particularidade: media **26px no mobile, 36 no tablet e 60 no desktop** — três
valores, por duas media queries do `ajustes.css`. O documento usa um só, e é o
menor degrau nomeado da escala (40px), porque subseção não deve soar tão alto
quanto capítulo. É um refino, e está classificado como tal.

## A tabela de cookies transbordava, e nenhum portão reclamava

Medida em **445px de largura dentro de uma coluna de 358px**, no viewport de
390px. Quatro colunas não cabem, e a página inteira ganhava barra de rolagem
horizontal — uma das 53 pendências que a varredura de geometria listava.

A correção é uma `<div>` com `overflow-x: auto` em volta, e com ela veio um
detalhe que é fácil não fazer: **`tabindex="0"` no contêiner rolável**. Sem isso,
quem navega por teclado não tem como rolar a tabela na horizontal — o foco pula
direto para o próximo link, e as colunas da direita ficam inalcançáveis. Com
`role="region"` e um nome vindo do `<caption>`, o leitor de tela ainda anuncia
onde a pessoa entrou.

Vale registrar o que a tabela ensinou sobre cor: o `.table` do tema pinta o texto
em `#3c4043`, um cinza que **não existe em nenhum outro lugar do site** e cujo
papel é exatamente o do parágrafo. Consolidado em `--color-texto-paragrafo`, pelo
mesmo critério que consolidou o `#efb72c` no âmbar na Etapa 3.

## O portão reprovou o commit que consertava o defeito

O `verifica-sistema.mjs` abortou o build com duas falhas:

```
FALHA  src/pages/politica-de-privacidade.astro  1 style= inline em pagina migrada
FALHA  src/pages/termos-de-uso.astro            1 style= inline em pagina migrada
```

As duas páginas não têm `style=` inline nenhum. O que elas têm é um **comentário**
explicando que as listas eram `<ul style="color: …">` — exatamente o markup que
aquele commit removeu.

**É a segunda vez que isso acontece, com a mesma forma.** Na Etapa 5 o checador
de headings reprovou as duas primeiras páginas migradas porque os comentários
delas citam `<h1 class="text-md h2">` para explicar a correção. Um projeto que
documenta o defeito ao lado do conserto vai citar markup em comentário o tempo
todo; quem precisa saber a diferença é a checagem.

A resposta foi extrair `linhasSemComentario()`, que apaga comentário de bloco,
de linha e de HTML preservando a numeração, e passar as duas checagens por ela —
o `semCorLiteral` já tinha metade disso escrita à mão, dentro dele. Uma função,
duas checagens, e a próxima nasce com o problema resolvido.

## A política de privacidade inglesa tinha um capítulo em espanhol

O capítulo "Applicable law and jurisdiction" da página inglesa estava **em
espanhol**, palavra por palavra o mesmo parágrafo da página espanhola. E o
capítulo anterior, "Changes to this policy", trazia o **texto do foro** — o
parágrafo sobre controvérsia e jurisdição, que é o do capítulo seguinte.

Lidas juntas, as duas falhas são uma só: alguém colou o parágrafo do foro no
lugar do de alterações, e preencheu a vaga que sobrou com o espanhol. O texto
certo do foro existia; estava no capítulo errado. O de alterações nunca foi
traduzido.

**Nenhum dos quatro portões via, e não há portão barato que veja.** Os headings
batem, a contagem de parágrafos bate, a geometria é idêntica, o peso é idêntico.
Um verificador de paridade estrutural entre idiomas — que chegou a ser
considerado nesta etapa — também não pegaria: a estrutura estava certa. Só lendo.

O que dá para tirar disso é mais modesto e mais útil do que um portão novo:
**quando uma etapa toca texto traduzido, ler os três idiomas lado a lado faz
parte da etapa.** Foi assim que a Etapa 4 achou o "Leia agora" em duas páginas
inglesas, e é assim que este apareceu.

## A data que só acertava em dois dos três idiomas

As duas páginas exibiam `12/06/2025` e `21/02/2022` nos três idiomas. Em
português e espanhol, `12/06` é 12 de junho. Para um leitor de língua inglesa,
`12/06` é **6 de dezembro**. A data certa, escrita de um jeito que erra em um
terço do público.

O dia virou dado ISO em [`src/data/juridico.ts`](../src/data/juridico.ts) e cada
idioma o escreve por extenso, com `Intl.DateTimeFormat`. De quebra, as seis
ocorrências viraram duas: atualizar uma política é mexer no texto dos três
arquivos, e a data é a última linha em que alguém pensa.

Uma armadilha no caminho, e ela é silenciosa: `new Date('2022-02-21')` é
meia-noite **UTC**, e formatar isso no fuso do Brasil (UTC−3) devolve **20 de
fevereiro**. O `timeZone: 'UTC'` no formatador não é zelo — sem ele, o dia
exibido mudaria conforme a máquina que rodasse o build.

## O que ficou em `ui.ts` e o que não ficou

A regra do projeto é conhecida: o que traduz vai para o `ui.ts`. Aqui ela
encontrou o primeiro caso em que a resposta literal está errada.

Os dois documentos somam **~1.500 e ~4.000 palavras por idioma**. Pô-los no
`ui.ts` transformaria um arquivo de rótulos curtos — nav, rodapé, cookies,
títulos de página — em um repositório de prosa jurídica, e não resolveria nada:
o texto continuaria existindo três vezes, só que mais longe da página que o
exibe.

O critério que vale, e que o `ui.ts` sempre aplicou na prática, é outro: **o que
se repete entre páginas mora lá; o que existe uma vez mora onde é lido.** Foram
para o `ui.ts` o título e o rótulo da data — que aparecem em duas páginas cada e
já tinham divergido ("Atualizada em" nos termos, "Última atualização:" na
política, mesma informação em duas frases). O corpo dos documentos ficou na
página.

O que substitui o portão automático que o `ui.ts` daria é a comparação de texto
do `<main>` gerado, bloco a bloco, contra o build anterior — 34 → 34 blocos nos
termos, 98 → 100 na política, e cada diferença explicada. Custa segundos e é o
método que o `CLAUDE.md` já prescreve para extração de markup.

## A `<SecaoCookies>` deixou de ser componente de transição

Ela existia emitindo markup do tema (`.row`, `.table-bordered`, `.text-bold`),
como a `ListaPublicacoes` e a `ListaEstudos` faziam até a Etapa 7. A diferença é que as
**três** páginas que a usam migraram na mesma etapa — então não havia nada a
preservar, e ela foi reescrita direto para o sistema novo.

Ficou em `src/components/`, e não em `padroes/`, de propósito: ela é montagem de
conteúdo a partir de `src/data/cookies.ts`, não uma decisão de desenho. O desenho
mora na [`<Tabela>`](../src/components/padroes/Tabela.astro), que está no
catálogo. O preço é uma linha de `@source` própria em `global.css` — componente
fora dos quatro diretórios não é varrido por diretório.

Há um acoplamento que vale dizer em voz alta: ela **espera estar dentro de um
`<Prosa>`**. É lá que o vão entre as categorias mora, no `margin-top` do `<h3>`.
Fora de um documento, o texto sai certo e o ritmo não. Está escrito no topo do
arquivo.

---

# Design system — Etapa 7

## A Etapa 4 tinha razão, e esta é a prova

A Etapa 4 moveu publicações e estudos para Content Collections e deixou dois
componentes de transição — `ListaPublicacoes` e `ListaEstudos` — emitindo markup
do tema. A justificativa registrada era: "a Etapa 7 também não mexe em dado,
porque o formato que a página recebe já é o formato que o componente consome".

Foi exatamente isso. A migração das seis páginas **não tocou em uma linha de
`src/content/`, de `src/content.config.ts` ou de `src/conteudo.ts`**. Trocou-se
quem consome `publicacoesEm(lang)`: era um componente que escrevia `.post-item`,
passou a ser um `<CartaoPublicacao>` dentro de uma `<Grade>`. Os dois componentes
de transição foram apagados.

Vale registrar porque é a única forma de saber se uma camada de acesso a dados
está no lugar certo: ela prova o valor na etapa seguinte, não na sua.

## A terceira armadilha morreu, e levou dois listeners junto

`.grid-layout` era o masonry do tema — herdeiro do Isotope, reimplementado em
`gridLayout()` quando o jQuery saiu. É onde nasceu a segunda das três armadilhas
do `CLAUDE.md`: `.grid-layout > *` tem `opacity: 0` e só `.grid-layout.grid-loaded > *`
devolve `opacity: 1`; sem o plugin que adicionava a classe, **seis páginas
ficaram com o conteúdo invisível**.

As duas páginas desta etapa eram as duas últimas a usá-la. Com a `<Grade>`:

- `gridLayout()` sai do `site.js`, que cai de 592 para 548 linhas;
- saem com ela os **dois últimos listeners persistentes** que existiam só por
  causa do masonry (`resize` e `load` em `window`), mais um `load` por imagem.
  Isso importa além da limpeza: a nota da Etapa 0 sobre View Transitions listava
  seis listeners persistentes como o custo de instalar o `<ClientRouter />`.
  Restam quatro;
- e some a dependência de o JavaScript rodar para o conteúdo se **posicionar**.
  Grade CSS com `gap` não precisa de ninguém calculando coluna mais curta.

O `.grid-layout` também saiu da lista `GRADES` do `verify-geometria.mjs`, por ter
deixado de existir — e a linha que ele ocupava foi para `.grade`. Ver abaixo.

## O portão que estava cego há seis etapas

A varredura de geometria tem uma checagem de coerência de colunas: numa tela
larga, uma grade com quatro ou mais filhos precisa ter mais de uma coluna. Foi
escrita na Etapa 0.5 para pegar o tipo de defeito que deixou a grade de logos
quebrada com a suíte comportamental passando 14/14.

Ela roda sobre uma lista de seletores, e a lista era
`['.grid-layout', '.team-members', '.grid', '.polo-carousel']` — **os quatro do
tema**. O design system tem grade própria desde a Etapa 1, e em nenhum momento
entre a Etapa 1 e a Etapa 7 aquela checagem olhou para ela. Uma container query
escrita errada — um `min-width` em `px` onde devia ser `rem`, um degrau
invertido — colapsaria a grade de 23 páginas migradas sem que nada reclamasse.

Entrou `.grade`. Passou de primeira nas 123 páginas × viewport, o que confirma o
`colunas={5}` novo mas não muda o argumento: a checagem que não olha para a
camada nova é uma checagem que envelhece junto com a camada velha. **Toda vez que
o design system ganha um contêiner de grade, a lista precisa saber.**

## Cinco colunas, e por que o número não estava no CSS

`<Grade>` aceitava 2, 3, 4 e 6 — divisores de doze, a escala que qualquer sistema
de grade escolhe. Publicações são **cinco**, e o tema as põe numa fileira só.

A alternativa era `colunas={4}`, que deixaria a quinta publicação sozinha numa
segunda linha. Não é refino, é órfã. Entrou o 5, com a escada 2 → 3 → 5.

O interessante é como o número foi obtido. Nas outras grades do tema ele está no
markup (`col-lg-3`, `col-6`) ou no CSS. Nesta **não está em lugar nenhum**: o
`gridLayout()` lê a largura da célula, divide pela largura do contêiner e
descobre a contagem em tempo de execução, posicionando tudo em absoluto. Ler
`.post-5-columns` no `style.css` dá a largura da célula, não o número de colunas
que aquilo produz em cada viewport.

Então o `medir-primitivos.mjs` aprendeu a contar **posições horizontais distintas
entre os itens**. O resultado:

| grade | mobile | tablet | desktop |
|---|---|---|---|
| `.post-5-columns` (publicações) | 1 | 3 | 5 |
| `.post-4-columns` (estudos) | 1 | 3 | 4 |

`colunas={5} piso={1}` reproduz a primeira linha inteira. A segunda fica em
1 → 2 → 4: o tablet passa de 3+1 para 2×2, que é o único desvio da etapa em
contagem de colunas — e é uma fileira mais equilibrada do que a órfã que havia.

## Dois vãos para a mesma fileira, um deles por omissão

A grade de publicações declarava `data-margin="30"`; a de estudos não declarava
nada. E o `CLAUDE.md` já avisava o que isso significa: **`data-margin` vale 20
quando ausente**, não zero. Duas fileiras do mesmo cartão com vãos de 30px e
20px, e a diferença nasceu de um atributo que ninguém escreveu.

Consolidados em `espaco="md"` — os 28px medidos no `.row` do tema. Mesmo critério
que consolidou o `#efb72c` no âmbar e o `#3c4043` no cinza de parágrafo: duas
medidas para o mesmo papel são ruído, não decisão.

## O convite de associação, doze vezes no markup

O bloco que fecha estas páginas — pergunta, frase e dois botões — está escrito à
mão em **quatro páginas por idioma**: publicações, estatísticas, associados e
resorts-brasil. Doze cópias, e a de resorts-brasil já divergiu: vive sobre fundo
escuro e com outra quebra de linha.

Virou [`ConviteAssociese`](../src/components/ConviteAssociese.astro), com o texto
no `ui.ts`. Seis cópias saíram nesta etapa; as outras seis saem na Etapa 8, e não
há como antecipá-las — o componente emite markup do design system, e a folha nova
só entra por quem usa o `LayoutSistema`.

Ele fica em `src/components/`, e não em `padroes/`, pelo mesmo critério da
`<SecaoCookies>`: é montagem de conteúdo a partir do `ui.ts`, não uma decisão de
desenho. O desenho é a `<Secao>`, o `<Container>`, o `<Titulo>` e o `<Botao>`,
que já estão no catálogo.

Um detalhe do CSS vale nota. No tema os dois botões eram dois `<a>` separados
pelo **espaço em branco do HTML**, e em 390px o segundo quebrava a meio caminho
da linha. `flex-wrap` com `gap` resolve os dois casos e não depende de o
navegador preservar o espaço entre as tags — que é uma das coisas que este
projeto já viu o Astro aparar.

## Um susto que não era defeito

A primeira captura de tela da página de publicações mostrou os cinco cartões
**sem capa** — só o retângulo branco onde a imagem deveria estar. O `<img>`
estava no HTML com `srcset` correto, os arquivos existiam no `dist/`, e o
`naturalWidth` respondia 288 quando o `srcset` só oferece 640, 750 e 828.

Não era defeito. A captura pegou a página entre o `complete` do `<img>` e a
pintura: capturando o elemento sozinho, com folga, a capa aparece inteira. O
`naturalWidth` estranho era leitura no meio da decodificação.

Fica registrado porque o caminho até a conclusão passou por decodificar o AVIF
com `sharp` — que confirmou 640×910 e a capa certa — e porque o reflexo de
"conferir no artefato antes de concluir pela aparência" vale nos dois sentidos:
serviu para não acreditar na captura, do mesmo jeito que serve para não acreditar
no `style.css`.

# Design system — Etapa 8

## O vídeo teria ficado sem estilo, e nenhum portão veria

A armadilha desta etapa não estava no tema: estava na **fronteira** entre as duas
camadas, e é a primeira vez que ela aparece nesse sentido.

O `<YouTube>` emite a fachada de clique-para-carregar, e o CSS dela mora em
[`public/css/ajustes.css`](../public/css/ajustes.css) — a folha do **tema**.
Página migrada não carrega aquele arquivo. Migrar `/resorts-brasil` com o
componente antigo entregaria a fachada sem caixa, sem botão de play e com o
rótulo "Assistir ao vídeo" — que existe para o leitor de tela e deve ficar fora
da tela — impresso por cima da miniatura.

É a mesma forma das três armadilhas do [CLAUDE.md](../CLAUDE.md) — markup que
depende de CSS que não está mais lá — só que pelo outro lado da migração. E
nenhum dos quatro portões a veria com clareza: não há caixa zerada, não há imagem
quebrada, e a checagem de texto vazando só acusaria se o rótulo calhasse de
cruzar uma borda.

A resposta foi um [`<Video>`](../src/components/padroes/Video.astro) próprio, com
`<style>` escopado. O `<YouTube>` **continua existindo** até a Etapa 10, porque as
três páginas de ebook ainda o usam e convertê-lo no lugar poria o `<style>` novo
no bundle das páginas do tema pelo grafo de módulos. Mesma convivência que o
`<GradeLogos>` tem com a `<FaixaLogos>`.

### A regra do `iframe` é `:global`, e é o ponto inteiro

```css
.yt-facade :global(iframe) { width: 100%; height: 100%; }
```

O `<iframe>` não está no arquivo: o [`site.js`](../src/scripts/site.js) o **cria
no clique**, com `document.createElement`, e elemento criado em tempo de execução
não recebe o atributo de escopo que o Astro carimba no markup compilado. Sem o
`:global`, a regra viraria `.yt-facade[cid] iframe[cid]`, não casaria com nada, e
o vídeo entraria com a altura padrão de 150px do iframe — **depois do clique**,
que é onde nenhum teste de carregamento olha.

É a mesma família da nota de `runtimeClasses` no
[`purge-css.mjs`](../scripts/purge-css.mjs): o que o JavaScript cria em tempo de
execução precisa ser declarado para as ferramentas que só leem o código. A suíte
comportamental passou a medir a caixa **depois** do clique, nas duas camadas.

## Classe escopada passada a um componente não vale — quatro regras estavam inertes

Quatro regras desta etapa não estavam valendo, e o sintoma foi zero: nenhum erro,
nenhum aviso, só espaçamento errado que passa por escolha de desenho.

```astro
<!-- em apoie.astro -->
<Grade class="modalidades">…</Grade>

<style>
  .modalidades { margin-top: 1.875rem; }   /* computou 0px */
</style>
```

A classe chega ao HTML — a `<Grade>` a repassa —, mas **sem o atributo de
escopo**. O seletor compilado é `.modalidades[data-astro-cid-xxx]`, e o elemento
tem a classe e não tem o atributo. A regra fica inerte.

As quatro: `.modalidades` numa `<Grade>`, `.fecho` num `<Container>`, `.foto` num
`<Imagem>` e uma colisão de nome (`.faixa` existia na `<FaixaParceiros>` e na
`<FaixaLogos>` ao mesmo tempo).

**A regra que fica:** estilo escopado só alcança elemento que está no template de
quem escreveu o estilo. Para um componente, use utilitária — que é global — ou um
elemento próprio em volta dele. Foi assim que as quatro foram corrigidas, e as
quatro voltaram a medir 30px, 60px, 30px e 30px.

Nada disso apareceu por leitura: apareceu medindo `getComputedStyle` no navegador
depois de olhar uma captura e achar o vão estranho.

## Nome de slot não pode ser dinâmico, e o erro só aparece na geração

A forma óbvia de montar cinco painéis a partir de uma lista de dados é um
`<Fragment slot={regiao.id}>` dentro de um `.map()`.

`astro check` aprova. O Vite compila. E a página **quebra na geração**:

```
ReferenceError: regiao is not defined
```

O Astro extrai os slots nomeados em tempo de compilação, e nessa extração o
`slot=` é avaliado **fora do escopo do callback** do `.map()` — a variável já não
existe. Aconteceu duas vezes na mesma etapa, em componentes diferentes: nas
regiões de `<AssociadosTabs>` e nos três eixos de `/resorts-brasil`.

A saída é ter os nomes **literais** no template e o corpo num componente, para
não virar cinco (ou nove) cópias do mesmo markup: nasceram assim o
[`<PainelRegiao>`](../src/components/PainelRegiao.astro) e o
[`<BlocoEixo>`](../src/components/BlocoEixo.astro).

O preço é que uma região nova exige mais um `<Fragment>`. Por isso o
`<AssociadosTabs>` **aborta o build** se os ids de `src/data/associados.ts`
deixarem de ser exatamente aqueles cinco — sem a guarda, a aba apareceria e o
painel dela sairia vazio, sem erro em lugar nenhum.

## A escada de colunas da faixa de logos já existia

A faixa de mantenedores e parceiros nunca tinha sido medida: o `<GradeLogos>` de
transição emitia o markup do tema, então até aqui ninguém precisou dos números.
Medida ([`medir-padroes.mjs`](../scripts/medir-padroes.mjs), grupo `gradeLogos`),
ela põe:

| classe do tema | mobile | tablet | desktop |
|---|---|---|---|
| `.grid-5-columns` | 2 | 3 | 5 |
| `.grid-6-columns` | 2 | 3 | 6 |

que é, item por item, o que a [`<Grade>`](../src/components/layout/Grade.astro) já
fazia com `colunas={5}` e `colunas={6}` desde a Etapa 1 — **inclusive o degrau de
cinco**, que entrou na Etapa 7 por causa das publicações e que parecia o número
estranho da escala. Duas grades diferentes do tema chegaram na mesma escada por
caminhos diferentes.

### O recuo fica na célula, e é a única vez em que isso é o certo

A `<CaixaIcone>` deixou registrada a regra na Etapa 5: **espaço entre irmãos é do
container, não do filho.** Aqui ela não se aplica, e a diferença é medível: os
40px do `<li>` estão nos **quatro** lados. Isso é o respiro do logotipo dentro da
própria célula, não o vão até o vizinho — margem só embaixo sobra depois da
última linha; recuo simétrico, não.

Daí o `espaco="nenhum"` que entrou na `<Grade>`. Com `gap` somado ao recuo, o
corredor entre dois logotipos daria 96px onde o medido são 80, e o logotipo
encolheria de 130 para 118px no desktop.

## O risco do título precisou do CSS, e não só da medição

O `.heading-text.heading-line` aparece em quatro páginas por idioma e nunca tinha
sido medido. Medido, o `:before` devolveu `left: 0` num título **centralizado** —
o que sugeria uma barra encostada na margem esquerda, e não é o que se vê.

A regra do tema é `left: 0; right: 0; width: 30px` mais `margin: 0 auto` na
variante `.text-center`: o conjunto centraliza, e é por isso que o valor computado
de `left` é zero. O valor estava certo e a leitura dele, errada.

É o caso **simétrico** do que o CLAUDE.md avisa. Lá: não conclua pelo seletor sem
medir. Aqui: não conclua pela medida sem ler o seletor. As duas metades do mesmo
cuidado.

## Três números para o mesmo fato

Os indicadores de `/associados` diziam **83** resorts em português e **80** em
inglês e em espanhol, e a lista de logotipos tem **78**. Três números, cada um
escrito à mão no markup do seu arquivo.

É a forma exata da divergência que este projeto já viu no rótulo "Leia agora"
(Etapa 4) e na lista de parceiros da página inglesa. O valor confirmado é 83; os
78 são os associados com logotipo publicado.

Ficam em [`src/data/associados.ts`](../src/data/associados.ts), e não no `ui.ts`,
porque **número não traduz**. É a mesma divisão do `cargo` da diretoria e da data
de vigência dos documentos jurídicos: o dado fica em `src/data/`, o rótulo fica no
`ui.ts`, e a página junta os dois pelo `id`. A unidade "mil" traduz, e por isso
está no `ui.ts` e não aqui.

Os cinco rótulos, aliás, estavam **em português nas três páginas** — "Quartos",
"Empregos Diretos", "Regiões do Brasil" apareciam assim também em inglês e em
espanhol. A suíte comportamental passou a exigir que os cinco números batam nos
três idiomas, para a divergência não voltar por outro caminho.

## O portão confundiu documentação com markup pela terceira vez

A checagem de isolamento das duas camadas reprovou o `/design` assim que o
catálogo passou a **explicar** por que existe um `<Video>` próprio: aquele texto
cita `public/css/ajustes.css` dentro de um `<code>`, e a checagem procurava a
string solta no HTML.

Terceira vez com a mesma forma — o checador de headings na Etapa 5, o de `style=`
na Etapa 6, e agora este. E a terceira vez que a correção é a mesma: olhar o
artefato pelo que ele **faz**, não pelo que ele contém. Uma folha é carregada por
um `<link href=>`, e é isso que a checagem passou a procurar.

Um projeto que documenta o defeito ao lado da correção vai citar markup o tempo
todo. Quem precisa saber a diferença é a checagem.

# Design system — Etapa 9

## O carrossel da home estava invisível em produção

A Etapa 9 começou medindo o carrossel de logos para reproduzi-lo, e a primeira
medição devolveu isto:

```
.carousel.client-logos
  mobile   358x340   ... opacity=0
  tablet   736x239   ... opacity=0
  desktop  1440x237  ... opacity=0
```

A regra é `style.css:17305`:

```css
.carousel { opacity: 0; visibility: hidden; transition: opacity .3s ease; }
.carousel.carousel-loaded { opacity: 1; visibility: visible; }
```

E quem punha `carousel-loaded` era o init do flickity — `js/functions.js:1179`,
`elem.addClass("carousel-loaded")` —, que saiu com o jQuery. Desde então as três
homes baixavam **70 logotipos em tamanho original para não mostrar nenhum**.

É a **quarta** vez que este projeto encontra a mesma forma: plugin removido, CSS
que dependia dele silenciosamente inerte. As outras três estão no `CLAUDE.md` —
o `.grid-loaded` que deixou seis páginas sem conteúdo, o `z-index` do kenburns
que parou o zoom, e o `.hover-active` dos submenus.

### Por que nenhum dos quatro portões viu

Esta é a parte que vale mais que o defeito, porque cada portão falhou por um
motivo diferente e todos são reproduzíveis:

| portão | por que passou |
|---|---|
| comportamental | comparava o `src` do primeiro `.polo-carousel-item` antes e depois de 8s. O JavaScript reciclava a fila **dentro** do elemento invisível, então o `src` mudava |
| geometria | a lista `GRADES` tinha `.polo-carousel`, e a classe do tema é `.polo-carousel-item`. Um seletor de classe casa o nome inteiro: **nunca casou com nada**, em nenhuma das 41 páginas |
| diff visual | esconde `.carousel.client-logos` de propósito — a posição depende do instante da captura |
| orçamento | o peso não muda: as imagens carregam invisíveis do mesmo jeito, e eram elas o grosso dos 4,4 MB da home |

Duas lições ficam. A primeira é que **um seletor que não casa nada não falha —
ele passa**, e passa em silêncio; `.polo-carousel` estava na lista desde a Etapa
0.5 dando a impressão de cobertura. A segunda é que **uma exclusão de portão
precisa vir com quem cobre o buraco**, e não só com o motivo dela: a linha do
`visual-diff.mjs` que esconde o carrossel é legítima, mas cegava a única
verificação de pixel daquela região sem apontar para nada em seguida.

### O que passou a cobrir

Três verificações novas, e a primeira é literalmente a pergunta que faltava:

- **"carrossel: a faixa está visível"** — `checkVisibility({ checkOpacity: true,
  checkVisibilityCSS: true })`. Rodada contra o build do tema, ela devolvia
  `false`;
- **"carrossel: a faixa anda"** — compara a posição da **caixa** do primeiro
  logotipo, não o conteúdo do DOM. `getBoundingClientRect` já inclui o
  `transform` do ancestral, então não há como passar num elemento parado;
- **"carrossel: a fila está escrita duas vezes"** — a volta só fecha sem emenda
  se as duas metades forem iguais em número.

E `.polo-carousel` saiu da lista `GRADES`, substituído por `.trilho`.

## Não há link nos logotipos, e isso é escolha

O site original punha `<a href="#">` nos 71 logotipos — links que o teclado
percorria para lugar nenhum. A refatoração de 2026 trocou por URLs de verdade, e
elas **nunca funcionaram**: `visibility: hidden` tira o elemento da ordem de
tabulação, então ninguém jamais alcançou nenhuma delas.

Repô-las agora custaria caro por um motivo mecânico. São 70 links dentro de uma
faixa recortada e em movimento: ao tabular, o navegador rola o recorte para
revelar o link focado, e `scrollLeft` **não volta sozinho** quando o foco sai. A
faixa fica deslocada e, quando a animação completa a volta, aparece o vazio
depois do fim da fila. Um listener de `blur` corrigiria — e o ponto desta etapa é
justamente tirar JavaScript dali.

A função não se perde: os 78 resorts estão em `/associados`, cada um com o seu
link, e o botão do `<Hero>` logo acima aponta para lá. A faixa passa a ser o que
sempre foi de fato — uma vitrine — e agora com os nomes legíveis por leitor de
tela, coisa que 71 âncoras vazias não davam.

## A volta fecha sem emenda, e a duplicata não custa rede

A fila é escrita **duas vezes** e a animação desloca a trilha em `-50%`. Com as
duas metades idênticas, a segunda para exatamente onde a primeira começou: ao
reiniciar, o quadro é o mesmo pixel a pixel.

A duplicata custa DOM, e não rede — são os mesmos 70 endereços, com o mesmo
`srcset` e o mesmo `sizes`, então o navegador baixa cada logotipo uma vez. Ela
vem com `aria-hidden` e `alt` vazio, para o leitor de tela ouvir a lista uma vez
só.

A duração precisa do **número de itens**: a trilha anda uma fila inteira por
volta, e um segundo por logotipo (o `data-autoplay="1000"` medido, igual no
original) só continua sendo um segundo por logotipo se o total acompanhar a
lista. Com um número fixo no CSS, acrescentar um resort aceleraria a faixa em
silêncio.

### `define:vars` escreve o `style=` em todos os elementos, não só na raiz

A primeira tentativa de levar `--itens` ao CSS foi `<style define:vars>`.
Compila, funciona — e o Astro escreve `style="--itens: 70"` em **cada elemento do
template**: 143 atributos iguais por página, dois terços deles nas células, que
não usam a variável.

Ficou um `style=` explícito num elemento só, declarado na allowlist de
`verifica-sistema.mjs`. Ver abaixo.

## O portão de `style=` inline só via metade das ocorrências

A checagem procurava `style="` — com aspas. Num arquivo `.astro`, o estilo
**calculado** se escreve com chaves, e essa forma nunca foi contada. O catálogo
tinha três desde a Etapa 0 (as amostras de cor e de tipografia, que só existem
porque leem o token do dado) e o portão nunca as viu.

Um buraco assim é pior que a ausência da checagem: dá a impressão de que ela
cobre. Com as duas formas contadas, a allowlist que o plano previa desde o início
— *"nenhum `style=` inline **fora de allowlist**"* — passou a ser necessária de
fato. Ela guarda o **número** esperado por arquivo, e não só o nome: um `style=`
novo numa página que já tem exceção continua reprovando. E se o arquivo tiver
**menos** que o reservado, sai um aviso pedindo que a entrada seja removida —
exceção esquecida em lista é exceção que ninguém revoga.

## O `<LinkAcao>` perdeu duas propriedades porque o medidor não as pedia

`.item-link` do tema é:

```css
.item-link { color: #001E6C; font-size: 14px; letter-spacing: 1px;
             text-transform: uppercase !important; }
```

O `<LinkAcao>` da Etapa 3 nasceu sem as duas últimas. A causa não foi descuido de
leitura — foi que `medir-padroes.mjs` mede **as propriedades que a lista do grupo
pede**, e a lista de `chamadaAcao` não tinha `textTransform` nem `letterSpacing`.
O resumo não as mostrou, e ninguém as inventou.

**Medir sem pedir a propriedade certa é não medir.** É a variante mais silenciosa
do problema que este projeto documenta desde a Etapa 1: ali o erro era ler o CSS
em vez de medir; aqui foi medir a coisa errada.

Apareceu comparando o cartão da home com uma captura do tema — "SAIBA MAIS"
contra "Saiba mais". A correção alcança as seis páginas já migradas que usam o
componente, e as duas propriedades entraram na lista do medidor.

## O acervo desmentiu uma correção que parecia óbvia

Medido, `.polo-carousel-item img` tem `width: 100%` e `height: 100%` **sem
`object-fit`**, dentro de uma célula quadrada. A leitura imediata é que o tema
deformava todo logotipo que não fosse quadrado, e a primeira versão deste
componente registrou isso como correção.

Não é. Os **80 logotipos** de `src/assets/imagens/associados` são todos 320×320,
conferidos um a um com `sharp`. Numa célula quadrada com fonte quadrada, `cover`,
`contain` e `fill` dão o mesmo pixel.

O `object-fit: contain` ficou mesmo assim, porque é o único dos três que continua
certo no dia em que entrar um logotipo largo — mas como **defesa**, e não como
conserto. É o aviso do `CLAUDE.md` ao contrário: ali, ler o seletor sem medir
engana; aqui o seletor prometia um defeito que o acervo não tem.

## O orçamento deixou de ser um número, e voltou a ser

Três medições seguidas da mesma home deram **451, 201 e 451 KB**. A catraca
reprovaria e aprovaria a mesma página em execuções consecutivas — e a primeira
reprovação ensinaria a ignorá-la.

A causa: o limiar de `loading="lazy"` do Chromium depende da velocidade
**estimada** da conexão, e essa estimativa não existe na primeira navegação de um
processo. Ali ele usa um limiar curto e, das seguintes em diante, um mais
generoso. Medido: a home entregou 2 imagens na primeira navegação e 26 em todas
as outras — 26 KB contra 275, para o mesmo HTML.

O efeito era invisível enquanto nenhuma página tinha muita imagem abaixo da
dobra. Com os 70 logotipos do carrossel, ele passou a decidir o número — e o
número passou a depender de a home ser **a primeira da lista**, que ela é.

Quatro mudanças, e as quatro precisam estar juntas:

| mudança | o que ela resolve |
|---|---|
| `--force-effective-connection-type=4G` | fixa o limiar; e 4G é o que um visitante comum tem, não o piso de um navegador que ainda não sabe onde está |
| uma navegação de aquecimento, descartada | a flag sozinha não bastou: a primeira navegação após o `launch()` ainda entregava 2 imagens |
| `networkidle` no lugar de 300 ms de cortesia | o `load` não espera imagem lazy, e a janela fixa media se a máquina estava ocupada |
| `reducedMotion: 'reduce'` no contexto | com a faixa andando, novas imagens entram na tela para sempre e a rede **nunca** silencia |

As duas últimas são a mesma decisão vista de dois lados. Com as quatro, duas
rodadas completas consecutivas deram **24 456 KB** as duas vezes.

**O que a medida não cobre, e fica dito:** quem ficar na home vendo a volta
inteira baixa os 70 logotipos, ~447 KB de AVIF, espalhados por 70 segundos e em
prioridade baixa. Contra os 4,4 MB que a página do tema baixava **de uma vez** —
para não mostrar nenhum deles — é o teto que se aceitou.

## O `site.js` perdeu quatro funções, e três já estavam mortas

`logoCarousel()` morreu com esta etapa: eram 105 linhas reproduzindo a matemática
de célula do flickity, mais o **único `setInterval`** que o projeto ainda tinha —
o autoplay que a nota da Etapa 0 listava como obstáculo às View Transitions,
porque acumularia a cada navegação e aceleraria a faixa progressivamente.

`hero()` morreu junto, e pelo mesmo motivo: só a home o usava. Ele criava a
camada `.kenburns-bg` lendo a URL de um `style=` inline — o que impedia `srcset`
e `lazy` na maior imagem do site — e revelava as legendas com `setTimeout`.

E aí veio a parte que não estava prevista: **`counters()` e `tabs()` já estavam
inertes desde a Etapa 8**, quando `/associados` migrou. O `<Contador>` emite
`[data-contador]` e a função procurava `[data-to]`; as `<Abas>` não emitem
`data-bs-toggle="tab"`, que era o gancho de toda a função. Conferido no `dist/`:
as quatro strings só aparecem no `/design`, dentro de `<code>`, como
documentação.

`tabs()` não era só código parado: ele varria `[role="tablist"]`, que as `<Abas>`
**usam**. Saía sem fazer nada por não achar o atributo do Bootstrap dentro, mas
era um segundo dono a um passo de distância do mesmo elemento.

O arquivo caiu de **547 para 370 linhas**, e com as funções saíram seis entradas
da safelist de `purge-css.mjs` — `kenburns-bg`, `kenburns-bg-animate`,
`animate__fadeInUp`, `polo-carousel-item`, `active` e `show`. Uma entrada a mais
ali não quebra nada, só segura CSS que ninguém usa; por isso a lista precisa
encolher junto com o script, senão vira o inverso do que existe para ser.

Resta **um** listener de `resize` e nenhum `setInterval`. O que sobrou fecha o
menu ao passar para o breakpoint de desktop — **nenhum listener deste projeto
calcula geometria**.

## As três homes ficaram idênticas em estrutura

Comparado o HTML gerado dos três idiomas, elemento por elemento e classe por
classe, ignorando `href`/`alt`/`aria-*`: **1590 elementos, idênticos nos três**.

Não é elegância — é a resposta ao defeito que a auditoria encontrou. Antes desta
etapa, as três homes divergiam em cinco pontos, e nenhum deles é o tipo de coisa
que se percebe olhando uma página de cada vez:

| divergência | onde estava |
|---|---|
| o **título** da faixa de parceiros | só em português |
| o `#ApoieOTurismoBrasileiro` | só em português — e traduzido ele já existia no `ui.ts` desde a Etapa 8 |
| o `id` da seção de associados | só em português |
| `Socios / Partners:` | só em espanhol: o único dos nove rótulos com duas línguas na mesma linha |
| o `alt` da foto da associação | em **português nos três** |

Os quatro primeiros somem porque o bloco virou componente. O quinto é o único que
precisou de tradução nova, e é o mais instrutivo: `alt` é texto lido em voz alta,
e um `alt` em português numa página inglesa é a mesma classe de defeito que o
"Leia agora" da Etapa 4 — só que nenhum portão o vê e nenhuma captura o mostra.

## O que a etapa deixou para trás, de propósito

Uma coisa foi anotada e **não** corrigida: o Guia do Viajante Responsável aparece
com três grafias inglesas no site — "Responsible Traveler Guide" no cartão da
home, "Responsible Traveller Guide" na `description` de `/publicacoes`, e
"Responsible traveler guide" na coleção. A home ficou com a que ela já tinha.

Unificar mexeria em duas páginas fora desta etapa, e a regra do projeto é que
cada etapa responde pelo que migra. Fica registrado aqui para a Etapa 11, que é
quando a revisão do conjunto acontece.

# Design system — Etapa 10

A landing page do e-book, nos três idiomas. **41 de 41 páginas migradas** — a
etapa fecha a migração e deixa a Etapa 11 sendo só demolição.

Era o arquivo que o plano cita como a evidência do problema que ele existe para
resolver: *"quando o projeto encontrou uma landing page, o resultado foi
`ebook.astro` com 1.086 linhas e 140 `style=` inline"*. As três páginas somavam
3.258 linhas e 420 estilos inline; hoje somam **21 linhas** e nenhum.

## As três páginas eram byte a byte idênticas

O primeiro achado da etapa, e ele muda a forma da solução: `diff` entre os três
arquivos, normalizando só o `lang=`, devolve **uma** diferença — uma quebra de
linha no `alt` de uma foto. **A página do e-book nunca foi traduzida.**

Isso desmonta a premissa do plano para esta etapa, que dizia "o título do
capítulo traduz e vai para `ui.ts`". Não há tradução para mover: os 24 títulos de
capítulo, os 41 cargos e a prosa das seções estão em português nas três versões.

A consequência prática é que **o corpo virou UM componente**,
[`<PaginaEbook>`](../src/components/PaginaEbook.astro), e as três páginas viraram
três linhas cada. Escrever o mesmo markup três vezes reproduziria a triplicação
que este projeto já pagou caro em toda etapa que mexeu em texto — e sem ganho
nenhum, porque não há uma palavra diferente entre as versões.

### O que foi traduzido, e por que só isso

Duas coisas, e as duas já **tinham** tradução no repositório: o título da página
e o rótulo do botão de download. O cartão do e-book na home usa
`homeHighlights.ebook` nos três idiomas desde sempre — quem clicava em
*"Managing the Traveller's Journey → Download the e-book"* caía numa página cujo
`<h1>` dizia *"A Gestão da Jornada do Viajante"* e cujo botão dizia *"Baixe nosso
ebook"*. Usar o que já existe corrige a descontinuidade sem inventar conteúdo.

O resto **não** foi traduzido, e isso é deliberado: traduzir 24 títulos de
capítulo de uma publicação em português, 41 cargos e a prosa das seções é
escrever conteúdo novo, não migrar o que existe — e o PDF que os três botões
baixam é o mesmo arquivo em português. O que a etapa entrega é a **costura**:
`Traduzivel = string | Record<Locale, string>` em
[`src/data/ebook.ts`](../src/data/ebook.ts) e
[`autores-ebook.ts`](../src/data/autores-ebook.ts), o mesmo tipo que o `cargo` da
diretoria usa desde a Etapa 5. Quando a tradução existir, é uma edição de campo.

### Uma divergência de tradução que fica anotada

O `ui.ts` tem **duas traduções espanholas do mesmo título**, e elas discordam:

| onde | texto |
|---|---|
| `meta.ebook['es-es'].title` | La Gestión **del Viaje del Viajero** |
| `homeHighlights.ebook` (es) | La Gestión **de la Jornada del Viajante** |

A segunda é a que a página passou a exibir no `<h1>`, porque é a que o cartão da
home promete — mas "Jornada" em espanhol é *jornada de trabalho* e "Viajante" é
português. A primeira é o espanhol correto. Escolher entre as duas é decisão
editorial, e não de migração; fica para quem edita o conteúdo.

## São 41 autores, não 43

O plano dizia 43, contando no markup. A medição conta **40 cartões na grade de
autores mais 1 no prefácio**. É o mesmo erro de método que já transformou 7
publicações em 5 e duas cores em decisões que não existiam — contar no HTML em
vez de medir no navegador.

## O índice e a galeria de autores não batem, e não foram reconciliados

As duas listas são mantidas separadamente no conteúdo original, e discordam:

| discordância | detalhe |
|---|---|
| um autor com dois nomes | "Carolina Sass" assina um capítulo no índice; a galeria tem "Carolina Haro" |
| um autor sem cartão | "Clarissa Santiago" assina "A experiência do viajante digital na era da assistência" e não tem cartão |
| um cartão sem capítulo | "Marcelo Picka Van Roey" tem cartão ("Reflexão Final") e não assina capítulo no índice |
| seis títulos divergentes | "Qualidade de gestão como fator de competitividade…" no índice é "Práticas de gestão como fonte de desempenho superior" nos cartões |

**Não há guarda cruzada entre os dois arquivos**, e a ausência é deliberada — ao
contrário do `<DestaquesHome>` e do `<BlocoEixo>`, que abortam o build quando os
dois lados divergem. Aqui os dois lados já divergem, e uma guarda só conseguiria
reprovar o build de uma página que está no ar há anos. Reconciliar é decidir qual
das duas versões é a certa, e isso é do editor.

## A paleta escura entrou como token, e o teste passou

O plano dizia que esta etapa é *"o teste real de que a camada semântica
funciona"*. O critério aplicado: **se o papel já existe no site, reusa o token;
se o papel só existe aqui, ganha um `--color-ebook-*`.**

O que **não** ganhou nome novo é a metade que importa — o texto é branco, o cargo
é `--color-texto-sutil`, o acento das seções é `--color-destaque` e o cartão de
autor é a superfície inversa. São os mesmos papéis do resto do site, pintados
pelos mesmos tokens. Sobraram sete superfícies e dois gradientes, que são desenho
desta página e de mais nada.

Os valores saem de [`scripts/medir-ebook.mjs`](../scripts/medir-ebook.mjs), o
**sexto da família**, e ele existe por um motivo específico: a paleta do e-book
não está em lugar nenhum do `style.css`. Os sete fundos vinham todos de `style=`
inline, então ler o CSS daria zero resposta. O script lê o `background-image`
computado, que é o único lugar onde os stops aparecem resolvidos em rgb.

Duas primitivas já existiam e foram confirmadas pela medição: o `--cor-carvao-900`
(`#0c101b`) é a base de tudo, e o `--cor-carvao-800` (`#0e121d`) é a faixa da
iniciativa **e** o fundo do rodapé invertido — medidos iguais.

## O pior conjunto de contraste do site estava aqui

A medição encontrou cinco falhas de WCAG 1.4.3, todas em produção há anos, e
nenhum dos quatro portões via nenhuma delas — o checador de contraste do
`verifica-sistema.mjs` compara pares de **token**, e nada disso era token.

| elemento | tema | correção | agora |
|---|---|---|---|
| título de capítulo (**123 ocorrências**) | 3,77:1 | `#0c71c3` clareado 12% → `#0d7fda` | 4,58:1 |
| rótulo do botão de download (3× por página) | **1,65:1** no ciano, 3,74:1 no coral | texto passa de branco para o carvão | 11,50:1 e 5,08:1 |
| título e texto da chamada de ação | 2,73:1 | o verde do gradiente escurece 25% → `#517e72` | 4,59:1 |
| os 12 links do rodapé invertido | 2,86:1 | cinza sutil no lugar do cinza de parágrafo | 7,08:1 |
| a linha de copyright e **o botão que revoga o consentimento de cookies** | **1,23:1** | cor declarada, no cinza sutil | 7,0:1 |

A última linha é a grave, e não é só contraste ruim: o tema **nunca declarou cor
de texto** naquela faixa, então ela herdou o navy do `<body>` e ficou navy sobre
quase-preto. A frase de copyright e o botão de preferências de cookies estavam
**invisíveis** nas três páginas.

O botão de download é o caso mais instrutivo, porque a correção teve de ser
diferente das anteriores: num **gradiente**, uma cor de texto tem de passar nas
duas pontas. O branco reprova nas duas (1,65 e 3,74); o navy passa no ciano e
reprova no coral (9,06 e 4,00). Só o carvão passa nos dois extremos. E na chamada
de ação nem isso resolveu — branco dá 2,73:1 numa ponta e o navy dá 1,51:1 na
outra, então **quem cedeu foi o fundo**.

O botão também **ganhou hover**, que o tema não tinha: medido com o mouse em
cima, o CTA principal da página não mudava nada. O estado não inventa cor —
`brightness(1.1)` clareia as duas pontas do próprio gradiente, o que anima (uma
troca de `background-image` não interpola) e ainda melhora o contraste em vez de
piorar.

## Duas coisas que só apareceram abrindo o menu

O cabeçalho do e-book é **transparente e escuro** — os dois ao mesmo tempo. Nas
38 páginas claras a transparência não aparece, porque o fundo do `<body>` também
é claro. Aqui o texto é branco, e a primeira versão desta etapa entregou **o menu
inteiro branco sobre branco**: o cabeçalho ficou no fluxo, acima da foto em vez
de sobre ela.

O tema resolvia com `margin-top: -80px` no `<main>` (e `-120px` quando havia
topbar — dois números para manter sincronizados). Aqui quem sai do fluxo é o
cabeçalho, que é o elemento que de fato flutua. Um número, e ele não depende de
quem vem depois.

**E flutuar tem um preço no mobile.** Abaixo de 992px o menu é um painel que
ocupa a segunda linha da barra. No cromo claro o cabeçalho está no fluxo e o
painel *empurra* a página; aqui ele se sobrepõe ao hero, e os seis itens do menu
ficaram impressos por cima do título. Some com um fundo que só existe enquanto
`.mainMenu-open` está no `<body>` — o mesmo nome de estado que o `site.js` já
escreve nas duas variações.

Junto veio a terceira: **o submenu muda de fundo conforme a faixa.** Acima de
992px ele é um painel branco e o cinza de parágrafo está certo; abaixo, ele
herda o fundo do cabeçalho, e no escuro isso é cinza sobre carvão — 2,86:1, o
mesmo número do rodapé.

**Nenhuma das três aparece em captura de página parada, e nenhuma reprova um
portão.** A geometria mede caixas, e as caixas estavam certas.

## Três portões precisaram mudar, e um estava errado antes desta etapa

**1. A suíte comportamental perdeu o `PAGINA_TEMA`.** A última página do tema era
justamente `/ebook.html`, escolhida na Etapa 8 como referência *por ser a última
a migrar*. Não existe mais página do tema para apontar, e a escolha era entre
perder a segunda camada de teste ou lhe dar outro sentido.

O segundo sentido é melhor que o primeiro: as duas páginas continuam sendo duas,
mas agora o que se compara são as duas **variações de cromo do sistema** — o
claro, que 38 páginas usam, e o escuro do e-book, que três usam e que nasceu
aqui. As duas são dirigidas pelo mesmo `site.js`, pelos mesmos nomes de estado.
A aposta é a mesma; mudou entre o quê.

**2. A checagem de glifos virou o contrário dela mesma.** Ela pintava cada
codepoint num canvas e o comparava com um ausente, para pegar subset incompleto —
e rodava numa página do TEMA de propósito, porque numa migrada mediria tofu
contra tofu e passaria sempre. Sem página do tema, não há onde medir nem o que
medir: as duas famílias do Font Awesome deixaram de ser publicadas.

No lugar entra a afirmação inversa, e ela é barata: **nenhuma página pode voltar
a baixar webfont de ícone.** É a mesma classe de vigilância do isolamento de
folhas — afirmar a *ausência*, porque é a ausência que a migração conquistou.

**3. O `verify-icones.mjs` comparava contra a fonte errada, e isso é anterior à
Etapa 10.** Ele carregava a webfont de `/webfonts/`, que é o **subset gerado** —
mas a pergunta que ele faz é "o SVG desenha o mesmo contorno que a fonte
original?". Comparar com o subset deixaria passar um erro introduzido pelo
próprio `pyftsubset`. Agora a fonte vem de `vendor/webfonts/`, embutida como
`data:`, e as divergências medidas **caíram** — os cinco ícones de marca foram de
34–85% para 0,0%.

### Uma armadilha que quase se repetiu no `glifos.json`

As duas famílias do Font Awesome ficaram órfãs, e o caminho óbvio era tirá-las de
`familias`. Seria o erro: `familias` **não** é a lista do que se publica, é a
lista de onde cada **contorno** vem. O `glifos-para-svg.py` lê exatamente aquelas
entradas para desenhar 8 dos 16 SVG de `src/icones/glifos.ts`, e o
`verify-icones.mjs` as usa como referência. Apagar a entrada apagaria os oito
desenhos na próxima regeneração, **sem erro nenhum** — a forma exata da armadilha
que aquele arquivo já documenta no próprio `_leia`.

A separação entrou como `"saida": null`: a família continua sendo origem de
contorno e deixa de ser webfont publicada.

## O que a etapa mediu, e o que ela cortou

- **`/ebook.html` cai de 1.156 KB para 315 KB** no mobile, nos três idiomas — os
  41 retratos passavam sem `srcset` e sem `loading`;
- o conjunto medido cai de **24,4 MB para 19,8 MB**;
- **a dívida de transbordo horizontal chega a zero.** Eram 72 na Etapa 0.5;
- `style=` inline no projeto: **424 → 4**, e os quatro restantes estão no
  `Header`/`Footer` do tema, que nenhuma página usa mais;
- cor literal fora do `tokens.css`: **413 → 2**, mesma origem;
- páginas com heading irregular: **3 → 0**. Eram 39 de 40 na auditoria;
- as três páginas saem com **864 elementos, idênticos tag a tag e classe a
  classe**.

O CSS compartilhado subiu de 35 para 39 KB, e o orçamento reprovou `/404.html` e
`/design.html` por causa disso — a catraca funcionando. É o custo de a folha ser
uma só: a landing page inteira agora tem estilo de verdade em vez de 140
atributos `style=` que só pesavam na própria página. Registrado e rebaseado.

## O que a etapa deixou pronto para a demolição

Nenhuma página carrega mais `plugins.css`, `style.css` ou `ajustes.css` — a
purga corta os três a 27 KB de CSS que **ninguém baixa**. O `BaseLayout`, o
`Header`, o `Footer` e o `SocialIcons` não são importados por página nenhuma. A
Etapa 11 é remoção, e não migração.
