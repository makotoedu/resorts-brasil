# Revisão de design

O relatório da revisão de design de outubro de 2026: o que a auditoria encontrou,
como cada achado foi corrigido e as notas de antes e depois.

O método é o da skill [`/design-review`](https://github.com/garrytan/gstack/blob/main/design-review/SKILL.md)
do gstack: auditar o site no navegador, dar nota por categoria, corrigir um achado
por commit, reauditar. Ele vem adaptado às ferramentas daqui. O navegador é o
Playwright do projeto; o "sistema inferido" sai do
[`scripts/medir-sistema.mjs`](../scripts/medir-sistema.mjs); e o relatório mora
aqui, e não num diretório do gstack. O porquê de cada decisão está em
[decisoes.md](decisoes.md), seção "Revisão de design", e cada pixel que mudou está
classificado em [deltas-visuais.md](deltas-visuais.md).

**Por que esta revisão existe.** O design system foi montado medindo o tema
Inspiro e copiando o que saiu, e a cópia trouxe junto as incoerências dele. O
`decisoes.md` já dizia: a migração "mede tudo e decide nada". Esta é a primeira
etapa do projeto em que os valores são **decididos**.

**Decisões de marca tomadas antes da auditoria (20/10/2026):**

| decisão | escolha |
|---|---|
| família | Poppins nos títulos, DM Sans no texto e na interface |
| caixa alta | fica em botões, menu e links de ação, padronizada: um tamanho (13px), um peso (600), um espaçamento (0,08em) |
| corpo | 16px |

---

## Antes — 20/10/2026

Medido sobre a build de `e38a40d`, com as 40 páginas × 3 viewports no inventário
e 15 páginas nas capturas: as três homes, /associados, /associe-se, /apoie,
/historia, /resorts-brasil, /publicacoes, /diretoria, /fale-conosco, /termos-de-uso,
/ebook, a 404 e /es-es/asociese.

### Primeira impressão

- **O site comunica** uma associação institucional do setor de resorts: séria,
  colorida, com fotografia boa e marca reconhecível na primeira tela.
- **Eu noto** que os títulos grandes são bem desenhados, mas tudo em volta deles
  briga. Títulos de seção mais pesados que o título da página, parágrafos cinza de
  14px ao lado de títulos de 34px em semibold, botões minúsculos em caixa alta, e
  frases de quatro linhas montadas como título.
- **Os três primeiros pontos para onde o olho vai** (home, desktop): a foto do
  hero, o título branco "Viva a experiência de um Resort" e o botão âmbar.
- **Uma palavra:** *desigual*. As peças são boas; a voz não é uma só.

### Teste das áreas (2 segundos)

Toda área das páginas auditadas se nomeia sozinha: hero, bloco institucional,
cartões de destaque, carrossel de associados, parede de parceiros, rodapé. Nenhuma
área sem propósito claro.

### Trunk Test

| pergunta | resultado |
|---|---|
| que site é este? | ✅ logotipo e "25 anos" em toda página |
| em que página estou? | ✅ todo h1 é único e visível |
| quais são as seções principais? | ✅ o menu |
| que opções tenho aqui? | ✅ |
| onde estou no conjunto? | ❌ o menu não marca a página atual (sem `aria-current`, sem indicação visual) |
| como busco? | N/A: 41 páginas, sem busca e sem necessidade dela |

**PARCIAL (4 de 5 aplicáveis).** Vira o achado A18.

### O sistema inferido

`node scripts/medir-sistema.mjs` lê cada elemento com texto próprio visível nas 40
páginas e conta as combinações que o navegador de fato desenha. Os números de
antes ficam em [`tests/sistema-medido.json`](../tests/sistema-medido.json) no
commit que abre esta revisão.

| | celular | tablet | desktop |
|---|---|---|---|
| famílias | 1 (Poppins) | 1 | 1 |
| pesos | 400, 500, 600, 700, 800 | 5 | 5 |
| tamanhos distintos | 9 | 10 | 10 |
| entrelinhas distintas | 15 | 15 | 16 |
| combinações tipográficas | 38 | 38 | 42 |
| combinações de caixa alta | 5 | 5 | 7 |
| pares tamanho × peso de título no conteúdo | 15 | 15 | 15 |
| raios | 4 (9999, 5,88, 11,48, 14px) | 4 | 4 |
| parágrafos acima de 75 caracteres por linha | 0 de 332 | 206 de 332 | **217 de 332** (mediana 91, máximo 207) |
| controles com menos de 44px | **508** ocorrências, 60 formas | — | — |

Quatro leituras saem daí:

- **O h2 renderiza em 8 combinações** de tamanho e peso: 18/500, 18/600, 25/500,
  25/600, 34/500, 34/600, 50/500 e 50/800.
- **O h1 de página pesa menos que os títulos abaixo dele.** São 33 h1 em 500
  contra 102 h2 de bloco e 54 de seção em 600.
- **A linha de texto não tem limite no desktop.** O convite de /publicacoes corre
  em ~170 caracteres, numa linha só.
- **Os controles não têm altura de toque:** botão `md` com 36px, `LinkAcao` com
  23px, ícones sociais com 32px.

### Notas por categoria

A regra da skill: cada categoria começa em A, achado alto tira uma letra, médio
tira meia e polimento não tira. A conversão para a média ponderada é A = 4,
B = 3, C = 2, D = 1, F = 0, e meia letra vale 0,5.

| categoria | peso | nota | achados |
|---|---|---|---|
| Hierarquia visual | 15% | **C** | A1 (alto), A8, A9 |
| Tipografia | 15% | **D−** | A3, A4 (altos), A2, A5, A6 |
| Espaçamento e layout | 15% | **C+** | A10, A11, A12, A13 (polimento) |
| Cor e contraste | 10% | **B+** | A24 (adiado: decisão de marca) |
| Estados de interação | 10% | **D+** | A14 (alto), A15, A18, A20, A16 (polimento) |
| Responsivo | 10% | **B** | A17 (alto) |
| Conteúdo e microcópia | 10% | **B+** | A22, A23 (polimento) |
| AI slop | 5% | **B+** | A21 |
| Movimento | 5% | **B+** | A19 |
| Performance como design | 5% | **A** | A7 (polimento) |

**Design Score de antes: C+ (2,45 de 4).**

**AI Slop Score de antes: B+.** O site tem cara de associação real, com
fotografia própria, logotipos de verdade e cor de marca. O único tique é a grade
de oito ícones idênticos em /associe-se.

O contraste é o ponto forte. O portão renderizado passa nos 10.403 trechos de
texto, e as correções das etapas anteriores aparecem aqui como nota alta.

### Achados

Impacto pela régua da skill. A coluna "correção" aponta o commit da Fase 2 em
diante; "adiado" vai para a seção do fim.

| # | achado | categoria | impacto | correção |
|---|---|---|---|---|
| A1 | **Peso invertido.** O h1 de página está em 500 e os títulos de seção, bloco e cartão abaixo dele em 600. Os números do contador (50px/600) e um h2 do ebook (800) pesam mais que o h1. | hierarquia | alto | D03 |
| A2 | O mesmo papel em três pesos: título de página em 500, 600 (hero) e 800 (404). O `peso` é um eixo livre por página, o mesmo defeito que o `tamanho` já foi. | tipografia | médio | D03 |
| A3 | Corpo em 14px, herança do root de 14px do tema. | tipografia | alto | D02 |
| A4 | Medida: no desktop, 217 dos 332 parágrafos passam de 75 caracteres por linha (mediana 91, máximo 207). | tipografia | alto | D06 |
| A5 | Degraus que colidem: título de cartão em 18px e de bloco em 19px no celular, e a abertura de página em 25px, no degrau do título de bloco. | tipografia | médio | D02, D04 |
| A6 | Valores soltos: 16 entrelinhas, 7 combinações de caixa alta, 4 espaçamentos de letra em px, e caixa alta digitada no `ui.ts`. | tipografia | médio | D02, D05 |
| A7 | Os pesos 700 e 800 são baixados em toda página para nove elementos. | performance | polimento | D01 |
| A8 | Cada página monta a própria abertura. O vão do título ao conteúdo varia de 14 a 120px, e a abertura aparece em três cores. | hierarquia | médio | D17 |
| A9 | O alinhamento alterna entre centro e esquerda cinco vezes em /associe-se, e também em /historia. | hierarquia | médio | D18 |
| A10 | Recuo lateral de 14px no desktop: o conteúdo encosta na janela até 1500px. Os componentes seguem o ritmo 10/20/30 do tema, fora da grade de 4px. | espaçamento | médio | D19 |
| A11 | Raio sem hierarquia. Os 5,88 e 11,48px são resíduo do root de 14px. O cartão de pessoa está em `sm` e os outros em `md`; o vídeo tem raio 0 e o play usa 14px literal. | espaçamento | médio | D11 |
| A12 | Oito anatomias de cartão: recuos de 24, 20/8/24 e 21px; borda em só um deles; o nome em 500 contra 600 nos outros. | espaçamento | médio | D12, D13 |
| A13 | Escala de ícone declarada em 16/24/36px e renderizada em 10/12/16/46px. | espaçamento | polimento | D14 |
| A14 | O `LinkAcao` `inverso` não responde ao hover, e a seta nunca desliza em nenhuma das duas cores. O estilo escopado não alcança o `<Icone>` (armadilha 1). | interação | alto | D08 |
| A15 | 508 controles com menos de 44px no celular: ícones sociais e LinkedIn de 32px, seletor de idioma de 36px, botões `md` de 36px, `LinkAcao` de 23px. | interação | médio | D07, D08, D20 |
| A16 | O `rounded-full` dos botões de cookies não vale nada: a regra sem camada do `.botao` vence a utilitária. | interação | polimento | D07 |
| A17 | **O cabeçalho quebra entre 992 e 1199px.** Em português e inglês o seletor de idioma cai para baixo do logotipo; em espanhol o menu inteiro desce para uma segunda linha. 1024px é o iPad na horizontal. Nenhum portão vê: não há sobreposição nem transbordo, só quebra de linha. | responsivo | alto | D09 |
| A18 | O menu não marca a página atual. | interação | médio | D25 |
| A19 | Cascata do hero. O título fica fora dela (armadilha 1) e aparece primeiro; o sobretítulo, que fica acima dele, surge depois; o botão principal só fica completo perto dos 2,3s. | movimento | médio | D16 |
| A20 | A mesma ação em dois estilos: "Fale conosco" como link e como botão na mesma tela de /apoie; o CTA da faixa em `md` numa página e `lg` na outra. | interação | médio | D10 |
| A21 | O mesmo ícone de 46px, um título e uma frase, oito vezes, em /associe-se. | AI slop | médio | D15 |
| A22 | /apoie e /associe-se usam o mesmo h2, palavra por palavra: "Buscamos ajudar a transformar o setor de turismo no Brasil…". | conteúdo | médio | adiado |
| A23 | Títulos que terminam em dois-pontos ("Conheça nossos associados:", "Mantenedores:"), e "Resort" com maiúscula no meio da frase do hero. | conteúdo | polimento | adiado |
| A24 | A paleta passa de 12 cores não cinza. | cor | médio | adiado |

Dois achados são do **sistema**, e não de uma tela. Por isso ficam fora das notas:

- **S1.** O catálogo `/design` não mostra `papel`, pesos, caixa alta nem a variante
  `clara-solida`. Correção: D23.
- **S2.** Nenhum portão mede peso, caixa alta ou espaçamento de letra. Foi assim
  que A1, A2 e A6 atravessaram onze etapas sem acusação. Correção: D21 e D22.

### Um artefato de captura que vale registrar

A primeira rodada de capturas mostrou o hero da home **sem o sobretítulo e sem o
botão** no celular. Não era defeito do site. Medido, 1,2s depois do `networkidle`
o `document.timeline.currentTime` ainda era 0: o Chromium headless só produz
quadro quando alguém pede, e sem quadro a animação de entrada nem começa. O
`fill-mode: both` segura o quadro inicial, que tem opacidade 0.

O portão de contraste já se protegia disso, porque rola a página com
`requestAnimationFrame` antes de coletar. O `medir-sistema.mjs` nasceu sem essa
proteção e passou a ter, porque a primeira versão dele contava o hero sem as duas
peças. **Captura de página com animação de entrada pede quadro forçado antes.**
