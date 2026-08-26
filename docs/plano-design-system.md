# Design system Resorts Brasil — reconstrução da camada de apresentação

## Contexto

O site roda hoje sobre o tema Inspiro: 21.083 linhas de `style.css`, Bootstrap,
196 cores, 110 `!important` e um vocabulário de classes que ninguém escolheu. A
refatoração de 2026 tirou o jQuery e provou o custo dessa herança — três
regressões silenciosas, todas do mesmo padrão (plugin removido, CSS que dependia
dele ficou inerte), mais um script de purga que existe só para conter o tema e
que já cortou o CSS a 11,7 KB com o build passando.

O site é vivo e vai crescer: novas páginas, conteúdo e landing pages. Continuar
sobre o tema significa que cada página nova nasce herdando a armadilha. A
evidência disso já está no repositório: quando o projeto encontrou uma landing
page, o resultado foi [ebook.astro](src/pages/ebook.astro) com 1.086 linhas e 140
`style=` inline.

O objetivo é substituir a camada de apresentação por um design system próprio —
tokens, componentes com contrato, catálogo e invariantes verificadas no build —
**preservando a aparência atual**, as 40 URLs e as três traduções.

### O que a auditoria encontrou

| achado | medida |
|---|---|
| CSS em produção (já purgado) | 68 KB, 751 blocos, 110 `!important` |
| classes distintas em todo o markup | 196 |
| `style=` inline | 549, sendo 420 nas 3 páginas de ebook |
| imagens sem pipeline | 8,5 MB, 200 arquivos, `astro:assets` não usado |
| heros superdimensionados | 3,2 MB em 9 arquivos, 2250×1500 exibidos a 360 px |
| `<img>` com `loading=` | 1 de 193 |
| hierarquia de headings quebrada | **39 das 40 páginas** (só a 404 passa) |
| dado ainda em markup | 7 publicações, 4 estudos, 43 autores do ebook — × 3 idiomas |
| HTML malformado | `<p>` fechado com `</h4>` nas 3 páginas de história, linha 17 |

Divergências estruturais já existentes entre idiomas (mesma página, markup
diferente): `index` tem um bloco de heading a mais que `home`/`inicio`;
`associates` tem uma seção `box-fancy` que PT e ES não têm; `publicacoes` tem um
`<br>` a mais e um `m-b-30` a menos que `publications`.

---

## Decisões travadas

| decisão | valor |
|---|---|
| CSS | **Tailwind v4** via `@tailwindcss/vite` (`npx astro add tailwind`) — o `@astrojs/tailwind` está descontinuado |
| Tokens | duas camadas: primitivos + semânticos, em `@theme` |
| Alvo de navegadores | Safari 15.4+ / Chrome 105+ — destrava `@layer`, container queries, `:has()` |
| `body class="modern"` | uniformizado nas 40 páginas (hoje 7 não têm) |
| Modo escuro | **tokens preparados, tema não implementado** |
| Refino visual | **aproveitar o que Astro + Tailwind oferecem**, inclusive quando muda pixel; o site continua reconhecível, não idêntico |
| Conteúdo | Content Collections com schema enxuto, isolado para estender sem tocar páginas |
| Ebook | dentro do plano, última etapa |

### Refinos incluídos

O ponto de reescrever é colher o que a stack nova oferece. Cada item abaixo
altera pixels de propósito, mantendo layout, paleta e estrutura reconhecíveis:

| refino | o que substitui | ganho |
|---|---|---|
| **Tipografia fluida** com `clamp()` | escala em degraus por breakpoint | fim dos saltos entre faixas; menos media queries |
| **`text-wrap: balance`** em títulos, `pretty` em parágrafos | quebra de linha ao acaso | títulos sem órfã de uma palavra |
| **View Transitions** do Astro (`<ClientRouter />`) | recarga dura entre páginas | navegação contínua nos 3 idiomas |
| **Ícones em SVG inline** via `<Icone>` | webfonts subsetadas (2,9 KB) | some o FOIT, o [subset-fonts.py](scripts/subset-fonts.py) e o [check-glifos.mjs](scripts/check-glifos.mjs) — são só 16 ícones |
| **Escala de espaço harmônica** | `0/5/10/20/30/40/80/100/150/200`, irregular | ritmo vertical coerente |
| **Container queries** | classes de breakpoint aplicadas em JS | colunas do carrossel e das grades viram CSS; [site.js](src/scripts/site.js) encolhe |
| **`:has()`** | classe manual `hero-fullscreen` | a página acerta sozinha |
| **`aspect-ratio`** | `height: 360px` inline nos heros | hero responsivo de verdade |

**Consequência de sequenciamento, e é a mais importante do plano:** com pixel
livre, `visual-diff.mjs` deixa de ser portão e vira changelog revisado. A rede de
segurança precisa mudar de lugar **antes** da primeira página migrar — daí a
Etapa 0.5. Migrar sem ela é atravessar todo o projeto sem verificação
automatizada de layout.

---

## Arquitetura alvo

### Camadas de token

Componente consome **apenas** a camada semântica. É o que torna um ajuste de
marca ou um tema escuro uma edição de um arquivo em vez de uma varredura.

