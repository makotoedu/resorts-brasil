# Orientação para o Claude Code

Site institucional estático da Associação Brasileira de Resorts: 41 páginas em
3 idiomas, Astro, hospedado na Vercel. Sem backend, formulário ou banco.

Leia o [README.md](README.md) para comandos e estrutura, e
[docs/](docs/) para arquitetura, decisões e verificação.

## LEIA PRIMEIRO: há uma migração em curso

O site está sendo movido do tema Inspiro para um design system próprio
(Tailwind v4 + tokens). **As duas camadas convivem, e cada página carrega
exatamente uma delas.**

O plano completo, com etapas e critérios, está em
[docs/plano-design-system.md](docs/plano-design-system.md). O estado atual:

| etapa | situação |
|---|---|
| 0 — fundação (Tailwind, tokens, base, catálogo, invariantes) | concluída |
| 0.5 — rede de segurança de geometria | concluída |
| 1 — primitivos e catálogo | concluída |
| 2 — pipeline de imagens | concluída |
| 3 — padrões (CartaoMembro, Hero, Abas…) | concluída |
| 4 — conteúdo (Content Collections) | concluída |
| 5 — cromo + páginas pequenas (404, história, contato, diretoria) | concluída |
| 6 — termos de uso e política de privacidade | concluída |
| 7 — publicações e estatísticas e estudos | concluída |
| 8 — associados, associe-se, apoie, resorts-brasil | concluída |
| 9 — home (`index` / `home` / `inicio`) | concluída |
| 10 — ebook (`ebook` × 3) | concluída |
| 11 — demolição | **próxima** |

**Páginas migradas: 41 de 41 — a migração acabou.** Confira sempre com
`node scripts/verifica-sistema.mjs`, que mede no `dist/` em vez de acreditar
nesta tabela.

**Nenhuma página carrega mais `plugins.css`, `style.css` ou `ajustes.css`**, e
nenhuma baixa webfont de ícone. O tema ainda existe em arquivo — `BaseLayout`,
`Header`, `Footer`, `SocialIcons`, `public/css/` — e não é importado por página
nenhuma. Removê-lo é a Etapa 11 inteira.

### As quatro regras que não podem ser quebradas

1. **Página migrada usa o [`LayoutSistema`](src/layouts/LayoutSistema.astro);
   página do tema usa o [`BaseLayout`](src/layouts/BaseLayout.astro).** São dois
   arquivos, e a folha do design system entra só no primeiro.

   ```astro
   ---
   import LayoutSistema from '../layouts/LayoutSistema.astro';
   ---
   <LayoutSistema lang="pt-br" route="history">
   ```

   **Desde a Etapa 10 o `BaseLayout` não é usado por página nenhuma**, e a regra
   vira uma só: toda página usa o `LayoutSistema`. A parte de baixo desta nota
   fica registrada porque explica por que os dois arquivos existem, e porque o
   mecanismo — CSS empacotado pelo grafo de módulos — continua valendo para
   qualquer folha que alguém venha a importar.

   **Não importe nada do design system dentro do `BaseLayout`** — nem a folha,
   nem um componente com `<style>`, nem dentro de um `if` que nunca executa. O
   Astro empacota CSS pelo **grafo de módulos**, não pelo que a página renderiza,
   então o `import` sozinho já põe o CSS nas páginas do tema — eram 40 quando
   isto foi escrito, hoje são zero. Importar a folha no layout já fez 22 delas
   divergirem: o Preflight do Tailwind vaza para onde o tema não declara a mesma
   propriedade, e `@layer` não protege disso.

   Isto substitui a prop `legado`, que **nunca funcionou** — o `BaseLayout`
   renderiza `Header` e `Footer` do tema, então `legado={false}` entregava uma
   página sem cabeçalho. Ver [docs/decisoes.md](docs/decisoes.md), "A prop
   `legado` não podia funcionar".

