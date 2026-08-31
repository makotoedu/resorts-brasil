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

## Etapa 9 — a home, e o carrossel que ninguém via

Medida em 26/08/2026. Três páginas: `index`, `en-us/home` e `es-es/inicio`.
**38 de 41 migradas.**

Mesma leitura das quatro etapas anteriores: o diff visual não foi rodado como
número, porque uma página que troca de camada inteira diverge em tudo. Sustentam
a etapa os quatro portões — build, comportamento (**63/63**), geometria (zero
bloqueios em 123 páginas × viewport) e orçamento — mais duas comparações de HTML
gerado.

A segunda dessas comparações é o resultado mais forte da etapa: **as três homes
saíram com 1590 elementos, idênticos tag a tag e classe a classe**. A home era a
página com mais divergências entre idiomas de todo o site.

### O delta que não é delta: a faixa de associados estava invisível

Antes de qualquer refino, a correção que domina a etapa. `.carousel` tem
`opacity: 0` e `visibility: hidden` no `style.css`, e só `.carousel-loaded` —
classe que o init do flickity punha — devolvia as duas. **As três homes baixavam
70 logotipos em tamanho original para não mostrar nenhum.**

Não aparece como percentual de pixel porque o `visual-diff.mjs` esconde aquela
região de propósito, nos dois lados. Aparece como uma seção que passa a existir.
A análise dos quatro portões que não viram está em
[decisoes.md](decisoes.md#o-carrossel-da-home-estava-invisível-em-produção).

### O que ficou mais leve

| página | antes | depois |
|---|---|---|
| `index` mobile | 4405 KB | **451 KB** |
| `index` desktop | 4405 KB | **621 KB** |
| `en-us/home` mobile | 4405 KB | **456 KB** |
| `es-es/inicio` mobile | 4405 KB | **451 KB** |

**É o maior corte do projeto, e o quarto seguido.** O conjunto medido caiu de
47 971 KB para **24 456 KB** — metade do peso total do site em nove etapas.

Um número cresceu, e fica declarado: `/design` foi de 225 para **238 KB**, porque
o catálogo ganhou o `<CarrosselLogos>` com oito logotipos de demonstração. É
crescimento de vitrine, não de página de conteúdo — o `/design` é `noindex` e
está fora do sitemap —, e a demonstração já foi cortada de doze para oito, que é
o mínimo em que a volta fecha sem deixar vão no desktop.

E o transbordo horizontal herdado caiu de **33 para 3**: sobram as três páginas
de ebook.

### Correções

| onde | tipo | motivo |
|---|---|---|
| as três | correção | **hierarquia**. O `<h2>` do hero vinha antes do `<h1 class="text-md h2">` da associação — o h1 não era o primeiro heading da página —, e depois vinham seis `<h3>` e três `<h4>`, todos escolhidos pelo tamanho. Agora o hero é o h1 e as seções são h2 |
| `en-us/home`, `es-es/inicio` | correção | o **título** da faixa de parceiros não existia nas duas: elas abriam direto no rótulo "Maintainers:" |
| `en-us/home`, `es-es/inicio` | correção | o `#ApoieOTurismoBrasileiro` só existia em português — e traduzido ele já estava no `ui.ts` desde a Etapa 8 |
| `es-es/inicio` | correção | `Socios / Partners:`, o único dos nove rótulos de parceiro com duas línguas na mesma linha, vira `Socios:` |
| `es-es/inicio` | correção | os rótulos dos destaques tratavam o leitor por *usted* num cartão ("Acceda a la cartilla") e por *tú* no seguinte ("Accede a la guía"). O resto do site é *usted* |
| `en-us/home`, `es-es/inicio` | correção | o `alt` da foto da associação era "Periquito por Claire Thibault" — **em português nas três**. Alt é texto lido em voz alta |
| as três | correção | o `id` da seção de associados só existia na home portuguesa |
| as três | correção | `<body class="modern">` some |
| seis páginas já migradas | **correção fora da etapa** | o `<LinkAcao>` volta a ser maiúsculo com `letter-spacing: 1px`, como o `.item-link` do tema sempre foi. Nasceu sem as duas porque a lista do medidor não pedia `textTransform` nem `letterSpacing` — ver [decisoes.md](decisoes.md) |

### Refinos

| onde | tipo | motivo |
|---|---|---|
| as três | **refino, e é o de maior consequência** | o carrossel sai do JavaScript. Eram 105 linhas reproduzindo a matemática de célula do flickity; agora é uma trilha de CSS com a fila escrita duas vezes e `translateX(-50%)`. Com ele morre o **único `setInterval`** do projeto |
| as três | refino | o movimento é **contínuo** no lugar de um salto de uma célula por segundo com 600 ms de `ease`. A velocidade média é a mesma — um logotipo por segundo, o `data-autoplay` medido |
| as três | refino | a escada de colunas do carrossel passa a ser 2 → 3 → 6 por container query, no lugar de 1 → 2 → 3 → 4 → 6 por faixa de janela. Some o degrau de **um** logotipo por tela no celular, que dava uma célula de 340 px de lado |
| as três | refino | os seis cartões de destaque perdem o `height: 360px` inline e ganham `aspect-ratio` 3/2. No celular a caixa era **mais alta que larga** (360 × 330) |
| as três | refino | o hero deixa de ser `background-image` num `style=` inline: vira `<Imagem>` com `srcset`, `fetchpriority` e o zoom em CSS. A página encolhe ~30% de altura no tablet |
| as três | refino | tipografia fluida no título da associação — o tema saltava de 32 px no celular para 62 px a partir do tablet; agora interpola, e o extremo do desktop é o medido |
| as três | refino | `text-wrap: balance` nos títulos dos cartões e do hero |
| as três | refino | os 70 logotipos deixam de ser links. Ver a nota de decisão — no site original eram 71 `<a href="#">`, e desde a saída do jQuery nenhum deles estava na ordem de tabulação |

### Uma mudança de defesa, não de conserto

O `object-fit: contain` da célula do carrossel **não** corrige distorção. A
leitura do CSS do tema sugeria que corrigisse (`width: 100%` e `height: 100%` sem
`object-fit`, em célula quadrada), mas os 80 logotipos do acervo são todos
320 × 320 — conferidos um a um. Fica como defesa para o dia em que entrar um
logotipo largo.

## Etapa 10 — o e-book, e o texto invisível no rodapé

As três páginas do e-book. É a etapa que fecha a migração: **41 de 41**.

O diff visual não foi rodado como comparação contra o original, e a razão é a
mesma que a Etapa 9 já registrava para a home — a página mudou de propósito em
quase toda superfície. O que substitui a comparação de pixel aqui é a
**conferência de conteúdo**, que é o risco real quando 700 linhas de markup viram
dois arquivos de dados:

| conferido | resultado |
|---|---|
| nomes de autor | 41 no markup antigo, 41 no novo, nenhum ausente |
| cartões renderizados | 41 |
| capítulos no cartão | 41, nenhum ausente |
| cargos | 41, nenhum ausente |
| títulos do índice | 24, nenhum ausente |
| linhas de autoria do índice | 24, nenhuma ausente |
| perfis do LinkedIn | 35 antes, 35 depois |
| elementos gerados, pt × en × es | 864, idênticos nos três |

### Correções

| onde | classificação | o quê |
|---|---|---|
| rodapé das três | **correção, e a mais grave da migração** | a linha de copyright e o botão **"Preferências de cookies"** estavam a **1,23:1** — navy sobre quase-preto, porque o tema nunca declarou cor de texto naquela faixa e ela herdou a do `<body>`. Estavam invisíveis em produção |
| rodapé das três | correção | os 12 links de navegação iam de 2,86:1 para 7,08:1. E o *hover* deles era **pior** que o repouso (3,22:1): apontar o link o deixava menos legível. Agora vai para o branco |
| rodapé das três | correção | os títulos das três listas, de 3,69:1 para 18,7:1 |
| botão de download, 3× por página | correção | o rótulo era branco sobre um gradiente ciano→coral: **1,65:1** numa ponta e 3,74:1 na outra. Passa ao carvão do e-book — 11,50:1 e 5,08:1 |
| 41 cartões de autor | correção | o azul do capítulo (`#0c71c3`, **123 ocorrências**) dava 3,77:1 em texto de 13 px. Clareado 12%, dá 4,58:1 |
| chamada de ação do "sobre" | correção | o verde do gradiente escurece 25%. Aqui **nenhuma cor de texto** passava nas duas pontas — branco dava 2,73:1 no verde e o navy 1,51:1 no azul —, então quem cedeu foi o fundo |
| as três | correção | o `<h1>` e o botão passam a falar o idioma da página. O cartão da home já prometia *"Managing the Traveller's Journey → Download the e-book"* e entregava português |
| as três | correção | o subtítulo do topo era `<h4>` logo abaixo do `<h1>`, e os três rótulos de seção do índice eram `<h4>` sob um `<h2>`. Vira `<p>` e `<h3>` — as três páginas saem do grupo dos sumários quebrados |
| as três | correção | o `href="#"` de sete perfis vira ausência de link: o `<CartaoMembro>` mantém o símbolo, apagado. Um link focável sem destino a menos, sete vezes |
| Felipe Bogéa | correção | o LinkedIn dele terminava em `%20` — um espaço codificado no fim da URL |

### Refinos

| onde | classificação | o quê |
|---|---|---|
| as três | **refino de maior consequência** | as três fotos de fundo deixam de ser `background-image` em `style=` inline e viram `<Imagem>` posicionada — AVIF/WebP, `srcset` e `loading`. A de 2560 px entregava 78 KB para todo mundo |
| as três | refino | os 41 retratos passam pelo pipeline. É a maior fatia dos 1.156 KB → 315 KB |
| as três | refino | o botão de download **ganha hover**. Medido, o CTA principal da página não mudava nada com o mouse em cima |
| as três | refino | o título do topo entra na escala: 32 → 40 px no celular (`--text-3xl`), com o extremo de 62 px do desktop preservado. Fim do salto na media query |
| as três | refino | o índice e a galeria passam à `<Grade>` com container query. Some o `.row` e, com ele, o transbordo horizontal de 30 px no celular — as últimas 3 pendências da lista |
| as três | refino | a linha sob o rótulo de seção deixa de ser `<hr>` e vira borda do próprio título. `<hr>` é quebra temática; aquilo é decoração de cabeçalho |
| as três | refino | o vídeo perde o `height: 420px` e ganha `aspect-ratio: 16/9`, como as outras páginas desde a Etapa 8 |
| as três | refino | o cabeçalho flutua por `position: absolute` no lugar de `margin-top: -80px` no `<main>`. Um número em vez de dois — o tema precisava de `-120px` quando havia topbar |
| as três | refino | o logotipo duplicado (`.logo-default` + `.logo-dark`, **o mesmo arquivo** nos dois) vira um só |
| catálogo | refino | `/design` ganha a variante `ebook` do botão com os cinco estados, a variante escura do `<CartaoMembro>` e as sete superfícies do `<SecaoEbook>` |

### O que ficou como está, e por quê

**O logotipo continua com pouco contraste sobre a foto.** O "25 ANOS" é navy
sobre um fundo escuro. O tema tinha o mesmo problema — as duas `<img>` dele
(`logo-default` e `logo-dark`) apontavam para o mesmo arquivo, então a variante
escura nunca existiu. Corrigir exige um logotipo novo, que é trabalho de marca e
não de migração.

**O texto continua em português nas três páginas.** Ver a nota da Etapa 10 em
[decisoes.md](decisoes.md): não há tradução no repositório para mover, e escrever
uma é conteúdo novo. A costura ficou pronta — os campos já aceitam mapa por
idioma.

## Etapa 11 — a demolição, e o único pixel que ela move

A remoção do tema não muda pixel nenhum: nenhuma página carregava aquelas folhas
desde a Etapa 10, e o CSS gerado pela troca dos 60 `@source` por quatro
diretórios saiu **byte a byte idêntico** — 40.005 bytes, mesmo hash.

**Uma coisa muda, em seis páginas:** as miniaturas dos dois vídeos passaram pelo
`<Imagem>`, então deixam de ser o JPG original e passam a AVIF com reserva em
WebP, em `srcset`.

| onde | classificação | o quê |
|---|---|---|
| `/resorts-brasil` × 3 e `/ebook` × 3 | **refino** | miniatura de vídeo recomprimida pelo pipeline: 176 KB → 26 KB nas duas, com `srcset` e `sizes`. Enquadramento, caixa e proporção iguais |

A recompressão é a mesma que as outras 179 imagens do site já sofrem, com a mesma
qualidade 50 — o piso medido por [`medir-imagens.mjs`](../scripts/medir-imagens.mjs),
abaixo do qual aparece diferença perceptível e acima do qual só aumenta o
arquivo. Nas três amostras daquela medição (foto, retrato e logo chapado), q50 em
AVIF dá **0,00% de pixels percebidos diferentes** contra o original.

### O que quase virou regressão, e não foi por medição

Passar a miniatura para o `<Imagem>` põe um `<picture>` entre o botão da fachada
e o `<img>`, e os dois vêm de um componente **filho** — que não recebe o atributo
de escopo do Astro. A regra `.yt-facade-btn img` ficaria inerte, e o `<picture>`,
sendo caixa inline de altura automática, faria o `height: 100%` do `<img>` se
resolver contra ele em vez de contra a caixa 16/9.

Nenhum dos quatro portões veria: a geometria mede a caixa da fachada, que
continua 16/9 esteja a miniatura onde estiver. Resolvido com `:global(picture)` e
`:global(img)`, e registrado no [CLAUDE.md](../CLAUDE.md) como o avesso da
armadilha 1.

## View Transitions — o único delta que engorda de propósito

A navegação passou a ser sem recarga (`<ClientRouter />`), o último refino da
lista do plano. Ele não muda pixel em repouso: o que muda é a **transição** entre
páginas — o fade que substitui o branco da recarga.

**Ele engordou todas as 41 páginas, e essa é a parte que precisa estar escrita.**

| | antes | depois |
|---|---|---|
| JS por página (cru) | 4 KB | **20 KB** |
| na rede (brotli, uma vez) | — | **+4,9 KB** |
| `/404`, o mais leve | 77 KB | 95 KB (+23%) |
| `/index` | 451 KB | 469 KB (+4%) |
| conjunto medido | 18,98 MB | 20,42 MB (+7,6%) |

**O orçamento reprovou 68 das 82 medições, e foi rebaseado por decisão explícita**
— que é exatamente para isso que a catraca existe. O número cru exagera o custo
real: o `ClientRouter` é um arquivo com hash em `/_astro/`, servido com
`immutable` de um ano, então são 4,9 KB baixados **uma vez** por visitante. Da
segunda página em diante ele economiza trabalho, em vez de custar.

Onde o cálculo é menos favorável: quem chega da busca, lê uma página e sai paga
os 4,9 KB e não usa nenhuma transição. Num site institucional isso é uma fatia
grande das visitas, e é o argumento honesto do outro lado.

### O que veio junto, e não é peso

O ciclo de vida do [`site.js`](../src/scripts/site.js) — `AbortController` por
página, `signal` em todo listener, teardown no `astro:before-swap`. Sem ele, os
três listeners presos a `window`/`document` acumulariam uma cópia por navegação.

**A checagem óbvia disso não funciona**, e o teste negativo provou: clicar no
menu depois de navegar passa mesmo com o teardown quebrado, porque o gatilho é um
elemento e o elemento é trocado junto com o corpo. O que acumula são os três de
`window`/`document`, e como os três são idempotentes não há sintoma funcional
nenhum — dez cópias fazem o mesmo que uma. Quem vê é a contagem de listeners via
CDP, em `tests/verify-behaviors.mjs`: com o defeito plantado ela acusa
`window.resize 1→5`, `window.scroll 1→5`, `document.click 3→7`.

## Atualização do Astro 7 — 120/120, e o que quase entrou como delta

Medido em 29/08/2026. Diferente de todas as entradas acima, **esta comparação não
é contra o site original**: é entre a build 6.4.8 e a 7.2.9 do mesmo código. Para
uma troca de motor o alvo é zero, e foi zero.

| viewport | resultado |
|---|---|
| mobile | 40/40 idênticas |
| tablet | 40/40 idênticas |
| desktop | 40/40 idênticas |

Nenhum diagnóstico escrito — o `visual-diff.mjs` só grava PNG acima de 0,5%, e
nenhuma combinação chegou lá.

### O delta que existia e foi consertado antes de virar pixel

O `compressHTML` mudou de padrão no v7 e passou a **remover** — em vez de
colapsar num espaço — a quebra de linha entre um texto e uma tag inline vizinha.
Eram **340 ocorrências**: `e-mailcontato@resortsbrasil.com.br` nas três políticas
de privacidade, `Cloudbe·` no rodapé de todas as páginas, e o catálogo `/design`
inteiro com prosa colada em `<code>`.

Não aparece nesta tabela porque foi corrigido antes da medição, com 82 `{' '}`
em cinco arquivos. **Aparecia se não fosse** — e é a única coisa nesta
atualização que teria chegado à produção sem portão nenhum reclamar. O motivo
está registrado em [decisoes.md](decisoes.md), "Atualização do Astro".

### As 18 divergências que não existiam

A primeira rodada acusou **18 combinações página/viewport acima de 0,5%**, com
deslocamento vertical acumulado nas páginas cheias de imagem. Nenhuma era real.

O que denunciou foi medir os dois lados em vez de olhar o PNG: mesma altura de
página, mesmas posições de `header`, `main` e `footer`, 18 imagens carregadas de
cada lado. A causa era o `python -m http.server` servindo a linha de base —
single-thread e HTTP/1.0, ele enfileira as requisições, o `networkidle` dispara
entre uma e a seguinte, e o screenshot sai antes da troca de webfont. Com um
servidor concorrente as mesmas páginas saíram idênticas.

**Fica como regra, e vale para qualquer rodada futura:** antes de classificar uma
divergência, confira se o aparelho que a mediu está certo. Um diff visual que
compara duas builds servidas por servidores diferentes mede a diferença entre os
servidores. O procedimento está em [verificacao.md](verificacao.md), seção 3.

### Peso

O HTML ficou **1,43% menor no cru e 0,87% no brotli** — 113 bytes por página. O
orçamento saiu de 20422 KB para 20370 KB e foi rebaseado, que é como a catraca
prende o ganho. É pouco, e a decisão de adotar o `'jsx'` foi tomada com esse
número na mesa, não apesar dele.

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

## Consistência — os deltas da crítica de layout

Todos deliberados, todos medidos, e nenhum deles é fidelidade ao tema: o site
original tinha estes defeitos e a migração os preservou.

| páginas | tipo | motivo |
|---|---|---|
| 3 homes | **correção** | o rótulo do CTA de destaque deixa de ser branco sobre âmbar (1,63:1) e passa ao navy (9,10:1). O `tokens.css` já documentava essa correção para a `<FaixaDestaque>`; o botão usava outro token e ficou de fora |
| 4 páginas × 3 idiomas | **correção** | `--color-texto-sutil` escurece de `#9aa0a6` para `#6d7484` sobre fundo claro (2,64 → 4,69:1). O cinza claro fica como `-inverso`, para o rodapé e os cartões do e-book |
| home, `/associe-se`, e todo `<Hero>` | **correção** | o véu sobre foto vira gradiente: leve no topo, `--color-veu-forte` (58%) onde o texto mora. Resolve onze reprovações de branco sobre foto clara sem escurecer as fotos que já funcionavam |
| 3 páginas de e-book | **correção** | a `<SecaoEbook>` com foto ganha véu chapado. O `h2` de 50px da seção de vídeo caía sobre o facho ciano da própria imagem, a 1,64:1 |
| 41 páginas | **refino** | `papel` substitui `tamanho` nos títulos. O `h2` de 62px da home cai para 34px (empatava com o `h1` do hero), o `h1` de `/diretoria` sobe de 34 para 62px (era o único menor que os das outras), as faixas de `/apoie` e `/historia` caem de 50 para 34px e as seções "Prefácio" e "Autores" do e-book, de 62 para 50px |
| 5 páginas × 3 idiomas | **refino** | o CTA `<ConviteAssociese>` sobe de 25 para 34px, igualando os demais títulos de seção. Em `/publicacoes` e `/estatisticas-e-estudos` ele era tipograficamente maior que o conteúdo que nomeia a página |
| 4 páginas × 3 idiomas | **refino** | a `<FaixaLogos>` deriva as colunas da contagem de itens. Sete mantenedores deixavam cinco células vazias em `/associe-se` e três nas demais; agora deixam uma |
| `/associados` e as 4 com parceiros | **refino** | o rótulo de grupo alinha ao topo em vez do centro vertical — ele flutuava no meio de uma grade alta, longe da linha que nomeia |
| `/design` | **correção** | os rótulos das demos escuras passam a `--color-texto-sutil-inverso`, e a amostra de `cor="destaque"` sai do papel branco para a superfície escura, que é onde o coral existe de verdade |

| 6 páginas × 3 idiomas | **correção** | seis juntas entre seções mediam **160px** porque os dois recuos de 80 somavam. O site inteiro usa 80px entre seções; aquelas seis eram a exceção, não um ritmo diferente. Com elas corrigidas, o vão passa a significar: **40px dentro de um grupo, 80px entre seções**, e só o e-book mantém a escala própria dele |

**Nenhum desses deltas foi verificado no `visual-diff`**, e vale dizer por quê: ele
compara contra o site original, que carrega os mesmos defeitos. Quem afirma o
resultado aqui são os dois portões novos — contraste e tipografia —, que medem o
que a página entrega em vez de compará-la com o que ela era.

## Conteúdo — a copy do convite e a saída dos emoji

Os dois itens que faltavam da auditoria de layout, aplicados. São deltas de
**conteúdo**: mudam texto, não geometria, e nenhum dos seis portões teria pedido
qualquer um dos dois.

| páginas | tipo | motivo |
|---|---|---|
| 4 páginas × 3 idiomas | **refino** | o `<ConviteAssociese>` passa a argumentar a partir da página de onde o leitor vem. Eram doze instâncias da mesma frase — resolvido como engenharia e não como leitura; no quarto encontro o bloco some da vista. O desenho continua um só, o que varia é o argumento |
| `/associe-se` × 3 idiomas | **refino** | o fecho tinha o parágrafo do convite emprestado, e era a **quinta** instância dele, a que a contagem do componente não via. Ganha `joinCtaText`, que fala do que o botão faz: levar à lista de associados |
| `/apoie` × 3 idiomas | **refino** | saem os três emoji decorativos do topo dos blocos de destaque (😍 ✌️ 🤝). Eram um segundo sistema de ícones — glifos raster do sistema operacional, diferentes em cada plataforma — ao lado dos 16 SVGs conferidos contra a fonte de origem |
| `/apoie` e as 4 com parceiros, × 3 idiomas | **refino** | saem o 💪 do `supportLead` e o ❤️ do fim da hashtag. Ver a ressalva abaixo |

**A hashtag é a única que merece revisão de quem cuida da marca.**
`#ApoieOTurismoBrasileiro❤️` virou `#ApoieOTurismoBrasileiro`, e o coração ali
estava mais perto de assinatura de campanha do que de decoração. Saiu junto
porque a instrução foi remover os emoji do site; se a campanha existe fora do
site com o coração, é reverter uma string em cada idioma.

**O peso de `/apoie` e `/apoye` subiu 10 KB no mobile, e a linha de base foi
regravada.** A causa foi medida, não suposta: sem os três parágrafos de emoji a
página encurta, o limiar de `loading="lazy"` alcança um logotipo a mais da faixa
de parceiros e passam a ser 11 em vez de 10. Nenhum recurso novo, nenhuma imagem
maior — a mesma faixa, um passo adiante. É o tipo de variação que o próprio
`verify-orcamento.mjs` já documenta como sensível, e por isso ele fixa a conexão
em 4G e congela a animação.

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

**E essa segunda exclusão custou caro.** Ela é legítima — a posição de cada logo
depende do instante da captura —, mas cegou a única verificação de pixel daquela
região, e o carrossel das três homes ficou **invisível em produção** por meses
sem que nenhum dos quatro portões visse. A regra que fica: uma exclusão de portão
entra junto com quem cobre o buraco, e não só com o motivo dela. Hoje quem cobre
são as verificações `carrossel: a faixa está visível`, `a faixa anda` e
`geometria das células`, em `tests/verify-behaviors.mjs`.
