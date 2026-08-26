# Deltas visuais aceitos

O `tests/visual-diff.mjs` compara o build com o site original (`git archive
74fc1fd`). Enquanto a refatoração buscava fidelidade pixel a pixel, o critério
era simples: **120/120**.

Com a reconstrução da camada de apresentação, o número deixa de ser portão e
passa a ser changelog. Este arquivo é a leitura oficial dele: **delta listado
aqui é decisão; delta não listado é regressão.**

Os portões duros passam a ser `npm run verify` (comportamento e geometria),
`scripts/verifica-sistema.mjs` (invariantes do design system) e o orçamento de
performance.

## Linha de base — 93/120

Medido em 20/08/2026, antes de qualquer página migrar. As 27 divergências são
**anteriores ao design system** e vêm de três mudanças de conteúdo já decididas e
documentadas. Nenhuma das páginas envolvidas carrega o bundle novo — verificável
com a checagem de isolamento do `verifica-sistema.mjs`.

| # | páginas | viewports | tipo | motivo |
|---|---|---|---|---|
| 15 | `resorts-brasil` e `ebook`, 3 idiomas | todos | correção | fachada de vídeo: o original embutia `<iframe src="youtube.com/embed/…">` direto; hoje o vídeo só carrega no clique, que é o consentimento. Ver [decisoes.md](decisoes.md), "Os vídeos, e o `iframe` que a purga levaria" |
| 11 | `politica-de-privacidade` e afins, 3 idiomas | todos | correção | a tabela de cookies caiu de **15 linhas para 1**: listava cookies de uma plataforma de consentimento que nunca foi instalada, e omitia o único cookie real. Páginas ficam 7–8% mais curtas. Ver [decisoes.md](decisoes.md), "A tabela de cookies descrevia outro site" |
| 1 | `en-us/board` | mobile | **não explicado** | 23px de diferença (4402 → 4379), mesma contagem de imagens. Marginal, anterior ao design system, sem bundle novo. Provavelmente o `<a>` sem `href` para membro sem LinkedIn, que substituiu o `href="#"` do original. Confirmar antes de migrar a página |

## Etapa 1 — nenhum delta novo, quatro decisões latentes

Medido em 21/08/2026, com `PAGES=/index.html,/associados.html,/publicacoes.html,/ebook.html`:
**idênticas**, exceto as duas do `ebook` que já constam da linha de base. A etapa
criou os oito primitivos e não migrou nenhuma página de conteúdo, então não
havia pixel a mudar — o que ela mexeu foi só no que o `/design` carrega, e no
`purge-css.mjs`, que passou a ignorar as páginas já migradas (a conferência
acima existe justamente por causa dessa segunda mudança).

As quatro decisões abaixo **ainda não aparecem em pixel**. Aparecerão quando a
primeira página de conteúdo migrar, e é aqui que já estão classificadas — para
que nenhuma delas seja confundida com regressão na Etapa 5:

| decisão | tipo | efeito quando aparecer |
|---|---|---|
| botão `sm` de 11px para 12px | refino | só a faixa de cookies usa esse tamanho |
| container deixa de travar em 540px entre 576 e 767px | correção | conteúdo mais largo nessa faixa; o degrau fazia a página *encolher* quando a tela crescia |
| `#4c5667` consolidado em `#525e75` | refino | texto do botão claro em hover, 6 pontos por canal |
| botão ganha estado pressionado | refino | o tema não devolvia nada ao clique |

E três **correções de token** que não são delta e sim conserto: o container
media 1500px e não 1140px, a cor de ação é `#2250fc` e não `#0c71c3`, e os raios
carregavam a fração do root de 14px do tema. Ver [decisoes.md](decisoes.md),
"Etapa 1".

## Etapa 2 — nenhum delta novo

Medido em 21/08/2026, com as seis páginas mais dependentes de imagem
(`index`, `associados`, `diretoria`, `publicacoes`, `ebook`, `es-es/asociados`):
**idênticas**, exceto as duas do `ebook` que já constam da linha de base.

Era a conferência que a etapa exigia. As 198 imagens saíram de `public/images/`
para `src/assets/imagens/`, e as 40 páginas do tema continuam pedindo
`/images/…` — se a ponte do `scripts/imagens.mjs` tivesse deixado alguma para
trás, apareceria aqui como imagem quebrada. Duas quase ficaram: os dois arquivos
com acento no nome, que o regex da ponte não via.