2. **Todo componente ou página migrada precisa de um `@source`** em
   [`src/styles/global.css`](src/styles/global.css). Esquecer não quebra o
   build: a utilitária simplesmente não é gerada e o estilo some.

3. **Valor que vai para o `base.css` ou para um componente tem de ser medido** —
   `node scripts/medir-base.mjs` para o elemento nu, `node
   scripts/medir-primitivos.mjs` para o que tem classe (botão, seção, container,
   grade, ícone), `node scripts/medir-padroes.mjs` para as composições (cartão,
   chamada, hero, abas…), `node scripts/medir-cromo.mjs` para o cabeçalho, o
   rodapé, a faixa de cookies e o voltar-ao-topo, e `node
   scripts/medir-documento.mjs` para o texto corrido (separador, citação, tabela
   e **a largura da linha em caracteres**, que só se mede com a fonte real
   carregada) — sempre com o **hover** junto e, no cromo, com o **estado
   aberto**, porque menu, submenu e seletor de idioma
   medem zero em repouso. Nunca lido do
   `style.css`, nunca contado no markup. O `padding` das listas já entrou errado
   por leitura (28px onde o real é 14px), a largura do container por suposição
   (1140px onde o real é 1500px), a largura da linha de leitura por padrão do
   Tailwind (`max-w-3xl` onde o medido são 688px), e **duas cores por contagem de
   ocorrências**:
   as 123 do `#0c71c3` são todas títulos de capítulo do ebook e nenhuma é botão,
   e as 141 do `#0c101b` são todas do ebook também — a superfície escura da
   chamada de ação é o navy, medido.

   O sexto da família é `node scripts/medir-ebook.mjs`, e ele existe por um
   motivo que vale como regra: **a paleta do ebook não estava no `style.css`.**
   As sete superfícies, o gradiente da chamada e o do botão vinham todos de
   `style=` inline. Ler o CSS daria zero resposta; só o `background-image`
   **computado** devolve os stops resolvidos em rgb.

   **E medir contraste é parte de medir cor.** Aquela mesma medição encontrou
   cinco falhas de WCAG na página do ebook, uma delas a 1,23:1 — texto navy sobre
   quase-preto, invisível em produção há anos. Num **gradiente**, a cor do texto
   tem de passar nas *duas* pontas; quando nenhuma passa, quem cede é o fundo.

4. **Componente novo em `primitivos/`, `layout/`, `padroes/` ou `cromo/` entra no
   catálogo `/design` no mesmo commit.** Não é convenção: `verifica-sistema.mjs`
   reprova o build se o `/design` não importar o componente.

   As quatro camadas: `primitivos/` é vocabulário, `layout/` é eixo (largura,
   ritmo, colunas), `padroes/` é uma decisão de desenho já tomada, e `cromo/` é o
   que embrulha toda página — cabeçalho, rodapé, faixa de cookies, voltar ao
   topo. O cromo usa **os mesmos nomes de estado do tema** (`#mainMenu`,
   `.p-dropdown`, `.toggle-active`, `.modal-active`, `#scrollTop`) porque um
   [`site.js`](src/scripts/site.js) só serve as duas camadas enquanto elas
   convivem.

### Quatro armadilhas do Astro, e as quatro custam a mesma coisa

**Nenhum erro.** O build passa, o tipo passa, e o defeito só aparece olhando. As
três primeiras vieram da Etapa 8; a quarta, da Etapa 10.

1. **Classe escopada passada a um componente não vale.**

   ```astro
   <Grade class="modalidades">…</Grade>
   <style>.modalidades { margin-top: 30px }</style>   /* computa 0px */
   ```

   A classe chega ao HTML, mas sem o atributo de escopo — o seletor compilado é
   `.modalidades[data-astro-cid-xxx]` e o elemento tem só a classe. Estilo
   escopado alcança elemento que está no **seu** template. Para um componente,
   use utilitária (que é global) ou um elemento próprio em volta. Quatro regras
   da Etapa 8 estavam inertes assim.

