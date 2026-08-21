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
