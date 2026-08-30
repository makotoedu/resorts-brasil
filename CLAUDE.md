# Orientação para o Claude Code

Site institucional estático da Associação Brasileira de Resorts: 41 páginas em
3 idiomas, Astro, hospedado na Vercel. Sem backend, formulário ou banco.

Leia o [README.md](README.md) para comandos e estrutura, e
[docs/](docs/) para arquitetura, decisões e verificação.

## O site roda sobre um design system próprio

Tailwind v4 mais tokens, componentes com contrato, catálogo em `/design` e
invariantes verificadas no build. **A migração acabou**: as 11 etapas do
[plano](docs/plano-design-system.md) estão concluídas e o tema Inspiro — 21 mil
linhas de `style.css`, Bootstrap, 196 cores, 110 `!important` — não existe mais
no repositório.

O que sobrou daquilo é a **disciplina que a migração produziu**, e é ela que este
arquivo registra. Boa parte das regras abaixo parece exagerada até você ler o
defeito que cada uma evitou; todas nasceram de algo que passou pelos portões.

### As cinco regras que não podem ser quebradas

1. **Toda página usa o [`LayoutSistema`](src/layouts/LayoutSistema.astro)**, que
   é quem importa a folha do design system.

   ```astro
   ---
   import LayoutSistema from '../layouts/LayoutSistema.astro';
   ---
   <LayoutSistema lang="pt-br" route="history">
   ```

   Durante a migração eram dois layouts, e o motivo continua valendo para
   qualquer folha global que alguém venha a importar: **o Astro empacota CSS pelo
   grafo de módulos, não pelo que a página renderiza.** Um `import` sozinho põe o
   CSS em toda página que alcança aquele módulo, mesmo dentro de um `if` que
   nunca executa. Foi assim que importar a folha no layout do tema fez 22 das 40
   páginas divergirem: o Preflight do Tailwind vaza para onde a outra folha não
   declara a mesma propriedade, e `@layer` não protege disso.

   `verifica-sistema.mjs` afirma o resultado no `dist/`: toda página tem a folha
   do sistema, e nenhuma carrega folha de fora do grafo de módulos.

2. **Valor que vai para o `base.css` ou para um componente tem de ser medido** —
   `node scripts/medir-base.mjs` para o elemento nu, `node
   scripts/medir-primitivos.mjs` para o que tem classe (botão, seção, container,
   grade, ícone), `node scripts/medir-padroes.mjs` para as composições (cartão,
   chamada, hero, abas…), `node scripts/medir-cromo.mjs` para o cabeçalho, o
   rodapé, a faixa de cookies e o voltar-ao-topo, `node
   scripts/medir-documento.mjs` para o texto corrido (separador, citação, tabela
   e **a largura da linha em caracteres**, que só se mede com a fonte real
   carregada) e `node scripts/medir-ebook.mjs` para a paleta escura — sempre com
   o **hover** junto e, no cromo, com o **estado aberto**, porque menu, submenu e
   seletor de idioma medem zero em repouso.

   Nunca lido de uma folha, nunca contado no markup. O `padding` das listas já
   entrou errado por leitura (28px onde o real é 14px), a largura do container
   por suposição (1140px onde o real é 1500px), a largura da linha de leitura por
   padrão do Tailwind (`max-w-3xl` onde o medido são 688px), e **duas cores por
   contagem de ocorrências** — as 123 do `#0c71c3` eram todas títulos de capítulo
   do ebook e nenhuma era botão, e as 141 do `#0c101b` eram do ebook também.

   O `medir-ebook.mjs` existe por um motivo que vale como regra geral: **aquela
   paleta não estava em CSS nenhum.** As sete superfícies e os dois gradientes
   vinham de `style=` inline; só o `background-image` **computado** devolve os
   stops resolvidos em rgb. Ler o código daria zero resposta.

   **E medir contraste é parte de medir cor.** Aquela mesma medição encontrou
   cinco falhas de WCAG na página do ebook, uma delas a 1,23:1 — texto navy sobre
   quase-preto, invisível em produção há anos. Num **gradiente**, a cor do texto
   tem de passar nas *duas* pontas; quando nenhuma passa, quem cede é o fundo.