2. **Nome de slot não pode ser dinâmico.** `<Fragment slot={item.id}>` dentro de
   um `.map()` passa no `astro check`, compila, e quebra na **geração** com
   `ReferenceError: item is not defined` — o Astro extrai os slots nomeados em
   tempo de compilação, fora do escopo do callback. Use nomes literais e ponha o
   corpo num componente; se os nomes vierem de `src/data/`, ponha uma guarda que
   aborte o build quando os dois lados divergirem.

3. **Antes de migrar uma página, veja onde mora o CSS dos componentes que ela
   usa.** O `<YouTube>` tem o dele em `public/css/ajustes.css` — a folha do
   *tema* —, e página migrada não carrega aquele arquivo. Migrar
   `/resorts-brasil` com ele entregaria a fachada de vídeo sem caixa e sem botão
   de play, sem quebrar portão nenhum. E o inverso também vale: **antes de
   converter um componente compartilhado, veja quem mais o importa** — o
   `<GradeLogos>` não pôde ser convertido na Etapa 8 porque as três páginas de
   home ainda o usavam, e o `<style>` dele iria para o bundle delas pelo grafo de
   módulos. Ele foi apagado na Etapa 9, junto com o `<CarrosselAssociados>`,
   quando as homes migraram.

### E uma quarta, da Etapa 10: cor que depende do que está embaixo

**Componente transparente herda o fundo de quem o contém — e o contraste também.**

O cabeçalho do site é transparente e o texto dele é escuro; nas 38 páginas claras
isso funciona porque o `<body>` também é claro, e ninguém precisa saber que a
dependência existe. A variação escura do ebook inverte o texto para branco, e aí
a dependência vira requisito: **sem a foto atrás dele, o menu inteiro fica branco
sobre branco.** Foi o que a primeira versão daquela etapa entregou.

O mesmo par apareceu mais duas vezes na mesma sessão, e sempre por mudança de
contexto, nunca de cor:

- o painel do menu **mobile**, quando o cabeçalho passa a flutuar: ele deixa de
  empurrar a página e passa a se sobrepor a ela;
- o **submenu**, que acima de 992px é um painel branco e abaixo herda o fundo do
  cabeçalho — então o cinza dele está certo numa faixa e reprova na outra.

Nenhum dos três reprova portão nenhum: a geometria mede caixas, e as caixas estão
certas; o checador de contraste compara pares de **token**, e "token contra a
superfície que calhou de estar embaixo" não é um par que ele conheça. Os três só
apareceram abrindo o menu e olhando.

A regra prática: ao dar a um componente de cromo uma variação de cor, **liste os
fundos sobre os quais ele pode aparecer** — inclusive os estados abertos, e
inclusive em cada faixa —, e meça cada combinação.

### Onde ficam as decisões

- tokens e escala → [`src/styles/tokens.css`](src/styles/tokens.css)
- base dos elementos → [`src/styles/base.css`](src/styles/base.css)
- por que cada coisa é assim → [docs/decisoes.md](docs/decisoes.md), seção
  "Design system"
- o que pode divergir do site original → [docs/deltas-visuais.md](docs/deltas-visuais.md)

## Antes de mexer em CSS

Este projeto tem uma armadilha que não é óbvia e já causou uma regressão.

O tema Inspiro **resolvia parte da responsividade em JavaScript**, não em media
queries: o plugin `breakpoints` do jQuery aplicava classes `breakpoint-xs`/`sm`/
`md`/`lg`/`xl` no `<body>`, e 15 regras do `style.css` dependiam delas. O jQuery
foi removido na refatoração e essas regras foram convertidas para media queries
em [`public/css/ajustes.css`](public/css/ajustes.css).

As faixas são **as de `js/functions.js`, não as do array padrão do plugin em
`js/plugins.js`** — o site sobrescreve a configuração:

