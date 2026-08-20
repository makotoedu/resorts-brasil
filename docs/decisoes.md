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

Sobraram 9 comportamentos reais, hoje em [`src/scripts/site.js`](../src/scripts/site.js),
com cerca de 9 KB minificados.

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

Os 14 ícones em uso (6 do FontAwesome, 8 do Inspiro) custavam 240 KB de fonte.

Trocar por SVG inline daria o melhor resultado teórico — zero requisição de
fonte — mas exigiria editar `<i class="icon-*">` espalhado pelas 40 páginas, com
risco de divergência de tamanho, alinhamento e cor.

O subset ([`scripts/subset-fonts.py`](../scripts/subset-fonts.py)) atinge
praticamente o mesmo ganho **sem tocar uma linha de markup ou CSS**, então o
risco visual é zero. A família `fa-regular-400` sai por inteiro: nenhum ícone
`.far` aparece em qualquer página.

> **Ainda não aplicado.** O script está escrito e revisado, mas as fontes em
> `public/webfonts/` continuam as originais (256 KB). Rodá-lo é a Fase 2.1 e
> exige `fonttools`; depois de rodar, atualize os `@font-face` e passe o diff
> visual, porque troca de fonte mexe em métrica de texto.

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
