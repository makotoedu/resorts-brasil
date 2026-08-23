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
