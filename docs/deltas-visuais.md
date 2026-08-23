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