```
src/styles/tokens.css
  @theme {
    /* primitivos — os valores medidos do site atual */
    --color-azul-600: #0c71c3;
    --color-carvao-900: #0c101b;
    ...
    /* semânticos — o que os componentes usam */
    --color-acao-primaria: var(--color-azul-600);
    --color-superficie-inversa: var(--color-carvao-900);
    --color-texto-sutil: ...;
  }
```

As 21 cores reais do markup consolidam em ~8 primitivas e ~15 papéis. Espaço,
tipo, raio e sombra saem dos valores medidos, **não redesenhados**.

### Estrutura de arquivos

```
src/styles/
  tokens.css       @theme — fonte única de cor, tipo, espaço, raio, sombra
  base.css         elementos: h1–h6, p, a, ul, table, :focus-visible
  global.css       @import "tailwindcss" + os dois acima
src/components/
  primitivos/      Titulo, Texto, Botao, Imagem, Icone
  layout/          Secao, Container, Grade
  padroes/         CartaoMembro, CaixaIcone, CartaoPublicacao, ChamadaAcao,
                   Hero, FaixaDestaque, ListaIcones, Contador, Abas, LinkAcao
  cromo/           Cabecalho, Rodape, FaixaCookies, IconesSociais,
                   VoltarAoTopo — acrescentado na Etapa 5, ver abaixo
  (existentes)     Header, Footer, SocialIcons, YouTube, GradeLogos,
                   CarrosselAssociados, AssociadosTabs,
                   SecaoCookies
src/content/       publicacoes/, estudos/ — Content Collections com Zod
src/pages/design/  catálogo vivo, noindex, fora do sitemap
```

### As quatro disciplinas

1. **Componente para o que se repete, utilitária para o que é único.** As
   utilitárias moram *dentro* do componente. `team-member` aparece 124 vezes —
   vira `<CartaoMembro>`, não uma cadeia copiada.
2. **`@theme` é a fonte única.** Nada de `bg-[#0c71c3]` fora de exceção
   justificada.
3. **Nada de `@apply`.** Quando precisar de CSS de verdade, escreva CSS de
   verdade em `<style>` com escopo.
4. **CSS complexo fica em `<style>` comentado.** Kenburns, carrossel, masonry,
   estados de menu — exatamente onde o projeto já se queimou três vezes.

### Nível semântico ≠ tamanho visual