| classe | faixa |
|---|---|
| `xs` | 0 – 575 |
| `sm` | 576 – 767 |
| `md` | 768 – 1024 |
| `lg` | 1025 – 1199 |
| `xl` | 1200+ |

Ler o array errado desloca tudo uma faixa e **acerta nos extremos**: o celular e
o desktop ficam certos e o erro se esconde no meio da escala. Foi assim que 22
comparações de tablet ficaram reprovadas sem sintoma óbvio.

Desde a Etapa 9 **nenhum JavaScript deste projeto lê essas faixas**: o carrossel
de logos era o último a fazê-lo, e a contagem de colunas dele virou container
query. E desde a Etapa 10 **nenhuma página carrega o `ajustes.css`** — as três do
ebook eram as últimas. A tabela fica registrada até a Etapa 11 apagar o arquivo,
e porque o erro que ela documenta (ler o array errado, acertar nos extremos e
esconder o defeito no meio da escala) é geral.

Consequências práticas:

- `ajustes.css` **precisa continuar sendo carregado depois de** `style.css`,
  senão perde na cascata.
- Media query não acrescenta especificidade. Os seletores desse arquivo usam
  `body ...` de propósito, para reproduzir o peso dos originais.
- [`scripts/purge-css.mjs`](scripts/purge-css.mjs) fixa `targets` do
  lightningcss. Sem isso ele emite `@media (width<=767px)`, sintaxe que
  navegador antigo ignora **em silêncio**, ressuscitando a regressão.

Generalizando: neste tema, procure por seletores que dependam de classes que
nenhum HTML estático contém antes de remover qualquer script.

A mesma armadilha mordeu uma segunda vez, pior: `.grid-layout > *` tem
`opacity: 0` e só `.grid-layout.grid-loaded > *` devolve `opacity: 1` — e quem
adicionava `.grid-loaded` era o Isotope. Seis páginas ficaram com o conteúdo
**invisível**. A correção foi pôr a visibilidade no CSS (funciona mesmo se o JS
falhar) e o empacotamento masonry em `gridLayout()`, no `site.js`.

**Essa armadilha deixou de existir na Etapa 7.** As duas últimas páginas com
`.grid-layout` migraram para a [`<Grade>`](src/components/layout/Grade.astro), o
`gridLayout()` saiu do [`site.js`](src/scripts/site.js) e com ele os dois últimos
listeners persistentes que só existiam por causa do masonry. Fica registrada aqui
porque o padrão que ela ensina — plugin removido, CSS que dependia dele
silenciosamente inerte — é o que se deve procurar no que sobrou. Ele reapareceu
na Etapa 9, e a quarta vez está logo abaixo.

E uma terceira vez, mais silenciosa: o `.kenburns-bg` do hero tem `z-index: -1` e
só aparece se o `.slide` for um contexto de empilhamento — quem criava isso era o
flickity, posicionando o slide. Sem ele a camada foi para trás do fundo do
próprio slide e **o zoom parou de acontecer**, sem mudar altura nem quebrar
nenhum teste. Resolvido com `position: relative` no slide, em `ajustes.css`.

**E uma quarta, que ficou meses em produção sem ninguém ver.** `.carousel` tem
`opacity: 0` e `visibility: hidden`, e só `.carousel.carousel-loaded` devolve as
duas — classe que o init do flickity punha. O carrossel de logos das três homes
ficou **invisível**, e elas continuaram baixando 70 logotipos em tamanho original
para não mostrar nenhum. Morreu na Etapa 9, com a home.

O que faz a quarta valer mais que as outras três não é o defeito — é **por que
nenhum dos quatro portões viu**, e cada um falhou por um motivo diferente:

| portão | por que passou |
|---|---|
| comportamental | comparava o `src` do primeiro item antes e depois de 8s, e o script reciclava a fila **dentro** do elemento invisível |
| geometria | vigiava `.polo-carousel`; a classe do tema é `.polo-carousel-item`. **Nunca casou com nada** |
| diff visual | esconde aquela região de propósito — a posição depende do instante |
| orçamento | o peso não muda quando a imagem carrega sem aparecer |