O peso, que agora tem portão próprio, está em
[verificacao.md](verificacao.md#2d-orçamento-de-performance--a-catraca-de-peso).

## Etapa 3 — nenhum delta novo, dez decisões latentes

Medido em 21/08/2026, com `PAGES=/index.html,/associados.html,/historia.html`:
**9/9 idênticas**. A etapa criou os dez padrões e não migrou nenhuma página, então
não havia pixel a mudar — as três páginas escolhidas são as que os padrões vão
substituir primeiro (hero e chamadas, contador e abas, lista com marcador).

As decisões abaixo **ainda não aparecem em pixel**. Aparecerão quando as páginas
delas migrarem, nas Etapas 5–9, e ficam classificadas aqui para que nenhuma seja
confundida com regressão:

| decisão | padrão | tipo | efeito quando aparecer |
|---|---|---|---|
| texto navy no lugar de branco sobre âmbar e verde | `FaixaDestaque` | correção | 1,6:1 → 9,1:1 e 2,9:1 → 5,2:1; reprovavam o critério 1.4.3 da WCAG |
| parágrafo em seção escura herda a cor da seção | `base.css` | correção | a regra existia desde a Etapa 0 e nunca valeu — cinza sobre navy, 1,5:1 |
| o número do contador passa a existir sem JavaScript | `Contador` | correção | sem script, a seção mostrava cinco rótulos sem número |
| ícone da caixa deixa de ser `<a href="#">` | `CaixaIcone` | correção | 36 links focáveis sem destino saem da ordem de tabulação |
| título do cartão de publicação vira o link; a capa sai | `CartaoPublicacao` | correção | o teclado passava duas vezes pela publicação e nunca pelo nome dela |
| hero: `height: 360px` → proporção, e altura em 72% da janela | `ChamadaAcao`, `Hero` | refino | a caixa acompanha a largura em vez de recortar mais em tela estreita |
| nome do membro de 16px para 18px | `CartaoMembro` | refino | 16px não está na escala; mesmo raciocínio do botão `sm` |
| cargo do membro troca `#1e2022` pelo cinza de parágrafo | `CartaoMembro` | refino | o rótulo secundário tinha mais peso visual que o nome |
| número do contador vira fluido (30 → 50px) | `Contador` | refino | no mobile eram cinco números de 50px numa coluna de 330px |
| título do cartão de publicação e da caixa de ícone com peso 600 | `CaixaIcone` | refino | 700 era a exceção de um bloco só |

Duas mudanças que **não** são delta e sim conserto de token, no mesmo espírito das
três da Etapa 1: `--color-superficie-marca` nasceu porque o
`.call-to-action.background-dark` é navy e não carvão, e o `#efb72c` foi
consolidado no `--cor-ambar-500` que outra página já usava para a mesma faixa.
Ver [decisoes.md](decisoes.md), "Etapa 3".

## Etapa 4 — um delta novo, e uma divergência antiga que apareceu

Medido em 22/08/2026, nas seis páginas de publicações e estudos: **17/18
idênticas**.

O delta novo é o que a etapa existia para causar:

| páginas | viewports | tipo | motivo |
|---|---|---|---|
| `en-us/statistics-and-studies`, `es-es/estadisticas-y-estudios` | todos | correção | os dois primeiros cartões diziam "Leia agora", em português, porque os estudos mais novos foram acrescentados no markup dos três idiomas sem passar pela tradução. Agora o rótulo vem do `ui.ts` |

Ele ficou **abaixo do limiar de 0,5%** e por isso não aparece no resultado do
diff — são duas palavras num cartão pequeno. Quem o pegou foi a comparação de
HTML normalizado, que é justamente por isso o primeiro passo do procedimento.

Uma correção que não muda pixel nenhum: o `alt` das capas passou a ser o título
da publicação. Era `alt="capa"` em quinze links diferentes nas páginas de
publicações, e um texto em português nas três páginas de estudos. Como a imagem é
o único conteúdo do `<a>` que a envolve, esse `alt` **é** o nome acessível do
link.

### A divergência de `/publicacoes` no mobile é anterior, e está medida

`/publicacoes.html` no mobile diverge do original em **9,06%, com +47px de
altura**. Não foi introduzida aqui: o mesmo número sai dos builds da **Etapa 2** e
da **Etapa 3**, conferido reconstruindo os dois estados.

O mecanismo, medido no navegador nos dois lados:

| | grade | posição dos cartões 3, 4 e 5 |
|---|---|---|
| original (Isotope) | `margin: 0 -30px -30px 0`, altura 3420px | 1823 · 2521 · 3196 |
| hoje (`gridLayout()`) | sem margem, altura 3467px | 1846 · 2544 · 3219 |

Os cartões têm largura, altura e coluna idênticas; o que difere é o empilhamento,
23px por cartão a partir do terceiro. O Isotope absorvia parte do recuo inferior
do item com aquela margem negativa, e o `gridLayout()` do
[`site.js`](../src/scripts/site.js) empilha pela altura cheia.

**Não foi corrigida de propósito.** O conserto seria em `gridLayout()`, e esse
bloco desaparece na Etapa 7: as páginas de publicações e estudos passam a usar
`<CartaoPublicacao>` dentro de `<Grade>`, que é grade CSS e não empacotamento em
JavaScript. Corrigir agora é trabalho que a etapa seguinte joga fora.

Fica aqui como **pendência com prazo**: se a Etapa 7 não zerar essa divergência,
ela vira regressão.

## Etapa 5 — as primeiras páginas em que o pixel muda de propósito

Dez páginas migraram: `404`, `historia`, `fale-conosco` e `diretoria`, as três
últimas nos três idiomas. **É a primeira etapa em que comparar com o original não
faz mais sentido**, porque estas páginas deixaram de ser servidas pelo tema —
elas não carregam `style.css`, não têm `.row`, não têm webfont de ícone e não têm
`<body class="modern">`.

O diff visual continua rodável, mas o número dele aqui é ruído: uma página que
trocou de camada de apresentação inteira diverge em tudo. Quem sustenta a etapa
são os quatro portões duros — build, comportamento (51/51), geometria (zero
bloqueios em 123 páginas × viewport) e orçamento.

### O que ficou mais leve

O orçamento mediu o efeito de sair do tema, e ele é grande:

| página | antes | depois |
|---|---|---|
| `diretoria` (× 3 idiomas) | 478 KB | **279 KB** |
| `historia` (× 3) | 159 KB | **109 KB** |
| `fale-conosco` (× 3) | 103 KB | **90 KB** |
| `404` | 99 KB | **76 KB** |

E a dívida de transbordo horizontal caiu de **72 para 53** ocorrências: a margem
negativa do `.row` some com a `<Grade>`, exatamente como a Etapa 1 previa.

### Correções

| onde | tipo | motivo |
|---|---|---|
| `historia` × 3 | correção | `<p>` fechado com `</h4>` na linha 17 dos três arquivos, desde sempre. O navegador remendava e ninguém via |
| `historia` × 3 | correção | `h1` seguido de `h3`. A frase do `h3` não é cabeçalho, é abertura — virou `<Texto tamanho="lg">`, e o salto some por deixar de existir |
| `historia` × 3 | correção | os 12 fundadores eram **três** `<ul>` de quatro, um por coluna do Bootstrap: três listas para o leitor de tela, e reequilíbrio manual a cada mudança. Agora é uma lista em três colunas de CSS |
| `fale-conosco` × 3 | correção | o telefone do WhatsApp era `+55 (11) 95058-0313` só em inglês, e a frase do canal era outra. Vem de `src/data/contato.ts`, que já alimentava o JSON-LD |
| `fale-conosco` × 3 | correção | o símbolo era o link e o e-mail ao lado era um `<b>` sem link: o alvo útil não era clicável e o clicável não dizia para onde ia. Agora o link é o valor |
| `diretoria` × 3 | correção | `h4.text-muted` com "Biênio 2026-2027" sob cada título — não é cabeçalho de nada, é legenda. Virou `<Texto>` |
| todas | correção | `<body class="modern">` some. A inconsistência (33 páginas com, 7 sem) resolve-se por remoção, não por padronização |
| cabeçalho | correção | **contraste.** "Fale conosco" era `#d39e00` sobre branco — **2,42:1**; agora é o âmbar-800, **4,96:1**. "Seja um associado" era `rgb(211,180,4)` sobre o azul da topbar — **2,84:1**; agora é branco semibold, **5,80:1**. Os dois reprovavam o critério 1.4.3 da WCAG |
| cabeçalho | correção | o submenu abria só no `:hover`. Com `:focus-within` desde a primeira linha, quem navega por teclado passa a alcançar os seis destinos que só existem lá dentro |
| cabeçalho | correção | o item que abre submenu era `<a href="#">` — sujava o histórico e mostrava um destino falso na barra de status. Virou `<button>` |
| rodapé | correção | o logotipo era exibido a 390×130 a partir de um arquivo de 300×100. Volta ao tamanho nativo |
| rodapé | correção | os títulos das listas eram `<h4>` sem nenhum `<h3>` acima, em todas as páginas |
| `404` | correção | o algarismo gigante era lido em voz alta logo antes do título que diz a mesma coisa em palavras. `aria-hidden` |

### Refinos

| onde | tipo | motivo |
|---|---|---|
| `historia`, `fale-conosco`, `404` | refino | o título da página passa a `3xl` (40 → 62px). O desktop é o valor medido; no mobile sobe de 32 para 40px, porque 32 não está na escala e criar um degrau para um título inverteria a relação entre sistema e exceção |
| `fale-conosco` | refino | o `<br>` do título sai. A quebra manual só acertava numa largura; o `text-wrap: balance` acerta em todas |
| `fale-conosco` | refino | a caixa cinza perde o `p-t-100`. Aqueles 100px existiam para equilibrar os 50px de margem que cada `<CaixaIcone>` carregava embaixo — dois valores medidos que só faziam sentido um por causa do outro |
| `historia` | refino | a faixa dos 20 anos passa de 8/4 para duas colunas iguais, e o título dela de 90px para o degrau `2xl`. 90px ocupava quatro linhas |
| `diretoria` | refino | a grade vai a 3 colunas no tablet, onde o tema ficava em 2 (`col-6` valia abaixo de 992px) |
| `historia` | refino | o bloco de abertura passa a viver numa coluna de 960px (`Container largura="media"`, o valor medido do `.col-lg-8`) |
| cabeçalho | refino | os `float` viram flexbox; o distintivo de idioma sai de expoente a 9px e entra na linha do símbolo |
| menu mobile | refino | os submenus deixam de nascer abertos. O tema mostrava os 11 itens de uma vez |

### Uma decisão de contraste que vale revisar

O ouro do menu foi **escurecido** para passar em AA, e escurecer um ouro o
aproxima do marrom. A alternativa considerada era transformar "Fale conosco" num
botão de fundo âmbar com texto navy — o par `--color-acento-ambar` /
`--color-acento-ambar-texto` já existe e mede **9,1:1**. Ela preserva melhor a
intenção de marca e muda mais o desenho do menu; ficou registrada aqui em vez de
tomada sozinha.

## Etapa 6 — as duas páginas de texto, e a linha que tinha 127 caracteres

Medida em 25/08/2026. Seis páginas: `termos-de-uso` e
`politica-de-privacidade`, nos três idiomas. **17 de 41 migradas.**

Vale aqui a mesma leitura da Etapa 5: o diff visual não foi rodado como número
porque uma página que troca de camada de apresentação inteira diverge em tudo.
Quem sustenta a etapa são os quatro portões — build, comportamento (51/51),
geometria (zero bloqueios em 123 páginas × viewport) e orçamento — mais uma
quinta conferência, que nestas páginas era a que de fato importava: a
**comparação do texto do `<main>` gerado**, bloco a bloco, contra o build
anterior. São dois documentos jurídicos transcritos; o risco não é o pixel, é uma
frase que fica pelo caminho.

O resultado dessa comparação é o resumo mais curto possível da etapa: **34 → 34
blocos nos termos e 98 → 100 na política**, e cada diferença é uma das linhas
listadas abaixo. Os dois blocos a mais são os `<caption>` das tabelas de cookies.

### O que ficou mais leve

| página | antes | depois |
|---|---|---|
| `termos-de-uso` (× 3 idiomas) | 109 KB | **91 KB** |
| `politica-de-privacidade` (× 3) | 127 KB | **121 KB** |

E a dívida de transbordo horizontal caiu de **53 para 45**: some o `.row` das
seis páginas e some a tabela de cookies, que media 445px dentro de uma coluna de
358px no mobile e punha barra horizontal na página inteira.

### Correções

| onde | tipo | motivo |
|---|---|---|
| `en-us/privacy-policy` | **correção, e é a mais séria da etapa** | o capítulo "Applicable law and jurisdiction" estava **em espanhol**, palavra por palavra o parágrafo da página espanhola. Numa política de privacidade, o capítulo que declara a lei aplicável e o foro |
| `en-us/privacy-policy` | correção | o capítulo "Changes to this policy" trazia o **texto do foro**. Ou seja: alguém colou o parágrafo do foro no lugar do de alterações e preencheu a vaga que sobrou com o espanhol. O do foro voltou ao capítulo dele; o de alterações foi traduzido do português |
| `en-us/terms-of-use` | correção | o capítulo 2 estava **sem número** — "The content and data inserted…" no meio de uma sequência de 1 a 8, numerada em português e espanhol |
| ambas × 3 | correção | hierarquia. Eram `<h1 class="text-md h2">` seguido de oito (termos) e catorze (política) `<h4>`: um h1 disfarçado de h2 e um salto de três níveis, repetido |
| `politica-de-privacidade` × 3 | correção | o bloco de abertura era um `<h2>` com um **parágrafo inteiro** dentro — 638px de altura de heading no mobile, medidos. Virou `<Texto tamanho="lg">`, mesma correção que a `historia` recebeu na Etapa 5 |
| seção de cookies × 3 | correção | o título era `<h4>` e o nome de cada categoria era `<p class="text-bold">` — três subseções de verdade, cada uma com a sua tabela, desenhadas como parágrafo |
| `politica-de-privacidade` × 3 | correção | o e-mail de contato aparecia quatro vezes e, em português, estava dentro de `<a>` **sem `href`** nas três últimas: parecia link, não era. Agora vem de `src/data/contato.ts` e é `mailto:` nos três idiomas |
| ambas × 3 | correção | a data era `12/06/2025` nos três idiomas. Em inglês, `12/06` é 6 de dezembro. Agora o dia é dado (`src/data/juridico.ts`) e cada idioma o escreve por extenso |
| tabela de cookies | correção | quatro colunas não cabem em 390px. A rolagem passa a ser da tabela, numa região com `tabindex="0"` — sem isso o teclado não alcançaria as colunas da direita |
| `politica-de-privacidade` × 3 | correção | um `<p></p>` vazio antes do último bloco de "Quais são os seus direitos?" |
| ambas × 3 | correção | `<body class="modern">` some. `en-us/terms-of-use` era a única das três irmãs **com** a classe |

### Refinos

| onde | tipo | motivo |
|---|---|---|
| ambas × 3 | **refino, e é o motivo de a etapa existir** | a linha tinha **127 caracteres** no desktop, medidos: o `<p>` era filho direto do `.row` e herdava os 1500px do container. Passa a 75, que é o topo da faixa em que se lê sem perder a linha — e é a largura que a própria página já entregava no tablet |
| ambas × 3 | refino | o vão entre capítulos deixa de ser um `<div class="space">` vazio (60px medidos, repetidos 22 vezes à mão) e vira a margem do próprio título |
| ambas × 3 | refino | o título da página passa a `3xl`, como nas páginas da Etapa 5 — e o vão entre título e corpo cai de 160px (duas seções de 80) para 80 |
| ambas × 3 | refino | os capítulos ficam em 19 → 25px fluidos (`tamanho="lg"`), que é o degrau em que o `<h4>` do tema já media |
| `termos-de-uso` × 3 | refino | a citação do endereço vira `<blockquote>` de verdade, com os valores medidos do `.blockquote` (filete de 3px, recuo 10/20px) |
| seção de cookies | refino | o `<hr class="space">` entre categorias some. Ele media 26px no mobile e 60 no desktop; o documento usa um valor só, o menor degrau nomeado (40px), porque subseção não deve soar tão alto quanto capítulo |
| tabela de cookies | refino | o texto era `#3c4043`, um cinza que não existe em nenhum outro lugar do site e cujo papel é o do parágrafo. Consolidado em `--color-texto-paragrafo` |
| ambas × 3 | refino | `<b>` vira `<strong>` em inglês e espanhol, que já era o que o português usava |

### Uma divergência de conteúdo que NÃO foi corrigida, e por quê

A citação dos termos diz que a associação fica na "Rua Professor Carlos de
Carvalho, **nº 280**"; `src/data/contato.ts` diz "**28**, sl. 82". Os dois não
podem estar certos.

Ficou como está. É um documento jurídico com data de vigência, e corrigir a
identificação da parte num texto de 2022 não é trabalho de migração de layout —
é decisão de quem responde pelo documento. Está anotado no topo de
[`termos-de-uso.astro`](../src/pages/termos-de-uso.astro) para não se perder.

## Etapa 7 — publicações e estudos, e o fim do masonry

Medida em 25/08/2026. Seis páginas: `publicacoes` e `estatisticas-e-estudos`,
nos três idiomas. **23 de 41 migradas.**

Mesma leitura das duas etapas anteriores: o diff visual não foi rodado como
número, porque uma página que troca de camada inteira diverge em tudo. Sustentam
a etapa os quatro portões — build, comportamento (51/51), geometria (zero
bloqueios em 123 páginas × viewport) e orçamento — e a comparação de texto do
`<main>` gerado, que aqui deu o melhor resultado possível: **as seis páginas
saíram com o texto idêntico ao build anterior**, bloco a bloco. Nenhuma frase
mudou; o que mudou foi tudo o que está em volta delas.

### O que ficou mais leve

| página | antes | depois |
|---|---|---|
| `publicacoes` (× 3 idiomas) | 402 KB | **189 KB** |
| `estatisticas-e-estudos` (× 3) | 342 KB | **192 KB** |

Metade do peso. As capas eram `<img src>` sem `srcset` e sem `loading`, servidas
no tamanho original; agora passam pelo pipeline da Etapa 2. O transbordo
horizontal herdado caiu de **45 para 33**.

### Correções

| onde | tipo | motivo |
|---|---|---|
| ambas × 3 | correção | hierarquia. Era `<h1 class="text-md h2">` seguido de um `<h3>` que não é cabeçalho de nada — é a frase de abertura. Virou `<Texto tamanho="lg">`, mesma correção da `historia` |
| ambas × 3 | correção | o convite de associação era `<h3>`, escolhido pelo tamanho. É o segundo nível da página, e virou `<h2>` |
| `publicacoes` × 3 | correção | `m-b-30` na grade em inglês e espanhol, e não em português. A divergência estava anotada desde a Etapa 4 e some com a `<Grade>` |
| ambas × 3 | correção | o vão da grade era 30px numa página e 20px na outra — e o 20 vinha de `data-margin` **ausente**, cujo padrão é 20 e não zero. Consolidados nos 28px medidos do `.row` |
| ambas × 3 | correção | os dois botões do convite eram dois `<a>` separados pelo espaço em branco do HTML; em 390px o segundo quebrava a meio caminho da linha. `flex-wrap` com `gap` |
| ambas × 3 | correção | `<body class="modern">` some |

### Refinos

| onde | tipo | motivo |
|---|---|---|
| ambas × 3 | **refino, e é o de maior consequência** | o empacotamento masonry sai do JavaScript. Era `.grid-layout[data-item]` posicionado em absoluto pelo `gridLayout()`; agora é grade CSS. Com ele morrem a terceira armadilha do tema, dois listeners persistentes e 44 linhas do `site.js` |
| `publicacoes` × 3 | refino | o `<br>` no meio da abertura sai. Havia um em português e espanhol, nenhum em inglês — a quebra manual só acertava numa largura |
| ambas × 3 | refino | o título da página passa a `3xl`, como nas páginas das Etapas 5 e 6 |
| `estatisticas-e-estudos` × 3 | refino | o tablet passa de 3+1 para 2×2. É o único desvio de contagem de colunas da etapa, e é uma fileira mais equilibrada do que a órfã que havia |
| ambas × 3 | refino | os cartões passam a ter altura igual dentro da fileira, com os "Leia agora" alinhados na base — é o que dispensava o masonry |

### Uma pendência que esta etapa fechou

A Etapa 4 registrou uma divergência de `/publicacoes` no mobile — 23px de
empilhamento por cartão, do `gridLayout()` contra o Isotope — como
**pendência com prazo: se a Etapa 7 não zerar, vira regressão.** Zerou, e por
construção: a página não tem mais nem `gridLayout()` nem `.grid-layout`.

## Etapa 8 — as quatro páginas de dado, e um vídeo sem estilo

Medida em 26/08/2026. Doze páginas: `associados`, `associe-se`, `apoie` e
`resorts-brasil`, nos três idiomas. **35 de 41 migradas.**

Sustentam a etapa os quatro portões — build, comportamento (**59/59**, de 51),
geometria (zero bloqueios em 123 páginas × viewport) e orçamento — mais a
comparação de texto do `<main>` gerado contra o markup do tema. Ali o resultado
é diferente do da Etapa 7: **cinco páginas perderam palavras de propósito**, e
cada uma é uma correção listada abaixo.

Desta vez o diff visual **foi** rodado nas quatro páginas em português, e o que
ele diz é a etapa inteira em três linhas:

| viewport | antes | depois |
|---|---|---|
| mobile | 420px de largura (transbordo) | **390px** |
| desktop | 1452px de largura (transbordo) | **1440px** |
| tablet | — | altura 6% a 24% menor |

O transbordo horizontal é a dívida da margem negativa do `.row` que a Etapa 0.5
mediu, idêntica no site original. Nas quatro páginas ela **acabou**.

### O que ficou mais leve

| página | antes | depois |
|---|---|---|
| `associados` (× 3 idiomas) | 1669 KB | **371 KB** |
| `associe-se` (× 3) | 1396 KB | **250 KB** |
| `apoie` (× 3) | 822 KB | **215 KB** |
| `resorts-brasil` (× 3) | 746 KB | **298 KB** |

O maior corte de todas as etapas, e a causa é uma só: as faixas de logotipos.
São 78 logos de resort em `/associados` e 15 a 19 de parceiro nas outras três,
todos servidos no tamanho original, sem `srcset` e sem `loading`. O total medido
do conjunto de páginas caiu de 68 MB para 48 MB.

### Correções

| onde | tipo | motivo |
|---|---|---|
| `associados` × 3 | **correção, e a mais grave da etapa** | os três idiomas diziam números diferentes: **83** resorts em português, **80** em inglês e espanhol. Passam a vir de `src/data/associados.ts`; o valor confirmado é 83 |
| `associados` EN e ES | correção | os cinco rótulos dos indicadores estavam **em português** nas páginas inglesa e espanhola — "Quartos", "Empregos Diretos", "Regiões do Brasil". Mesmo defeito do "Leia agora" da Etapa 4 |
| `associados` × 3 | correção | o número não existia no HTML: `<span data-to="83"></span>` vinha vazio e quem o escrevia era o JavaScript. Sem script, a seção mostrava cinco rótulos sem número |
| `asociese` e `resorts-brasil` ES | correção | o rótulo de parceiros era **"Socios / Partners:"** — o único dos nove com duas línguas na mesma linha |
| `apoye` e `resorts-brasil` ES | correção | as duas páginas espanholas traziam hashtags **diferentes**: `#ApoyeEl…` numa e `#ApoyarEl…` na outra. Vale o imperativo, que é o que o português e o inglês usam |
| `asociese` ES | correção | o fecho dizia "ayude a **formar** el sector" onde as outras três cópias espanholas dizem "transformar" |
| `apoie` × 3 | correção | o texto dos dois blocos cinzas era `<strong>` em português e `<h5>` em inglês e espanhol — mesmo conteúdo, dois papéis semânticos, e o `<h5>` ainda saltava um nível depois de um `<h3>` |
| `resorts-brasil` × 3 | correção | o convite do fim era a cópia divergente das quatro: sobre foto, com outra quebra de linha e um botão só. Passa a ser o mesmo `<ConviteAssociese>` — **a foto de fundo se perde**, e é o preço de as doze cópias virarem uma |
| `associados` × 3 | correção | o convite vem **sem** o botão secundário: ele apontava para `/associados`, que é a própria página |
| `associates` e `asociados` | correção | o bloco comentado de "Folders" some. Era markup morto desde 2022, presente em dois dos três idiomas |
| todas × 3 | correção | as 24 cores literais em `style=` inline (`#570A57`, `#A91079`, `#EFB72C`, `#15184B`, `#28B055`) viram tons nomeados — e com elas vem a correção de contraste da Etapa 3: o tema escrevia branco sobre o âmbar (1,6:1) e sobre o verde (2,9:1) |
| `apoie` e `resorts-brasil` × 3 | correção | os emojis e as siglas "RE/SO/RT" eram `<h3>` e `<h2>` — cabeçalhos cujo texto é "😍" e "RE", que entravam no sumário de um leitor de tela. Viram texto decorativo com `aria-hidden` |
| `associe-se` × 3 | correção | o ícone de cada benefício vinha dentro de `<a href="#">`: um link visível, focável e sem destino, 24 vezes somando os idiomas |
| `associe-se` × 3 | correção | o botão "Associe-se" abria `/fale-conosco` em **aba nova** — destino interno, o que tira do visitante o controle da navegação |
| `associados` × 3 | correção | o `alt` do mapa era `"mapa"`. Um mapa do Brasil com as regiões marcadas não é decorativo |
| todas × 3 | correção | `<body class="modern">` some |

### Refinos

| onde | tipo | motivo |
|---|---|---|
| `resorts-brasil` × 3 | refino | a foto grande da Unsplash era `background-image` num `style=` inline com `height: 400px` — sem lazy e sem caixa responsiva. Vira `<img loading="lazy">` numa caixa com `aspect-ratio`. **O hotlink foi preservado por decisão**; ver `src/data/midia.ts` |
| `resorts-brasil` × 3 | refino | a fachada de vídeo passa de `height: 420px` fixo para `aspect-ratio: 16/9`, que é a proporção real do vídeo — some a tarja preta em cima e embaixo |
| todas × 3 | refino | os `<br>` manuais saem. Havia dois em português em `resorts-brasil` e um em português e espanhol nas faixas de parceiros, nenhum em inglês |
| `associados` × 3 | refino | os 11 `<div class="line">` entre estados viram uma borda entre irmãos. Não há mais como sobrar uma no fim |
| `apoie` × 3 | refino | o link "Fale conosco" dos dois cartões coloridos ganha um chevron. Medido no tema com o mouse em cima, ele **não responde ao hover de forma nenhuma** — nem cor, nem sublinhado |
| todas × 3 | refino | o título de página passa a `3xl`, como nas Etapas 5, 6 e 7 |

### O que este delta não mostra, e vale dizer

O diff visual não roda em `en-us` e `es-es`, e é justamente ali que estão as
correções mais graves da etapa — os números divergentes e os rótulos em
português. **Nenhum portão as veria**, pela mesma razão que a Etapa 6 registrou
sobre a política de privacidade inglesa: a estrutura estava certa. Elas
apareceram lendo os três idiomas lado a lado e comparando o texto gerado com o
do tema.

## Altura não é critério

**Decisão do projeto: divergência de altura de página é aceita sem justificativa.**
O que importa é o layout ficar consistente e coerente — não a página ter o mesmo
número de pixels que tinha o site original.

Isso tem consequência direta na verificação. A linha `ALTURA` do
`visual-diff.mjs` deixa de contar como divergência, e as 11 divergências da
política de privacidade saem da lista de pendências. Em compensação, a suíte
comportamental precisa afirmar o que altura escondia: que **nenhuma seção
colapsou**, que **nenhuma grade perdeu colunas** e que **nada transborda na
horizontal**. Uma página pode encurtar 800px por ter menos conteúdo — não pode
encurtar porque uma seção virou zero.

É o que a Etapa 0.5 constrói.

## Como classificar um delta novo

Ao rodar o diff numa etapa, cada página acima do limiar entra aqui com captura,
viewport e uma linha de motivo, numa destas três categorias:

- **refino** — tipografia fluida, balanceamento de título, espaçamento
  harmônico, `aspect-ratio` no hero. Mudança de pixel querida.
- **correção** — hierarquia de heading, `bodyClass` uniformizado, divergência
  entre idiomas resolvida por componentização.
- **regressão** — volta para a etapa.

**Delta sem classificação bloqueia a etapa.** É o que impede uma regressão de se
esconder no meio dos refinos, que é o risco real de abrir mão do portão de pixel.

## O que este arquivo não cobre

O diff visual nunca foca elemento nenhum, então estados de foco não aparecem
aqui — quem os cobre é a suíte comportamental. O mesmo vale para o carrossel de
logos, escondido durante a comparação por girar sozinho.