A causa dos 39 headings quebrados é escolher a tag pelo tamanho
([historia.astro:14](src/pages/historia.astro#L14) tem `<h1 class="text-md h2">`).
O componente separa os dois eixos:

```astro
<Titulo nivel={2} tamanho="md">
```

`nivel` controla a tag, `tamanho` controla a aparência. Enquanto a tag carregar
o estilo, o erro volta na próxima página.

---

## Estratégia de migração

**Strangler por página, sempre nos três idiomas juntos.** Migrar um idioma
sozinho é exatamente como as divergências atuais nasceram.

O mecanismo que torna isso seguro **mudou de forma na Etapa 5, e a nota fica
aqui porque o resto do plano ainda cita a versão antiga.**

*O plano dizia:* uma prop `legado` no `BaseLayout` decidiria se a página recebe
os `<link>` de `plugins.css` / `style.css` / `ajustes.css`.

*O que se descobriu:* aquela prop nunca foi usada por página nenhuma, e não podia
ser — o mesmo layout renderiza `Header` e `Footer` do tema, então `legado={false}`
entregaria uma página sem cabeçalho e sem rodapé. E um `if` no layout também não
serviria: o Astro empacota CSS pelo **grafo de módulos**, não pelo que a página
renderiza, então bastaria *importar* um componente novo — mesmo num ramo morto —
para o `<style>` dele contaminar as 40 páginas do tema.

*O que vale:* **dois layouts** sobre um `<head>` compartilhado.

| arquivo | quem usa |
|---|---|
| [`Cabeca.astro`](src/layouts/Cabeca.astro) | os dois. Sem `<style>`, e isso é requisito |
| [`BaseLayout.astro`](src/layouts/BaseLayout.astro) | as páginas do tema |
| [`LayoutSistema.astro`](src/layouts/LayoutSistema.astro) | as migradas; é quem importa `global.css` |

Uma prop dá para esquecer; um layout errado entrega uma página sem cabeçalho na
primeira vez que você olha. Quando a última página migrar, o `BaseLayout` e os
três arquivos de CSS morrem juntos.

---

## Etapas

### Etapa 0 — Fundação ✅ CONCLUÍDA

Tailwind v4.3.3 via `@tailwindcss/vite`; tokens em duas camadas
([tokens.css](src/styles/tokens.css)) e base restaurada
([base.css](src/styles/base.css)) a partir de valores **medidos** por
[medir-base.mjs](scripts/medir-base.mjs); catálogo em `/design`; invariantes em
[verifica-sistema.mjs](scripts/verifica-sistema.mjs), ligadas ao build.

**O plano errou o mecanismo de isolamento.** A prop `legado` sozinha não
protege: importar a folha no layout fez 22 das 40 páginas divergirem, porque
`@layer` garante que o tema vence só onde ele *declara a mesma propriedade* — o
Preflight vaza no resto (`border-style` none→solid em ~2200 elementos,
`display` inline→block em img/svg, `max-width`, `list-style-type`), e a varredura
automática do Tailwind ainda colide com nomes de classe do tema. A folha passou a
entrar pelo **frontmatter da página migrada**, com `source(none)` e `@source`
explícitos. Isolamento por ausência, verificado no `dist/`.

**`1rem` valia 14px** (`:root{font-size:14px}` do tema) — encolheria a escala do
Tailwind em 12,5% e anula a preferência de fonte do navegador. Root de volta a
100%, tokens compensando.

Detalhes em [docs/decisoes.md](docs/decisoes.md), seção "Design system".

<details><summary>Especificação original</summary>

- `npx astro add tailwind`; `src/styles/global.css` importado pelo BaseLayout.
- Prop `legado` no BaseLayout, `true` por padrão. Nada muda de aparência.
- **Medir a base do tema no navegador**, não ler o CSS: valores computados de
  `h1`–`h6`, `p`, `ul`, `a`, `body` (tamanho, peso, `line-height`, margens) nas
  40 páginas × 3 viewports.
- Essas medidas viram **âncoras do `clamp()`**: o valor de mobile é o mínimo, o
  de desktop é o máximo, e o meio da escala passa a interpolar em vez de saltar.
  É onde o refino entra sem descaracterizar nada — os extremos continuam sendo
  os de hoje.
- `tokens.css` com as duas camadas; escala de espaço harmônica derivada da
  irregular atual.
- ~~`<ClientRouter />` no BaseLayout.~~ **Adiado — ver nota abaixo.**
- Rota `/design` vazia, `noindex`, fora do sitemap
  ([astro.config.mjs](astro.config.mjs) já tem `filter`).

> **Risco principal do projeto inteiro está aqui.** O Preflight do Tailwind zera
> margens e estilos de heading e lista. `base.css` precisa reestabelecer a base
> **antes** de qualquer página migrar, senão cada página migrada carrega o
> desvio e ninguém sabe se a diferença é o refino ou o reset.
> Verificação: página de teste com um de cada elemento, comparada lado a lado
> com a mesma página servida pelo tema, nos 3 viewports.

</details>

#### Nota de execução — View Transitions adiadas para depois da Etapa 3

O plano previa `<ClientRouter />` aqui. A leitura do [site.js](src/scripts/site.js)
mostrou que o custo é maior do que uma troca de evento:

- **6 listeners persistentes** em `document`/`window` (resize ×3, click, scroll,
  load), **1 `setInterval`** (autoplay do carrossel de logos, linha 239) e **1
  `IntersectionObserver`** (contadores, linha 346). Com `astro:page-load`
  ingênuo, tudo isso **acumula a cada navegação** — o carrossel aceleraria
  progressivamente e nunca pararia. É defeito visível, não teórico.
- Exige um ciclo de vida real: `AbortController` por página, `signal` em cada
  listener, e teardown em `astro:before-swap`.
- **GTM**: sem carga de página, o pageview não dispara sozinho. Precisa de push
  manual no `astro:page-load`, e com Consent Mode no meio.

Fazer isso agora seria refatorar um `site.js` que a Etapa 3 vai encolher de novo
— as container queries tiram dele a lógica de faixa. Ordem melhor: migrar as
funções, deixar o arquivo no formato final, e só então instalar o ciclo de vida
e o `<ClientRouter />` de uma vez. **Nada do refino se perde; muda a ordem.**

### Etapa 0.5 — Mudar a rede de segurança de lugar ✅ CONCLUÍDA

Entregue em [tests/verify-geometria.mjs](tests/verify-geometria.mjs), com a lista
de páginas compartilhada em [tests/paginas.mjs](tests/paginas.mjs) para não
divergir do diff visual. Ligada ao `npm run verify`.

**Linha de base: 120 verificações, zero bloqueios.** Nenhuma seção colapsada,
imagem quebrada, grade sem colunas ou sobreposição em nenhuma das 40 páginas × 3
viewports.

**72 pendências, todas o mesmo defeito herdado:** o `.row` do Bootstrap tem
margem negativa e faz a página transbordar 30px no mobile e 12px no desktop —
medido idêntico no site original. É dívida do tema, não regressão, e é uma das
coisas que a migração deve **consertar**, não herdar. Vira bloqueante página a
página conforme cada uma migra.

Duas correções de método durante a construção, ambas achadas por teste negativo
com defeitos plantados: filtrar visibilidade só por `display` acusou 36 abas
fechadas como defeito; filtrar também pela caixa consertou aquilo e desligou a
detecção de colapso (5 defeitos plantados, 2 achados). `checkVisibility()`
separa "não renderizado" de "renderizado com caixa zero", que é a distinção de
que a suíte inteira depende.

<details><summary>Especificação original</summary>

Precede qualquer migração de página. Hoje o layout é protegido pelo diff visual;
com pixel livre isso acaba, e [verify-behaviors.mjs](tests/verify-behaviors.mjs)
(496 linhas, 14 checagens) passa a carregar a carga sozinho. Ele já passou
14/14 durante todo o período em que a grade de logos estava quebrada — do jeito
que está, não serve.

Expandir para cobrir o que o diff cobria, medindo **geometria**, não pixel:

- toda grade e todo carrossel: número de colunas por faixa, altura de célula
  não-zero, sem sobreposição — a checagem que teria pego a grade de logos;
- todo hero: altura renderizada dentro de uma faixa esperada, imagem carregada,
  `.kenburns-bg` visível e animando;
- nenhuma seção com altura zero em nenhuma das 40 páginas × 3 viewports —
  varredura barata que pega colapso de layout;
- sem overflow horizontal em nenhuma página × viewport;
- os estados de menu, dropdown, abas e cookies que já existem.

Isso roda em segundos contra o preview, não nos 15 minutos do diff visual, e é o
portão que substitui o `120/120`.

</details>

### Etapa 1 — Primitivos e catálogo ✅ CONCLUÍDA

Os oito entregues: [Titulo](src/components/primitivos/Titulo.astro),
[Texto](src/components/primitivos/Texto.astro),
[Botao](src/components/primitivos/Botao.astro),
[Icone](src/components/primitivos/Icone.astro),
[Imagem](src/components/primitivos/Imagem.astro),
[Secao](src/components/layout/Secao.astro),
[Container](src/components/layout/Container.astro) e
[Grade](src/components/layout/Grade.astro), todos no catálogo `/design` com as
variantes e os cinco estados.

**"Catálogo escrito depois nunca é escrito" virou portão**, e não frase:
`verifica-sistema.mjs` reprova o build se um componente de `primitivos/` ou
`layout/` não for importado pelo `/design`. Os oito também entraram em
`MIGRADAS`, então cor literal e `style=` inline neles bloqueiam desde já.

**Três valores do `tokens.css` não sobreviveram à medição.** O
`medir-base.mjs` da Etapa 0 cobre o elemento nu; o que tem classe ficou de fora,
e era ali que estavam os erros. `scripts/medir-primitivos.mjs` fechou o buraco —
botão, seção, container, grade e ícone, com o **hover medido**:

| token | estava | medido |
|---|---|---|
| `--container-conteudo` | 1140px (padrão do Bootstrap) | **1500px** |
| `--color-acao-primaria` | `#0c71c3`, por contagem no markup | **`#2250fc`**, medido no `.btn` |
| `--radius-sm` / `--radius-md` | a fração do tema, sob root de 14px | **os pixels medidos** |

O primeiro sozinho teria feito a primeira página migrada nascer 24% mais estreita
que o site. Detalhes e os quatro deltas deliberados em
[docs/decisoes.md](docs/decisoes.md), "Etapa 1".

**Dois refinos da lista foram antecipados**, porque um primitivo com
implementação provisória contamina tudo que o usa:

- **`<Icone>` já é SVG inline.** Os 16 contornos saem das próprias webfonts do
  tema por `python scripts/glifos-para-svg.py`, e
  [verify-icones.mjs](tests/verify-icones.mjs) compara desenho a desenho contra a
  fonte de origem — o portão que faltava quando o subset apagou as setas de 6
  páginas sem erro de build. A remoção das webfonts continua na Etapa 11.
- **`<Grade>` já usa container query.** A contagem de colunas responde à largura
  do pai, não à da janela, e com isso some a dependência das faixas que o
  JavaScript aplicava no `<body>` — e o erro de ler o array errado, que já custou
  22 comparações de tablet neste projeto. O `gap` também elimina a margem
  negativa do `.row`, que é a origem das 72 pendências de transbordo.

Duas mudanças de método: o `/design` entrou na varredura de geometria (e
reprovou na primeira execução, por transbordo de 25px na escala tipográfica), e
a purga passou a ignorar as páginas já migradas — o CSS do tema agora **encolhe a
cada etapa** em vez de esperar a Etapa 11.

<details><summary>Especificação original</summary>

`Titulo`, `Texto`, `Botao`, `Imagem`, `Icone`, `Secao`, `Container`, `Grade`.
Props tipadas com variantes enumeradas — o `astro check` já roda no build, então
variante inválida vira erro de compilação.

Cada primitivo entra no catálogo `/design` com **todas** as variantes e os cinco
estados (repouso, hover, `:focus-visible`, ativo, desabilitado) no mesmo commit
que o componente. Catálogo escrito depois nunca é escrito.

</details>

### Etapa 2 — Pipeline de imagens ✅ CONCLUÍDA

As 198 imagens saíram para `src/assets/imagens/` (`favicon.png` e `og-image.png`
ficaram em `public/`), e o `<Imagem>` passou a entregar AVIF com reserva em WebP,
`srcset`, `sizes`, dimensão sempre presente e `loading="lazy"` por padrão.

**O acervo mudou de lugar sem que as 40 páginas do tema soubessem.**
[`scripts/imagens.mjs`](scripts/imagens.mjs) lê o HTML gerado e copia para
`dist/images/` só o que ainda é pedido pelo caminho antigo — mesmo mecanismo que
o `purge-css.mjs` adotou na Etapa 1, e com o mesmo efeito: cada página migrada
leva junto o que só ela mantinha.

**Os 183 caminhos de `src/data/` não mudaram uma linha.**
[`src/imagens.ts`](src/imagens.ts) resolve `/images/…` para o módulo otimizado,
então `logo: '/images/associados/almenat.png'` continua sendo dado, e não
`import`. O preço apareceu medindo: o Vite emite todo arquivo importado, usado ou
não — 8,5 MB duplicados no `dist/`. A purga do que ninguém referencia entrou no
mesmo script.

**`quality: 80` fazia o AVIF sair 50% MAIOR que o WebP.** `quality` não é escala
comum entre codecs. Medindo por fidelidade
([`scripts/medir-imagens.mjs`](scripts/medir-imagens.mjs), pixelmatch contra o
original), **50 é o piso**: abaixo aparece diferença perceptível, acima só
aumenta o arquivo. O hero de 646 KB entrega 36 KB no mobile e 113 KB em 1280px.

**O quarto portão duro passou a existir:**
[`tests/verify-orcamento.mjs`](tests/verify-orcamento.mjs) grava o peso de cada
página em cada viewport e reprova quando ela engorda mais de 5%. Catraca, não
teto — teto único reprovaria a home e liberaria a 404 no mesmo número. Linha de
base com o tema ainda em 40 páginas: `index` 4,4 MB, `ebook` 1,1 MB, `404`
100 KB, `design` 78 KB.

Os heros em `background-image` inline continuam nas páginas do tema; eles viram
`<Imagem>` quando cada página migrar (Etapas 5–10), que é quando o
`aspect-ratio` substitui o `height: 360px`. O componente já suporta os dois.

Detalhes, e os três erros de método corrigidos no caminho, em
[docs/decisoes.md](docs/decisoes.md), "Etapa 2".

<details><summary>Especificação original</summary>

O maior ganho de performance disponível e um componente de design system: toda
landing page futura nasce otimizada sem ninguém lembrar.

- Imagens que passam pelo pipeline migram `public/images/` → `src/assets/`;
  `favicon.png` e `og-image.png` **ficam em `public/`** (referenciados
  externamente).
- `<Imagem>` embrulha o `<Image>` do `astro:assets` com padrões corretos:
  AVIF/WebP, `srcset`, `loading="lazy"` (exceto o primeiro hero de cada página),
  `decoding="async"`, `width`/`height` obrigatórios.
- **Heros:** hoje são `background-image` em `style=` inline, o que impede
  `srcset` e lazy. Viram `<Image>` com `object-fit: cover` dentro de um
  contêiner com `aspect-ratio`, no lugar do `height: 360px` fixo — a caixa passa
  a acompanhar a largura em vez de recortar mais em tela estreita.
- `sharp` já está instalado.

</details>

### Etapa 3 — Padrões ✅ CONCLUÍDA

Os nove previstos, mais um: [`LinkAcao`](src/components/padroes/LinkAcao.astro),
o `.item-link` do tema. Ele entrou porque vive dentro de três dos outros —
chamada, cartão de publicação e cartão de modalidade — e sem componente os três
repetiriam a mesma marcação **e o mesmo hover**, que é a parte que este projeto
aprendeu a não inventar. Todos no catálogo `/design`, e `verifica-sistema.mjs`
passou a cobrir `padroes/` no mesmo portão que já cobria `primitivos/` e
`layout/`.

Os valores saem de [`medir-padroes.mjs`](scripts/medir-padroes.mjs), terceiro da
família do `medir-base` e do `medir-primitivos`, com o **hover medido**.

**A última linha da especificação original não foi executada, e não podia ser.**
"Portar os componentes existentes para os primitivos novos" significa emitir
markup que só o design system estiliza — e a folha nova entra pelo frontmatter da
*página*, nunca pelo layout. Portar `GradeMembros` sem migrar `/diretoria` a
deixaria sem estilo nenhum. Portar aqueles quatro componentes **é** migrar as
páginas deles, que é o que as Etapas 5–9 fazem; cada padrão desta etapa é o
substituto que já espera. A tabela está em [docs/decisoes.md](docs/decisoes.md),
"Etapa 3".

**Um token estava errado pelo mesmo motivo de sempre.**
`--color-superficie-inversa` (`#0c101b`) veio de contagem de ocorrências; medido,
o `.call-to-action.background-dark` é o navy do site. As 141 ocorrências do
carvão estão todas no ebook, que tem paleta própria — são duas superfícies com
papéis diferentes, e entrou `--color-superficie-marca`. Terceira vez que contar
no HTML dá resposta diferente de medir no navegador.

**Uma regra do `base.css` nunca tinha valido.**
`:where(.superficie-inversa) :where(p, li, small)` pesa `0-0-0` e perdia para o
`p` de vinte linhas acima — então o parágrafo em seção escura ficava cinza sobre
navy, 1,5:1. Nenhum portão via: o diff visual não tem seção escura para comparar,
a geometria não lê cor, e a checagem de contraste ainda não existe. Apareceu numa
captura de tela.

**Três dependências de JavaScript que não deveriam existir foram desfeitas:** o
número do contador não existia sem script (`<span data-to="83"></span>` vazio),
as legendas do hero nasciam com `opacity: 0` — a mesma forma da regressão que
deixou seis páginas invisíveis —, e `prefers-reduced-motion` zerava a duração da
animação mas não o atraso.

**O catálogo reprovou duas vezes antes de qualquer página migrar**, que é a razão
de ele estar na varredura de geometria: a faixa de seis blocos cortava o título,
e o `"21 mil"` do contador quebrava em duas linhas e desalinhava a fileira.

Diff visual em `/index`, `/associados` e `/historia`: **9/9 idênticas** — a etapa
não migrou página nenhuma. Detalhes em [docs/decisoes.md](docs/decisoes.md),
"Etapa 3".

<details><summary>Especificação original</summary>

`CartaoMembro` (124 usos), `ChamadaAcao` (51), `CaixaIcone` (36),
`CartaoPublicacao` (27), `ListaIcones` (24), `Hero`, `FaixaDestaque`, `Contador`,
`Abas`. Portar os componentes existentes para os primitivos novos.

</details>

### Etapa 4 — Conteúdo ✅ CONCLUÍDA

Duas coleções em [`src/content.config.ts`](src/content.config.ts), carregadas do
`file()` loader sobre YAML: [`publicacoes.yaml`](src/content/publicacoes.yaml) e
[`estudos.yaml`](src/content/estudos.yaml). Quem resolve o idioma e a ordem é
[`src/conteudo.ts`](src/conteudo.ts); as páginas só pedem
`publicacoesEm('en-us')` e recebem strings prontas.

**São 5 publicações, não 7.** O número do plano veio de contar arquivos em
`src/assets/imagens/publicacoes/`, e duas daquelas capas não são referenciadas
por página nenhuma — estão entre as 17 imagens órfãs que a Etapa 2 já havia
listado. Mesmo erro de método das cores contadas no markup, agora em imagem.

**A coleção de estudos é o melhor argumento da etapa.** Os dois estudos mais
recentes foram acrescentados direto no markup dos três idiomas, e a tradução
ficou pela metade: as páginas inglesa e espanhola diziam **"Leia agora"** nos
dois primeiros cartões e "Read now" / "Lea ahora" nos dois últimos. O rótulo
passou para o `ui.ts`, e o defeito deixa de ter por onde voltar.

O campo traduzível segue o precedente do `cargo` em `src/data/diretoria.ts`:
string quando não traduz (nome próprio, título publicado só em português), mapa
por idioma quando traduz — e aí o Zod **exige os três**. O `Record<Locale, …>` do
schema amarra isso ao `src/i18n/ui.ts`: um quarto idioma para de compilar aqui,
em vez de gerar página com campo vazio.

Dois componentes de transição, [`ListaPublicacoes`](src/components/ListaPublicacoes.astro)
e [`ListaEstudos`](src/components/ListaEstudos.astro), ainda emitem o markup do
tema — eles somem na Etapa 7, quando as três páginas passarem para o
`<CartaoPublicacao>`. Substituíram 27 blocos escritos à mão.

**A comparação de HTML normalizado pegou uma regressão que o diff visual não
pegaria**: o Astro apara o espaço em volta de uma expressão, então
`{t.leiaAgora} <i>` gerava `Leia agora<i>` — o chevron colado na palavra, nas
seis páginas.

Diff visual nas seis: **17/18 idênticas**. A única divergência é anterior e não
foi introduzida aqui — verificada nos builds da Etapa 2 e da Etapa 3, com o mesmo
número. Ver [docs/deltas-visuais.md](docs/deltas-visuais.md), "Etapa 4".

<details><summary>Especificação original</summary>

Content Collections com Zod para publicações (7) e estudos (4). Schema enxuto,
mas isolado: acrescentar campo depois não toca as páginas. Campo faltando vira
erro de build.

</details>

### Etapa 5 — Páginas pequenas ✅ CONCLUÍDA

As dez entregues: `404`, mais `historia`, `fale-conosco` e `diretoria` nos três
idiomas. **11 de 41 páginas migradas, medido no `dist/`.**

**A etapa começou descobrindo que ela não podia começar.** A prop `legado` do
BaseLayout — o mecanismo de convivência previsto desde a Etapa 0 — nunca tinha
sido usada por página nenhuma, e não podia ser: o mesmo layout renderiza `Header`
e `Footer`, que são markup do tema. `legado={false}` entregaria uma página sem
cabeçalho, sem rodapé, sem faixa de cookies e sem voltar-ao-topo. O catálogo
`/design` já contornava isso não usando o BaseLayout; a consequência é que **não
existia Etapa 5 antes de existir cromo**.

Um `if` no layout também não resolveria: o Astro empacota CSS pelo grafo de
módulos, então bastaria *importar* o componente novo — mesmo num ramo que nunca
executa — para o `<style>` dele entrar no bundle das 40 páginas do tema. A
escolha subiu um nível: **dois layouts** ([`BaseLayout`](src/layouts/BaseLayout.astro)
e [`LayoutSistema`](src/layouts/LayoutSistema.astro)) sobre um `<head>`
compartilhado ([`Cabeca`](src/layouts/Cabeca.astro)). Um layout errado entrega uma
página sem cabeçalho na primeira vez que você olha; uma prop dá para esquecer.

Daí nasceu **`cromo/`, a quarta camada de componentes**: `Cabecalho`, `Rodape`,
`FaixaCookies`, `IconesSociais` e `VoltarAoTopo`, com valores de
[`medir-cromo.mjs`](scripts/medir-cromo.mjs) — o quarto da família, e o primeiro
que precisou medir **estado aberto**, porque menu, submenu e seletor de idioma
não têm geometria em repouso.

**Um `site.js` só continua servindo as duas camadas**, pelos mesmos nomes de
estado. A suíte comportamental passou a exigir isso: de 14 para **51 checagens**,
com o cromo testado nas duas camadas — ela usava `/historia.html` para tudo, e
aquela página migrou.

**Três portões estavam cegos, e os três enxergam agora:**

- o **checador de headings lia o fonte**, e página migrada não tem `<h1>` no
  fonte — tem `<Titulo nivel={1}>`. Ele não via heading nenhum e dava a página por
  boa; de quebra, reprovava por causa dos *comentários* que citam markup. Passou a
  ler o `dist/`, que é onde o sumário real existe — cromo incluído;
- a **varredura de geometria não via texto vazar da própria caixa**. Um e-mail de
  28 caracteres saía da coluna e passava por cima da vizinha na página de contato,
  em 390px: não há caixa zerada, nem grade colapsada, e a checagem de sobreposição
  compara *caixas*. Entrou a checagem 6, confirmada por teste negativo;
- o **orçamento** confirmou o ganho: `diretoria` caiu de 478 para 279 KB.

E a dívida de transbordo horizontal caiu de **72 para 53** — a margem negativa do
`.row` some com a `<Grade>`, como a Etapa 1 previa.

Duas coisas voltaram para os componentes: a `<CaixaIcone>` perdeu uma margem que
estava no lugar errado (o `gap` da `<Grade>` já fazia aquele vão), e a `<Grade>`
ganhou `piso` — quatro colunas de cartão e quatro de texto não querem o mesmo
mínimo. Detalhes, e as correções de contraste do menu, em
[docs/decisoes.md](docs/decisoes.md), "Etapa 5", e em
[docs/deltas-visuais.md](docs/deltas-visuais.md).

### Etapa 6 — Termos de uso e política de privacidade ✅ CONCLUÍDA

As seis entregues: `termos-de-uso` e `politica-de-privacidade`, nos três idiomas.
**17 de 41 páginas migradas, medido no `dist/`.**

Dois componentes novos, e os dois nasceram de medição:
[`Prosa`](src/components/padroes/Prosa.astro), o ritmo de um documento de texto
corrido, e [`Tabela`](src/components/padroes/Tabela.astro), para as três tabelas
de cookies. Os valores saem de
[`medir-documento.mjs`](scripts/medir-documento.mjs), **quinto da família** — o
primeiro a olhar para a única coisa no site que é só parágrafo.

**A linha tinha 127 caracteres no desktop.** Nas duas páginas o `<p>` é filho
direto do `.row` e herda os 1500px do container; a faixa em que se lê sem perder
a linha é 45–75. O valor que corrige não precisou ser escolhido — **é o da
própria página no tablet**, 688px, onde ela mede exatamente 75. Virou
`--container-texto`, e é o que a `largura="estreita"` do `<Container>` passa a
valer; ela apontava para `max-w-3xl`, um padrão do Tailwind que ninguém tinha
medido e que nenhuma página tinha usado ainda.

**O `<Prosa>` deliberadamente não redefine tamanho, peso nem cor.** Isso é do
`base.css`, e estas duas páginas são o teste dele — um componente que o
sobrepusesse apagaria a única evidência que a etapa produz. Ele responde por três
coisas que só existem quando o texto é longo: o vão entre capítulos (60px
medidos, que eram um `<div class="space">` vazio repetido 22 vezes), a citação e
a cor da lista.

**A política de privacidade inglesa tinha um capítulo em espanhol.** "Applicable
law and jurisdiction" trazia, palavra por palavra, o parágrafo da página
espanhola; e o capítulo anterior, "Changes to this policy", trazia o texto do
foro. Alguém colou o parágrafo do foro no lugar do de alterações e preencheu a
vaga que sobrou com o espanhol. **Nenhum dos quatro portões via, e não há portão
barato que veja** — os headings batem, a contagem de parágrafos bate, a geometria
é idêntica. Só lendo os três idiomas lado a lado.

**O portão reprovou o commit que consertava o defeito**, pela segunda vez com a
mesma forma: o checador de `style=` inline contava as ocorrências dentro dos
*comentários* que explicam o `style=` removido — como o checador de headings já
tinha feito na Etapa 5. Entrou `linhasSemComentario()`, compartilhada pelas duas
checagens.

E a dívida de transbordo horizontal caiu de **53 para 45**: some o `.row` das
seis páginas e some a tabela de cookies, que media 445px numa coluna de 358px.

Detalhes em [docs/decisoes.md](docs/decisoes.md), "Etapa 6", e a lista completa
de correções e refinos em [docs/deltas-visuais.md](docs/deltas-visuais.md).

### Etapas 7–9 — Páginas, do mais simples ao mais arriscado

| etapa | páginas (× 3 idiomas) | por que aqui |
|---|---|---|
| 7 | `publicacoes`, `estatisticas-e-estudos` | estreia as Content Collections |
| 8 | `associados`, `associe-se`, `apoie`, `resorts-brasil` | componentes de dado já existem |
| 9 | `index` / `home` / `inicio` | maior visibilidade; carrossel e kenburns |

Em cada página, três correções deliberadas: hierarquia de headings, `bodyClass`
uniformizado, e as divergências entre idiomas resolvidas por componentização.

### Etapa 10 — Ebook

1.086 linhas × 3. Os 43 cartões de autor são 700 dessas linhas e 129 dos 140
estilos inline. Extrair para `src/data/autores-ebook.ts` seguindo a regra já
estabelecida no [CLAUDE.md](CLAUDE.md): nome, foto, cargo e LinkedIn não
traduzem; o título do capítulo traduz e vai para `ui.ts`. A página deve cair
para ~350 linhas.

A paleta escura própria do ebook entra como **variantes de token**, não como
cores literais — é o teste real de que a camada semântica funciona.

### Etapa 11 — Demolição

Remover `public/css/`, `public/webfonts/`, [purge-css.mjs](scripts/purge-css.mjs),
[check-glifos.mjs](scripts/check-glifos.mjs), [subset-fonts.py](scripts/subset-fonts.py),
o [`BaseLayout`](src/layouts/BaseLayout.astro) inteiro (com `Header`, `Footer` e
`SocialIcons`), o `PAGINA_TEMA` da suíte comportamental, e as dependências
`purgecss` e `lightningcss`. Some junto a
dependência de Python do projeto — o `README` deixa de pedir `fonttools` e
`brotli`.

Reescrever a seção "Antes de mexer em CSS" do [CLAUDE.md](CLAUDE.md): as três
armadilhas documentadas são todas do tema e deixam de existir. No lugar entram as
regras do sistema novo — as quatro disciplinas e as invariantes.

---

## Invariantes verificadas no build

`scripts/verifica-sistema.mjs`, no `npm run build`, **aborta em vez de avisar** —
mesmo padrão da guarda de purga e do [check-glifos.mjs](scripts/check-glifos.mjs):

- nenhuma cor hex literal fora de `tokens.css`;
- nenhum `@apply`; nenhuma classe arbitrária `[...]` fora de allowlist;
- nenhum `style=` inline fora de allowlist;
- hierarquia de headings válida nas 40 páginas (um `h1`, primeiro, sem saltos);
- contraste AA nos pares de token que de fato se encontram;
- todo elemento focável com `:focus-visible` visível (Playwright).

É isto que separa um design system profissional de um conjunto de componentes:
**o build falha quando alguém sai do sistema.**

---

## Verificação

O site original continua recuperável — `git archive 74fc1fd`, conforme
[docs/verificacao.md](docs/verificacao.md). A referência sobrevive à reescrita.

### Os portões duros

Com pixel livre, `120/120` deixa de ser critério. O que **falha o build ou a
etapa**:

1. `npm run check` — tipos e contratos de componente.
2. `npm run verify` — a suíte comportamental expandida na Etapa 0.5. **É aqui
   que a rede de segurança de layout passa a morar.**
3. `node scripts/verifica-sistema.mjs` — as invariantes do design system.
4. **Orçamento de performance**, novo e agora mensurável: peso de CSS, de JS e
   de imagem por página, com teto. Sem o portão de pixel, é o que impede o
   projeto de ficar mais bonito e mais lento ao mesmo tempo.

### O diff visual, agora como changelog

`node tests/visual-diff.mjs` continua rodando por etapa, com `PAGES=` restrito —
mas o resultado é **revisado, não aprovado automaticamente**. Cada página com
delta acima do limiar entra em `docs/deltas-visuais.md` com captura, viewport e
uma linha de motivo, classificada como:

- **refino** — tipografia fluida, balanceamento, espaçamento harmônico;
- **correção** — headings, `bodyClass`, divergência entre idiomas resolvida;
- **regressão** — volta para a etapa.

Antes dele, sempre: **comparação de HTML gerado normalizado** contra o build
anterior — ignora `href`/`alt`/`aria-*`/`rel`/`target` e compara sequência de
tags, classes e texto. É o método do `CLAUDE.md`, custa segundos e pega omissão
de markup sem pagar os 15 minutos do diff.

Ao final, rodada completa das 40 páginas × 3 viewports e uma revisão do
`deltas-visuais.md` inteiro de uma vez — é o momento em que dá para ver se o
conjunto ficou coerente, coisa que a revisão etapa a etapa não mostra.

---

## Riscos

| risco | mitigação |
|---|---|
| Preflight do Tailwind muda a base tipográfica | `base.css` derivado de valores **medidos no navegador** na Etapa 0, validado antes de qualquer página migrar |
| `style.css` global envenena página migrada | prop `legado` no BaseLayout |
| Pipeline de imagem altera dimensão renderizada | `width`/`height` obrigatórios no `<Imagem>`; diff visual pega |
| Reintroduzir as armadilhas do tema | as três (`grid-loaded`, `z-index` do kenburns, classes de breakpoint em JS) somem por construção; [site.js](src/scripts/site.js) encolhe |
| Uniformizar `bodyClass` muda 7 páginas | mudança aceita e registrada em `docs/deltas-visuais.md`, revisada página a página |
| **Perder o portão de pixel sem substituto** | Etapa 0.5 precede toda migração; sem ela o projeto anda sem rede |
| Regressão se esconder entre os refinos | classificação obrigatória de cada delta (refino / correção / regressão) — delta sem classificação bloqueia a etapa |
| View Transitions quebrarem o `site.js` | inicializadores migram para `astro:page-load` na Etapa 0, antes de qualquer página nova |
| Ficar mais bonito e mais lento | orçamento de performance como portão duro |
| Landing page urgente furar o sistema | catálogo + invariantes que quebram o build |

## Fora de escopo

Biblioteca no Figma e diretriz de marca — o design system tem uma metade de
design que vive fora do código. O que este plano entrega é a metade de
implementação, completa e verificada.