Duas regras saem daí, e as duas são gerais:

1. **Um seletor que não casa nada não falha — ele passa.** Ao pôr um seletor numa
   lista de vigilância, confirme que ele encontra alguma coisa hoje.
2. **Uma exclusão de portão entra junto com quem cobre o buraco.** Esconder o
   carrossel no diff visual é legítimo; fazê-lo sem nada em seguida deixou aquela
   região sem verificação nenhuma.

O padrão comum às quatro: **plugin removido, CSS que dependia dele
silenciosamente inerte**. Procure por `z-index` negativo, `opacity: 0`,
`visibility: hidden` e classes de estado antes de tirar qualquer script.

## Antes de mexer em fonte de ícone ou em qualquer script de terceiro

**Fonte de ícone: o inventário sai do CSS purgado, não das classes do HTML.**
Dois glifos do site entram por pseudo-elemento — `.list-icon-arrow li:before`
(`U+F054`) e `.list-icon-circle li:before` (`U+F192`) — e **pseudo-elemento não
tem classe**. Um subset montado a partir dos `<i class="fa-*">` enxerga 14
ícones; o número real é 16, e rodá-lo apagava as setas e bolinhas de 6 páginas
sem erro nenhum: glifo ausente vira tofu, que ocupa exatamente 1em.

A lista vive em [`scripts/glifos.json`](scripts/glifos.json) e
[`scripts/check-glifos.mjs`](scripts/check-glifos.mjs) aborta o build se o CSS
purgado pedir um codepoint fora dela. Não desative essa guarda.

**Nenhuma página usa webfont de ícone desde a Etapa 10.** O
[`<Icone>`](src/components/primitivos/Icone.astro) desenha SVG inline a partir de
[`src/icones/glifos.ts`](src/icones/glifos.ts), que é **gerado** — rode
`python scripts/glifos-para-svg.py` depois de mexer no `glifos.json`, nunca edite
o arquivo à mão. [`tests/verify-icones.mjs`](tests/verify-icones.mjs) compara
cada desenho com a fonte de origem e reprova codepoint trocado, contorno vazio ou
eixo espelhado. A checagem de tofu da suíte comportamental, que só fazia sentido
numa página do tema, virou a afirmação inversa: **nenhuma página pode voltar a
baixar webfont de ícone.**

**`familias`, no `glifos.json`, NÃO é a lista do que se publica — é a lista de
onde cada contorno vem.** As duas famílias do Font Awesome ficaram órfãs na Etapa
10 e o caminho óbvio seria apagá-las dali; seria o erro. O
`glifos-para-svg.py` lê aquelas entradas para desenhar 8 dos 16 ícones, e o
`verify-icones.mjs` as usa como referência — apagar a entrada apagaria os
desenhos na próxima regeneração, **sem erro nenhum**. Quem despublica é
`"saida": null`.

Pelo mesmo motivo, **`vendor/webfonts/` não é lixo**: é a origem dos contornos e
a referência do portão de ícones. `public/webfonts/` é que é **gerado** a partir
dele; nunca edite o segundo à mão. E os `src:` dos `@font-face` carregam `?v=`
porque `/webfonts/` é servido com `immutable` de um ano e os nomes não têm hash —
trocar a fonte sem trocar a query entrega a antiga por 12 meses.

**Terceiros: nada carrega antes do consentimento.** O GTM, e qualquer script de
terceiro que venha a existir, é injetado pelo bloco inline do `<head>` de
[`Cabeca.astro`](src/layouts/Cabeca.astro) — o `<head>` compartilhado pelos dois
layouts —, que expõe `window.rbConsent`. Esta nota dizia `BaseLayout` e estava
errada desde a Etapa 5, quando o `<head>` foi extraído. Não
acrescente `<script src>` de outro domínio fora dele, nem um `<iframe>` de
terceiro sem fachada de clique-para-carregar. Se a lista de cookies mudar,
atualize [`src/data/cookies.ts`](src/data/cookies.ts) — a tabela da política nos
três idiomas sai de lá — e suba a versão de `rb_consent`.