3. **Componente novo em `primitivos/`, `layout/`, `padroes/` ou `cromo/` entra no
   catálogo `/design` no mesmo commit.** Não é convenção: `verifica-sistema.mjs`
   reprova o build se o `/design` não importar o componente.

   As quatro camadas: `primitivos/` é vocabulário, `layout/` é eixo (largura,
   ritmo, colunas), `padroes/` é uma decisão de desenho já tomada, e `cromo/` é o
   que embrulha toda página — cabeçalho, rodapé, faixa de cookies, voltar ao
   topo.

4. **Cor vem de token, e `style=` inline não existe.** Nenhuma cor literal fora
   do [`tokens.css`](src/styles/tokens.css), nenhum `@apply`, nenhum `style=`
   fora da allowlist de `verifica-sistema.mjs` — que guarda o **número** esperado
   por arquivo, e não só o nome, então um `style=` novo num arquivo que já tem
   exceção continua reprovando. Hoje são duas exceções, as duas justificadas no
   próprio script.

   Quando precisar de CSS de verdade, escreva CSS de verdade em `<style>` com
   escopo. Utilitária para o que é único, componente para o que se repete.

5. **Tamanho de título vem do `papel`, não do `tamanho`.** O
   [`<Titulo>`](src/components/primitivos/Titulo.astro) tem dois eixos: `nivel`
   escolhe a tag e `papel` escolhe a aparência, em quatro degraus.

   ```astro
   <Titulo nivel={2} papel="secao">Benefícios de ser um associado</Titulo>
   ```

   | `papel` | token | medido | uso |
   |---|---|---|---|
   | `pagina` | `text-3xl` | 40→62px | um por página |
   | `secao` | `text-xl` | 24→34px | título de seção, e o das faixas |
   | `bloco` | `text-lg` | 19→25px | sub-bloco, cartão sobre foto |
   | `cartao` | `text-md` | 18px | cartão, rótulo de grupo |

   **Separar tag de aparência consertou o sumário e criou o defeito seguinte.**
   Com `tamanho` livre por página, `h2` passou a renderizar em **cinco** tamanhos
   (18, 25, 34, 50 e 62px) e `h3` em **um** (18px, nas 45 ocorrências) — onde os
   dois se encontram em 18px, nível 2 e nível 3 são o mesmo objeto visual. Na
   home o `h1` e o `h2` seguinte mediam os mesmos 62px; em `/apoie` a palavra
   "Parceiro" era `h3` de 18px e `h2` de 50px na mesma tela.

   `tamanho` sobrevive como escape para os dois lugares onde a escala crua é o
   assunto — `PaginaEbook.astro`, que tem escala própria como tem paleta própria,
   e `design.astro`, que é a vitrine. **A allowlist de `verifica-sistema.mjs`
   guarda o número por arquivo**, igual à do `style=`.

> **Uma regra saiu na Etapa 11 e vale saber que existiu.** Todo componente e toda
> página precisavam de uma linha `@source` em `src/styles/global.css`, porque
> `source(none)` impedia o Tailwind de gerar utilitárias que colidiriam com as
> classes do tema. Esquecer não quebrava o build — a utilitária simplesmente não
> era gerada e o estilo sumia. Sem tema com que colidir, a varredura passou a ser
> por diretório e a lista de 60 linhas morreu. **O CSS gerado ficou byte a byte
> idêntico**, medido.

### Cinco armadilhas do Astro, e todas custam a mesma coisa

**Nenhum erro.** O build passa, o tipo passa, e o defeito só aparece olhando.

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

   **O avesso disso também vale, e é mais fácil de esquecer:** um seletor
   escopado não alcança o que um componente *filho* renderiza. `.caixa img` não
   casa o `<img>` que veio de um `<Imagem>`, porque aquele markup não recebe o
   atributo de escopo do pai. É por isso que o
   [`<Video>`](src/components/padroes/Video.astro) precisa de
   `:global(picture)` e `:global(img)`.

2. **Nome de slot não pode ser dinâmico.** `<Fragment slot={item.id}>` dentro de
   um `.map()` passa no `astro check`, compila, e quebra na **geração** com
   `ReferenceError: item is not defined` — o Astro extrai os slots nomeados em
   tempo de compilação, fora do escopo do callback. Use nomes literais e ponha o
   corpo num componente; se os nomes vierem de `src/data/`, ponha uma guarda que
   aborte o build quando os dois lados divergirem.

