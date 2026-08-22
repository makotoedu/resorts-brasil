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