Nota de purga: `iframe` está na safelist do `purge-css.mjs` porque, depois da
fachada dos vídeos, **não existe um único `<iframe>` no HTML gerado** — ele nasce
no clique. Vale para seletor de tag, não só para classe.

Ao reproduzir qualquer coisa que o tema fazia em JavaScript, **leia o valor
padrão junto com o atributo**. `data-margin` vale 20 nas grades e 10 nos
carrosséis quando ausente, `data-autoplay` vale 7000, e `data-items` desdobra
numa cadeia de tetos por faixa. Reproduzir só o caso explícito passa no build e
erra no pixel.

## Antes de mexer em imagem

**O acervo vive em [`src/assets/imagens/`](src/assets/imagens/).** Em
`public/images/` ficaram só `favicon.png` e `og-image.png`, que são
referenciados de fora do site. Imagem nova entra no acervo, nunca em `public/`.

**O caminho continua sendo `/images/…` em todo lugar** — em `src/data/`, no
markup do tema e no `<Imagem src="…">`. Quem traduz caminho em módulo otimizado é
[`src/imagens.ts`](src/imagens.ts), e é isso que mantém os 183 caminhos de
`src/data/` como dado em vez de `import`. Caminho inexistente **aborta o build**.

[`scripts/imagens.mjs`](scripts/imagens.mjs) faz duas coisas depois do build, e
as duas dependem da mesma varredura: copia para `dist/images/` o que as páginas
do tema ainda pedem, e apaga do `dist/_astro/` o que o `import.meta.glob` emitiu
sem ninguém usar. Ele roda **depois** do `purge-css.mjs` — antes, ele lê no
`style.css` oito referências a imagens que nunca existiram neste projeto e aborta
por causa de regras que a purga apaga em seguida.

Ao usar o [`<Imagem>`](src/components/primitivos/Imagem.astro):

- **diga o `tamanhos` quando a imagem não ocupar a largura da janela.** Sem ele,
  `escala="largura-total"` assume `100vw` e baixa o dobro do necessário;
- **não mexa em `qualidade` sem medir.** O 50 padrão saiu de
  `node scripts/medir-imagens.mjs`, que compara fidelidade contra o original.
  `quality` não é escala comum entre codecs: no 80 que parecia óbvio, o AVIF
  saía **50% maior** que o WebP.

## Antes de declarar qualquer coisa pronta

```bash
npm run build      # tipos, purga, glifos, invariantes do design system
npm run verify     # comportamento, geometria, ícones e orçamento (precisa do preview no ar)
```

A suíte comportamental sozinha **não vê layout colapsar** — passou 14/14 durante
todo o período em que a grade de logos estava quebrada. Quem cobre isso é a
varredura de geometria, `tests/verify-geometria.mjs`: as 41 páginas × 3
viewports, procurando caixa zerada, grade sem colunas, irmãos sobrepostos,
imagem quebrada, transbordo horizontal e **texto vazando da própria caixa**. Essa
última entrou na Etapa 5, depois de um e-mail passar por cima da coluna vizinha
sem que nenhum dos quatro portões visse: as caixas estavam certas, quem vazava
era o conteúdo dentro delas.

**O que é cromo é testado nas DUAS VARIAÇÕES.** A suíte comportamental tem
`PAGINA_SISTEMA` e `PAGINA_EBOOK` no topo e roda menu, seletor de idioma, cookies
e voltar-ao-topo em cada uma — o cromo claro que 38 páginas usam e o escuro que
as 3 do ebook usam, dirigidos pelo mesmo `site.js` e pelos mesmos nomes de
estado. Até a Etapa 10 o par era `tema`/`sistema`; a última página do tema migrou
e o par mudou de significado, não de valor.