3. **O que o JavaScript cria em tempo de execução não recebe escopo.** O
   `<iframe>` da fachada de vídeo nasce no clique, com `document.createElement`;
   sem `:global`, a regra que lhe dá altura vira `.yt-facade[cid] iframe[cid]` e
   não casa nada — o vídeo entra com os 150px padrão, depois do clique, que é
   onde nenhum teste de carregamento olha.

4. **O Astro apara o espaço em volta de uma expressão.** `{t.leiaAgora} <i>` gera
   `Leia agora<i>` e o ícone cola na palavra. Aconteceu nas seis páginas de
   publicações e estudos ao mesmo tempo. A correção é `{t.leiaAgora}{' '}`.

   **Desde o Astro 7 isso é bem maior, e é permanente.** O `compressHTML` passou
   a valer `'jsx'` por padrão, e o projeto adotou o padrão de propósito — o
   `astro.config.mjs` não declara o campo. A diferença: o HTML colapsava num
   espaço a quebra de linha entre um texto e uma tag vizinha, e o JSX a **remove**.
   Então isto, que sempre foi natural de escrever, agora cola:

   ```astro
   entrando em contato conosco através do e-mail
   <a href={`mailto:${contato.email}`}>{contato.email}</a>   <!-- e-mailcontato@… -->
   ```

   Foram **340 ocorrências** na adoção, e a correção é a mesma: `{' '}` no fim da
   primeira linha. Duas coisas que poupam trabalho ao repetir a caçada:

   - **Só conta se um dos lados for tag inline.** Duas linhas de texto puro
     continuam sendo juntadas com um espaço; e em container flex quem separa é o
     `gap`, então lá o espaço do markup nunca apareceu — foi medido nos 18
     `<LinkAcao>`, e some sem mudar um pixel.
   - **Nenhum dos portões de layout vê.** A geometria mede caixas e o texto está
     dentro da caixa. Quem viu foi `innerText` das 41 páginas comparado contra a
     build anterior, que é o que respeita o CSS. Ver
     [docs/decisoes.md](docs/decisoes.md), "Atualização do Astro".

5. **Erro do `astro check` cascateia, e a linha apontada raramente é a culpada.**

   O compilador transforma o frontmatter em TSX. Quando qualquer coisa ali
   confunde esse parse, `Astro.props` vira `any` e o relatório enche de erros
   *derivados*, todos longe da causa:

   ```
   Titulo.astro:53  'Props' is declared but never used
   Titulo.astro:129 Component 'Tag' is not a valid component
   Titulo.astro:131 expression of type 'any' can't be used to index type ...
   ```

   **`'Props' is declared but never used` é o sintoma a reconhecer.** Ele não diz
   que a interface está errada: diz que o arquivo inteiro deixou de ser tipado. A
   causa pode estar vinte linhas acima — ou ser um erro de tipo banal em outro
   ponto. Nesta sessão um `Type 'number' is not assignable to '4|5|6'` apareceu
   como *"`item` implicitly has an 'any' type"* noutro lugar do mesmo arquivo, e
   só se revelou quando o resto foi simplificado.

   **O caso que custou uma bissecção inteira:** um `->` dentro de um comentário
   `/** */` do frontmatter que também citava markup **pareado** (`<Titulo …>texto
   </Titulo>`). Trocar `40 -> 62px` por `40 ate 62px` levava de 6 erros a 0, ida e
   volta, duas vezes. Uma seta sozinha é inofensiva — o `FaixaLogos.astro` tem
   `2 -> 3 -> 5 colunas` no comentário dele e sempre passou —, e no `<style>` e em
   `.css` ela nunca incomodou.

   O procedimento que funciona: **restaure o arquivo do HEAD, confirme que passa,
   e reaplique em três ou quatro pedaços.** Ler o erro não leva à causa.

### E uma sexta: cor que depende do que está embaixo

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

## O padrão de defeito que este projeto encontrou cinco vezes

O tema saiu, mas a forma de falha que ele ensinou é geral e vale para qualquer
biblioteca que alguém remova daqui em diante:

