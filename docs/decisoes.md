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
- **O aviso de cookies é decorativo:** o GTM dispara antes de qualquer escolha
  do visitante, o que num site brasileiro é assunto de LGPD.