Ao migrar ou reformar uma página, **confira se ela não era a página de referência
de algum teste**. Já custou três vezes: `/historia.html` era a de quase todos até
a Etapa 5, `/resorts-brasil.html` até a 8, e `/ebook.html` — escolhida por ser a
última do plano — até a 10.

**Ela lê o código de saída, e zero bloqueios é o critério.** A lista "PENDENTE"
é dívida herdada do tema e não reprova; ela vira bloqueante sozinha conforme
cada página migra.

O quarto portão é o **orçamento de performance**, `tests/verify-orcamento.mjs`:
uma catraca, não um teto. Cada página tem a própria linha de base em
`tests/orcamento.json`, e o que reprova é ela engordar mais de 5%. Página que
emagrece pede `ATUALIZAR=1 node tests/verify-orcamento.mjs` para regravar a base
mais apertada — é assim que o peso não volta.

O `node tests/visual-diff.mjs` continua existindo, mas **não é mais portão** — o
pixel agora muda de propósito. Ele é changelog: cada divergência entra em
[docs/deltas-visuais.md](docs/deltas-visuais.md) classificada como refino,
correção ou regressão. `N/120` deixou de ser critério, e altura de página não é
critério nenhum.

O procedimento completo está em [docs/verificacao.md](docs/verificacao.md).

## Convenções

- Textos de navegação, rodapé e cookies ficam em [`src/i18n/ui.ts`](src/i18n/ui.ts),
  nunca nos componentes. É a fonte única que alimenta nav, rodapé, seletor de
  idioma e `hreflang`.
- URLs são requisito: o site tem histórico de indexação. `build.format: 'file'`
  mais `cleanUrls` da Vercel preservam os caminhos originais. Mudança de caminho
  exige redirect 301 no [`vercel.json`](vercel.json).
- [`src/scripts/site.js`](src/scripts/site.js) usa as mesmas classes de estado
  do tema original (`.toggle-active`, `.mainMenu-open`, `.modal-active`, …) para
  que o CSS existente continue valendo. **O cromo novo repete esses nomes de
  propósito**, e é isso que deixa um script só servir as duas camadas durante a
  migração. Preserve-os nos dois lados.
- Classe aplicada via JavaScript precisa entrar em `runtimeClasses` no script de
  purga, senão o estilo dela é removido do build.
- Comentários e documentação em português, acompanhando o resto do projeto.

## O que não existe aqui

Para poupar buscas: não há lightbox, formulário, carrossel com múltiplos slides
nem cabeçalho fixo no scroll. O `functions.js` original
inicializava tudo isso, mas nenhuma das 41 páginas usa — foi por isso que a
remoção do jQuery coube em 8 KB.

Também não há `<iframe>` no HTML gerado (os vídeos são fachada), nenhum ícone
`.far`, e nenhuma regra que use Nunito — a fonte era baixada e nunca aplicada.

## Onde os dados moram

Desde o refino de agosto/2026, **dado não é markup**. Resorts associados,
parceiros, diretoria e contato ficam em [`src/data/`](src/data/); rota, `title`,
`description` e qualquer texto que traduza ficam em
[`src/i18n/ui.ts`](src/i18n/ui.ts).

A regra prática: **o que traduz vai em `ui.ts`, o que não traduz vai em
`src/data/`.** Nome de resort, URL, foto e cargo não traduzem. Rótulo de aba,
título de seção e a dupla `title`/`description` traduzem.

Editar markup de página para acrescentar um resort ou um parceiro é o caminho
errado — foi exatamente assim que a home em espanhol ficou com um logo a menos e
a página inglesa de associe-se com dois parceiros a mais.