> **Plugin removido, CSS que dependia dele silenciosamente inerte.**

As cinco ocorrências, todas com build passando e nenhum erro no console:

| o que dependia | o que aconteceu |
|---|---|
| `.grid-layout > *` tinha `opacity: 0`; `.grid-loaded` vinha do Isotope | **6 páginas com o conteúdo invisível** |
| `.kenburns-bg` tinha `z-index: -1` e dependia do flickity criar o contexto de empilhamento | o zoom do hero parou, sem mudar altura |
| `.carousel` tinha `opacity: 0` e `visibility: hidden`; `.carousel-loaded` vinha do flickity | **o carrossel das 3 homes ficou invisível por meses**, baixando 70 logotipos para não mostrar nenhum |
| 15 regras dependiam de classes `breakpoint-*` que o jQuery punha no `<body>` | responsividade resolvida em JS, convertida para media queries |
| o CSS do `<YouTube>` morava na folha do tema | migrar a página entregaria a fachada sem caixa e sem botão |

**Procure por `z-index` negativo, `opacity: 0`, `visibility: hidden` e classes de
estado antes de tirar qualquer script.**

O carrossel invisível é o mais instrutivo dos cinco, e não pelo defeito — pelo
motivo de **nenhum dos quatro portões ter visto**, cada um por uma razão
diferente:

| portão | por que passou |
|---|---|
| comportamental | comparava o `src` do primeiro item antes e depois de 8s, e o script reciclava a fila **dentro** do elemento invisível |
| geometria | vigiava `.polo-carousel`; a classe real era `.polo-carousel-item`. **Nunca casou com nada** |
| diff visual | esconde aquela região de propósito — a posição depende do instante |
| orçamento | o peso não muda quando a imagem carrega sem aparecer |

Duas regras saem daí, e as duas são gerais:

1. **Um seletor que não casa nada não falha — ele passa.** Ao pôr um seletor numa
   lista de vigilância, confirme que ele encontra alguma coisa hoje. Foi por isso
   que `.team-members` e `.grid` saíram da varredura de geometria na Etapa 11
   junto com o tema: manter a linha daria a impressão de cobrir.
2. **Uma exclusão de portão entra junto com quem cobre o buraco.** Esconder o
   carrossel no diff visual é legítimo; fazê-lo sem nada em seguida deixou aquela
   região sem verificação nenhuma.

## Antes de mexer em ícone

**Nenhuma página baixa webfont de ícone.** O
[`<Icone>`](src/components/primitivos/Icone.astro) desenha SVG inline a partir de
[`src/icones/glifos.ts`](src/icones/glifos.ts), que é **gerado** — rode
`python scripts/glifos-para-svg.py` depois de mexer no
[`glifos.json`](scripts/glifos.json), nunca edite o arquivo à mão. A suíte
comportamental afirma a ausência: **nenhuma página pode voltar a baixar webfont
de ícone.**

[`tests/verify-icones.mjs`](tests/verify-icones.mjs) compara cada desenho com a
fonte de origem e reprova codepoint trocado, contorno vazio ou eixo espelhado.
É o único portão que pega isso — glifo errado não quebra build, e glifo ausente
vira tofu, que ocupa exatamente 1em.

**`familias`, no `glifos.json`, é a lista de onde cada contorno VEM.** As duas
famílias do Font Awesome ficaram órfãs quando o ebook migrou, e o caminho óbvio
seria apagá-las; seria o erro. O `glifos-para-svg.py` lê aquelas entradas para
desenhar 8 dos 16 ícones, e o `verify-icones.mjs` as usa como referência — apagar
a entrada apagaria os desenhos na próxima regeneração, **sem erro nenhum**.

Pelo mesmo motivo, **`vendor/webfonts/` não é lixo**: é a origem dos contornos e
a referência do portão de ícones. Sem ele, a única referência do desenho seria o
próprio desenho.

O inventário, aliás, **nunca saiu das classes do HTML**, e é bom saber por quê:
dois glifos entravam por pseudo-elemento — `.list-icon-arrow li:before` e
`.list-icon-circle li:before` — e **pseudo-elemento não tem classe**. Um subset
montado a partir dos `<i class="fa-*">` enxergava 14 ícones; o número real é 16,
e rodá-lo apagava as setas e bolinhas de 6 páginas sem erro nenhum.