**Há um limite nessa regra, e a Etapa 6 o encontrou: corpo de documento não vai
para o `ui.ts`.** Os termos de uso e a política de privacidade traduzem, mas são
~1.500 e ~4.000 palavras por idioma — pô-los ali transformaria um arquivo de
rótulos curtos num repositório de prosa jurídica, e não resolveria nada: o texto
continuaria existindo três vezes, só que mais longe da página que o exibe. O
critério que vale é **o que se repete entre páginas mora no `ui.ts`; o que existe
uma vez mora onde é lido.** Dali saem o título e o rótulo da data; o corpo fica
na página. O que não é texto — a data de vigência de cada documento — está em
[`src/data/juridico.ts`](src/data/juridico.ts), porque ela é a mesma nos três
idiomas e já tinha seis cópias.

Quando uma etapa toca texto traduzido, **ler os três idiomas lado a lado faz
parte da etapa**. Foi assim que apareceu o "Leia agora" em duas páginas inglesas,
e foi assim que se descobriu que a política de privacidade inglesa tinha um
capítulo inteiro em espanhol — o que declara a lei aplicável e o foro. Nenhum dos
quatro portões vê isso, e não há portão barato que veja: a estrutura estava
certa.

**Publicações e estudos são Content Collections**, não `src/data/`: os dados
ficam em [`src/content/*.yaml`](src/content/), o schema em
[`src/content.config.ts`](src/content.config.ts) e o acesso em
[`src/conteudo.ts`](src/conteudo.ts). Página nenhuma chama `getCollection` —
elas pedem `publicacoesEm(lang)` e recebem strings já resolvidas.

Ali um mesmo item mistura o que traduz com o que não traduz, e o campo carrega
essa distinção como o `cargo` da diretoria já fazia: **string quando não traduz,
mapa por idioma quando traduz** — e nesse caso o Zod exige os três. Acrescentar
um estudo é acrescentar um item ao YAML; fazê-lo no markup foi o que deixou dois
cartões dizendo "Leia agora" nas páginas inglesa e espanhola.

## Ao extrair markup para componente

O diff visual custa 15 minutos e diz só que a página mudou. Antes dele, compare
o **HTML gerado**: normalize o espaço em branco, ignore os atributos que não
afetam layout (`href`, `alt`, `aria-*`, `rel`, `target`) e compare a sequência de
tags, classes e texto. A divergência aparece em segundos, com o nome da tag.

Três omissões que só esse método pegou, e que nenhum erro de build revelaria:

- os 11 `<div class="line">` entre estados na página de associados — separadores
  visuais que um extrator focado em dados não captura;
- os `</div>` de fechamento do carrossel da home, engolidos por um recorte que ia
  até o próximo comentário HTML. Teria fechado o `<section>` cedo demais;
- o **espaço em branco ao lado de uma expressão**: o Astro apara o espaço em
  volta de `{...}`, então `{t.leiaAgora} <i>` gera `Leia agora<i>` e o ícone cola
  na palavra. Aconteceu nas seis páginas de publicações e estudos ao mesmo
  tempo. A correção é `{t.leiaAgora}{' '}`.

Ao trocar um bloco por componente, prefira recortar um trecho **balanceado**
(um `<ul>…</ul>` inteiro) a recortar até um comentário — e confira a contagem de
`<div>` contra a de `</div>` no recorte antes de aplicar.

## Antes de concluir que algo do tema está quebrado

O `style.css` tem 21 mil linhas e a mesma classe aparece em contextos diferentes.
Ao investigar, **meça no navegador antes de concluir pelo seletor**.

Exemplo real: a única regra que revela `.dropdown-menu` depende de
`.hover-active`, classe que ninguém aplica desde a saída do jQuery — o que
sugeria que os submenus de desktop estavam quebrados. Não estavam: aquela regra
vive dentro de `@media (max-width: 991.98px)` e o desktop usa outro caminho. Um
teste de hover no Playwright resolveu em um minuto o que a leitura do CSS
apontava errado.