## Antes de mexer em script de terceiro

**Nada carrega antes do consentimento.** O GTM, e qualquer script de terceiro que
venha a existir, é injetado pelo bloco inline do `<head>` de
[`Cabeca.astro`](src/layouts/Cabeca.astro), que expõe `window.rbConsent`. Não
acrescente `<script src>` de outro domínio fora dele, nem um `<iframe>` de
terceiro sem fachada de clique-para-carregar. Se a lista de cookies mudar,
atualize [`src/data/cookies.ts`](src/data/cookies.ts) — a tabela da política nos
três idiomas sai de lá — e suba a versão de `rb_consent`.

**Não existe um único `<iframe>` no HTML gerado**: ele nasce no clique.

## Antes de mexer em imagem

**O acervo vive em [`src/assets/imagens/`](src/assets/imagens/).** Em
`public/images/` ficaram só `favicon.png` e `og-image.png`, que são
referenciados de fora do site — pela barra do navegador e pelo scraper de rede
social, onde um endereço com hash não serve. Imagem nova entra no acervo, nunca
em `public/`.

**O caminho continua sendo `/images/…` em `src/data/` e no `<Imagem src="…">`**,
e quem o traduz em módulo otimizado é [`src/imagens.ts`](src/imagens.ts) — é isso
que mantém os 183 caminhos de `src/data/` como dado em vez de `import`. Caminho
inexistente **aborta o build**.

**Aquele caminho só tem sentido dentro do `<Imagem>`.** Escrito à mão num `<img
src>`, ele vira 404: `dist/images/` guarda dois arquivos e mais nada.
[`scripts/imagens.mjs`](scripts/imagens.mjs) aborta o build se algum aparecer, e
apaga do `dist/_astro/` o que o `import.meta.glob` emitiu sem ninguém usar.

> Esse script já teve uma ponte que copiava para `dist/images/` o que as páginas
> do tema pediam, e ela devia copiar zero quando a última migrasse. **Nunca
> chegou a zero**: sobraram três referências, e as três estavam em código já
> migrado — as miniaturas de vídeo e o logotipo do JSON-LD. Não era dívida do
> tema; era o hábito do caminho antigo sobrevivendo à camada que o justificava.

Ao usar o [`<Imagem>`](src/components/primitivos/Imagem.astro):

- **diga o `tamanhos` quando a imagem não ocupar a largura da janela.** Sem ele,
  `escala="largura-total"` assume `100vw` e baixa o dobro do necessário;
- **não mexa em `qualidade` sem medir.** O 50 padrão saiu de
  `node scripts/medir-imagens.mjs`, que compara fidelidade contra o original.
  `quality` não é escala comum entre codecs: no 80 que parecia óbvio, o AVIF
  saía **50% maior** que o WebP.

## Antes de declarar qualquer coisa pronta

```bash
npm run build      # tipos, imagens, invariantes do design system
npm run verify     # comportamento, geometria, ícones, contraste, tipografia e orçamento
                   # (precisa do preview no ar, em 4330)
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
estado.

Ao migrar ou reformar uma página, **confira se ela não era a página de referência
de algum teste**. Já custou três vezes: `/historia.html` era a de quase todos até
a Etapa 5, `/resorts-brasil.html` até a 8, e `/ebook.html` — escolhida por ser a
última do plano — até a 10.

O quarto portão é o **orçamento de performance**, `tests/verify-orcamento.mjs`:
uma catraca, não um teto. Cada página tem a própria linha de base em
`tests/orcamento.json`, e o que reprova é ela engordar mais de 5%. Página que
emagrece pede `ATUALIZAR=1 node tests/verify-orcamento.mjs` para regravar a base
mais apertada — é assim que o peso não volta.

**O quinto é o contraste do que é RENDERIZADO**, `tests/verify-contraste.mjs`.
Ele existe porque o checador de cor compara **pares de token**, e havia três
coisas que um par não sabe dizer: token sobre token que ninguém declarou como par
(era o CTA da home, branco sobre âmbar a 1,63:1), token sobre **fotografia** (onze
títulos e links brancos, de 2,17 a 3,50:1) e token sobre o gradiente de uma foto
(o h2 de 50px do e-book sobre o facho ciano, 1,65:1). Vinte e duas falhas reais,
e nenhum dos quatro portões via uma.

O método tem duas armadilhas, e as duas produzem número errado sem erro nenhum:

- **amostre a chapa, não a captura normal.** A chapa é a página com todo o texto
  em `color: transparent`. Amostrando a captura normal, o pior pixel dentro da
  linha é quase sempre o **anti-aliasing do próprio glifo**, e a suíte acusa
  texto perfeitamente legível;
- **capture por banda de rolagem, nunca `fullPage`.** Em página muito alta o
  Chromium monta a imagem por partes e **algumas voltam em branco** — o PNG tem a
  altura certa e o conteúdo não está lá. O catálogo, com 28 mil px, produziu 920
  reprovações fantasma de "branco sobre branco". Se um dia aparecer uma enxurrada
  de 1,00:1, **suspeite da captura antes do CSS.**

**O sexto é a hierarquia visual**, `tests/verify-tipografia.mjs`: nenhum título
pode alcançar o tamanho do título que o contém, e todo título tem de cair num dos
quatro degraus do `papel`. Ele cobre o que o checador de sumário não vê — aquele
garante que não há salto de nível, este que o **tamanho** ainda significa alguma
coisa. Nasceu com 33 ocorrências e chegou a zero na mesma sessão.

Uma regra foi tentada e descartada, e vale saber: *"irmãos do mesmo nível medem
igual"*. Ela achou o defeito que originou o portão e, depois de corrigido,
continuou acusando 63 casos que não são defeito — grade de cartão e seção moram
no mesmo `h2` quando não há título de seção acima, e isso é limite do HTML, não
do desenho.

O `node tests/visual-diff.mjs` continua existindo, mas **não é portão** — o pixel
muda de propósito. Ele é changelog: cada divergência entra em
[docs/deltas-visuais.md](docs/deltas-visuais.md) classificada como refino,
correção ou regressão. Altura de página não é critério nenhum.

O procedimento completo está em [docs/verificacao.md](docs/verificacao.md).

## Convenções

- Textos de navegação, rodapé e cookies ficam em [`src/i18n/ui.ts`](src/i18n/ui.ts),
  nunca nos componentes. É a fonte única que alimenta nav, rodapé, seletor de
  idioma e `hreflang`.
- URLs são requisito: o site tem histórico de indexação. `build.format: 'file'`
  mais `cleanUrls` da Vercel preservam os caminhos originais. Mudança de caminho
  exige redirect 301 no [`vercel.json`](vercel.json).
- [`src/scripts/site.js`](src/scripts/site.js) usa nomes de estado herdados do
  tema (`.toggle-active`, `.mainMenu-open`, `.modal-active`, `#mainMenu`,
  `#scrollTop`). Foi isso que deixou **um** script servir as duas camadas durante
  a migração inteira. Sobrou uma camada e os nomes ficam: é o CSS do cromo que os
  declara agora, e renomear seria uma varredura sem ganho.
- **Todo listener novo no `site.js` recebe o `signal`, e todo timer se cancela no
  `abort`.** Com o `<ClientRouter />` o documento não recarrega entre páginas, e
  o que estiver preso a `window` ou a `document` sem `signal` ganha uma cópia por
  navegação. Ver a seção seguinte.
- Comentários e documentação em português, acompanhando o resto do projeto.

## Antes de mexer no `site.js`

**O documento não recarrega entre páginas.** O `<ClientRouter />` troca o corpo e
este módulo continua o mesmo, já avaliado. Duas consequências, e as duas mordem:

1. **Listener preso a `window` ou a `document` acumula.** Uma cópia por
   navegação. Por isso todo listener recebe `{ signal }` do `AbortController` da
   página, e todo timer se cancela no `abort`. Nada de `removeEventListener` à
   mão — um esquecido não aparece no primeiro clique, aparece no quinto.
2. **O `<head>` não reexecuta.** O bloco de consentimento roda uma vez e
   `window.rbConsent` atravessa a navegação — é o **único** estado que sobrevive
   à troca de corpo, e por isso o único que precisa ser desfeito à mão (o
   `aoAbrir` da faixa de cookies).

**A checagem óbvia disso não funciona, e vale saber por quê.** Clicar no menu
depois de navegar passa mesmo com o teardown quebrado: o gatilho é um *elemento*,
e o elemento é trocado junto com o corpo, então os listeners dele morrem
sozinhos. O que acumula são os três de `window`/`document` — e como os três são
idempotentes, dez cópias fazem o mesmo que uma. **Não há sintoma funcional
nenhum**, só um vazamento que cresce a cada página visitada.

Quem vê é a contagem de listeners via CDP (`DOMDebugger.getEventListeners`), em
[`tests/verify-behaviors.mjs`](tests/verify-behaviors.mjs). Com o teardown
quebrado de propósito ela acusa `window.resize 1→5`, `window.scroll 1→5`,
`document.click 3→7`.

## O que não existe aqui

Para poupar buscas: não há lightbox, formulário, carrossel com múltiplos slides
nem cabeçalho fixo no scroll. Também não há `<iframe>` no HTML gerado (os vídeos
são fachada), nenhuma webfont de ícone, e nenhuma regra que use Nunito — a fonte
era baixada e nunca aplicada.

## Onde os dados moram

**Dado não é markup.** Resorts associados, parceiros, diretoria e contato ficam
em [`src/data/`](src/data/); rota, `title`, `description` e qualquer texto que
traduza ficam em [`src/i18n/ui.ts`](src/i18n/ui.ts).

A regra prática: **o que traduz vai em `ui.ts`, o que não traduz vai em
`src/data/`.** Nome de resort, URL, foto e cargo não traduzem. Rótulo de aba,
título de seção e a dupla `title`/`description` traduzem.

Editar markup de página para acrescentar um resort ou um parceiro é o caminho
errado — foi exatamente assim que a home em espanhol ficou com um logo a menos e
a página inglesa de associe-se com dois parceiros a mais.

**Há um limite nessa regra: corpo de documento não vai para o `ui.ts`.** Os
termos de uso e a política de privacidade traduzem, mas são ~1.500 e ~4.000
palavras por idioma. O critério que vale é **o que se repete entre páginas mora
no `ui.ts`; o que existe uma vez mora onde é lido.** Dali saem o título e o
rótulo da data; o corpo fica na página. A data de vigência de cada documento está
em [`src/data/juridico.ts`](src/data/juridico.ts), porque é a mesma nos três
idiomas e já tinha seis cópias.

Quando uma etapa toca texto traduzido, **ler os três idiomas lado a lado faz
parte da etapa**. Foi assim que apareceu o "Leia agora" em duas páginas inglesas,
que se descobriu que a política de privacidade inglesa tinha um capítulo inteiro
em espanhol, e que os indicadores de `/associados` diziam três números
diferentes para o mesmo fato. Nenhum dos quatro portões vê isso, e não há portão
barato que veja: a estrutura estava certa.

**Publicações e estudos são Content Collections**, não `src/data/`: os dados
ficam em [`src/content/*.yaml`](src/content/), o schema em
[`src/content.config.ts`](src/content.config.ts) e o acesso em
[`src/conteudo.ts`](src/conteudo.ts). Página nenhuma chama `getCollection` —
elas pedem `publicacoesEm(lang)` e recebem strings já resolvidas.

Ali um mesmo item mistura o que traduz com o que não traduz, e o campo carrega
essa distinção como o `cargo` da diretoria já fazia: **string quando não traduz,
mapa por idioma quando traduz** — e nesse caso o Zod exige os três.

**Contar arquivo não é contar dado.** Eram "7 publicações" porque alguém contou
capas em `src/assets/imagens/publicacoes/` e duas eram órfãs; são 5. Eram "43
autores do ebook" contados no markup; são 41. É o mesmo erro de método das cores
contadas por ocorrência.

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
- o **espaço em branco ao lado de uma expressão** (armadilha 4 acima).

Ao trocar um bloco por componente, prefira recortar um trecho **balanceado**
(um `<ul>…</ul>` inteiro) a recortar até um comentário — e confira a contagem de
`<div>` contra a de `</div>` no recorte antes de aplicar.
