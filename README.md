# Resorts Brasil

Site institucional da Associação Brasileira de Resorts, em português, inglês e
espanhol. Estático, sem backend: 40 páginas geradas com [Astro](https://astro.build)
e hospedadas na Vercel.

## Requisitos

- Node.js 20 ou superior (desenvolvido com a 24)
- Python 3 com `fonttools` e `brotli`, só para regerar o subset de fontes

## Como rodar

```bash
npm install
npm run dev          # http://localhost:4321
```

O `npm install` pode avisar que os install scripts de `sharp` e `esbuild` estão
bloqueados — o npm 11 faz isso por padrão. Ambos são dependências do próprio
Astro e já estão aprovados no campo `allowScripts` do `package.json`; se o aviso
aparecer, rode `npm approve-scripts sharp esbuild`.

## Comandos

| comando | o que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com recarga |
| `npm run build` | checa os tipos, gera `dist/`, purga o CSS e confere os glifos |
| `npm run check` | só a checagem de tipos (`astro check`) |
| `npm run preview` | serve o `dist/` gerado |
| `npm run verify` | comportamento, geometria, ícones e orçamento (precisa de um preview no ar) |

Scripts auxiliares:

```bash
node scripts/purge-css.mjs        # purga e minifica (já embutido no build)
node scripts/check-glifos.mjs     # confere o subset de fontes (idem)
node scripts/verifica-sistema.mjs # invariantes do design system (idem)
#   DETALHE=1 ... lista o que ainda está pendente, arquivo a arquivo
python scripts/subset-fonts.py    # regera public/webfonts/ a partir de vendor/
python scripts/glifos-para-svg.py # regera src/icones/glifos.ts a partir das fontes
node scripts/medir-base.mjs       # mede a base tipográfica do tema no navegador
node scripts/medir-primitivos.mjs # mede botão, seção, container, grade e ícone
node scripts/medir-padroes.mjs    # mede as 9 composições do tema (cartão, hero, abas…)
node scripts/medir-imagens.mjs    # tamanho x fidelidade por formato e qualidade
node scripts/imagens.mjs          # ponte e purga de imagens (já embutido no build)
node tests/verify-geometria.mjs   # varredura de layout: 41 páginas × 3 viewports
node tests/verify-icones.mjs      # compara cada ícone SVG com a webfont de origem
node tests/verify-orcamento.mjs   # peso por página; ATUALIZAR=1 regrava a linha de base
node tests/visual-diff.mjs        # compara o build com o site original
#   PAGES=/index.html VIEWPORTS=desktop ... limita a rodada dos dois acima
```

> No Git Bash, `PAGES=/index.html` vira `C:/Program Files/Git/index.html` —
> a conversão automática de caminho do MSYS. Use
> `MSYS_NO_PATHCONV=1 PAGES=/index.html node …`, ou rode pelo PowerShell.

`npm run verify` roda os quatro; `verify:comportamento`, `verify:geometria`,
`verify:icones` e `verify:orcamento` rodam um de cada vez.

### Design system

A migração para o design system próprio (Tailwind v4 + tokens) está em curso, e
as duas camadas convivem: cada página carrega **uma** delas, nunca as duas.

Página do tema não muda de nada. Página migrada importa a folha no próprio
frontmatter e desliga o tema:

```astro
---
import '../styles/global.css';
---
<BaseLayout legado={false} ...>
```

A folha **não** pode ser importada pelo layout — o Preflight do Tailwind vaza
para as páginas do tema e alterou 22 das 40 na primeira tentativa. O motivo e a
medição estão em [docs/decisoes.md](docs/decisoes.md), "A folha nova não pode
entrar pelo layout".

Ao migrar um componente ou página, acrescente o `@source` correspondente em
[`src/styles/global.css`](src/styles/global.css) — sem ele as utilitárias não são
geradas e o estilo some, sem erro de build.

O sistema tem três camadas de componente:

- `src/components/primitivos/` — `Titulo`, `Texto`, `Botao`, `Icone`, `Imagem`
- `src/components/layout/` — `Secao`, `Container`, `Grade`
- `src/components/padroes/` — `CartaoMembro`, `ChamadaAcao`, `CaixaIcone`,
  `CartaoPublicacao`, `LinkAcao`, `ListaIcones`, `Hero`, `FaixaDestaque`,
  `Contador`, `Abas`

Componente novo nesses três diretórios **precisa** entrar no catálogo `/design`
no mesmo commit: `scripts/verifica-sistema.mjs` reprova o build se ele não for
importado por lá.

Valor de componente é medido, nunca lido: `medir-primitivos.mjs` imprime botão,
seção, container, grade e ícone; `medir-padroes.mjs` imprime as nove composições
do tema. Os dois rodam nos três viewports, com o hover.

O catálogo vivo fica em `/design`.

### URLs no preview local

Com `build.format: 'file'`, o `astro preview` serve tanto `/historia` quanto
`/historia.html` — as duas formas respondem 200, nos três idiomas. Em produção,
o `cleanUrls` da Vercel deixa `/historia` como a URL canônica.

## Estrutura

```
src/i18n/ui.ts            rotas, títulos e strings dos 3 idiomas — comece aqui
src/data/                 associados, parceiros, diretoria, contato
src/layouts/              o layout único de todas as páginas
src/components/           header, rodapé e as grades de dados
src/components/primitivos/  Titulo, Texto, Botao, Icone, Imagem
src/components/layout/    Secao, Container, Grade
src/components/padroes/   CartaoMembro, ChamadaAcao, Hero, Abas, …
src/styles/               tokens, base e a folha do design system
src/icones/glifos.ts      os 16 ícones em SVG — GERADO, não edite
src/imagens.ts            resolve /images/… para o módulo otimizado
src/assets/imagens/       o acervo (public/images/ só tem favicon e og-image)
src/pages/                as 40 páginas + o catálogo /design
src/scripts/site.js       comportamentos de interface
public/                   css, imagens, fontes e robots.txt
scripts/                  purga, subset de fontes, medição e invariantes
tests/                    comportamento, geometria, ícones e diff visual
docs/                     documentação técnica
```

## Tarefas comuns

**Mudar um texto do menu ou do rodapé** — edite [`src/i18n/ui.ts`](src/i18n/ui.ts),
nunca os componentes. As strings dos três idiomas ficam todas lá.

**Mudar o título ou a descrição de uma página** — também em
[`src/i18n/ui.ts`](src/i18n/ui.ts), no mapa `meta`. As páginas não passam mais
`title`/`description`: o layout lê de lá pela chave da rota.

**Acrescentar ou tirar um resort, parceiro ou membro da diretoria** — edite o
arquivo correspondente em [`src/data/`](src/data/). Os três idiomas mudam juntos,
que é o ponto: quando isso era markup, as versões divergiram.

**Adicionar uma página** — acrescente a chave em `routes`, o `title`/`description`
em `meta` e os rótulos em `ui` no [`src/i18n/ui.ts`](src/i18n/ui.ts), depois crie
os três arquivos `.astro` em `src/pages/`. O `hreflang`, o `canonical` e a
entrada no `sitemap.xml` saem automaticamente.

**Mexer em CSS** — leia antes o trecho sobre `body.breakpoint-*` em
[docs/decisoes.md](docs/decisoes.md), e rode o diff visual depois. Há uma
armadilha específica deste tema que não é óbvia.

**Adicionar uma classe aplicada via JavaScript** — inclua o nome na lista
`runtimeClasses` de [`scripts/purge-css.mjs`](scripts/purge-css.mjs), senão a
purga remove o estilo dela.

**Acrescentar um ícone** — o glifo precisa entrar em
[`scripts/glifos.json`](scripts/glifos.json) e o subset precisa ser regerado,
senão ele renderiza como tofu. O build avisa: `check-glifos.mjs` aborta se o CSS
pedir um codepoint que não esteja no subset.

**Mexer em cookies, GTM ou qualquer script de terceiro** — o consentimento fica
no bloco inline do `<head>` de [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro),
que expõe `window.rbConsent`. Nada de terceiro pode ser carregado fora dele. Se a
lista de cookies mudar, atualize [`src/data/cookies.ts`](src/data/cookies.ts) —
a tabela da política sai de lá, nos três idiomas — e suba a versão do cookie
`rb_consent` para que a faixa volte a perguntar.

## Estado da refatoração

Feito e verificado:

- 40 páginas em um layout único, URLs preservadas, `hreflang` nos 3 idiomas
- jQuery e o engine do tema trocados por ~9 KB de JS nativo
- CSS de 805 KB para 64 KB (purga contra o HTML gerado + lightningcss)
- **120/120 comparações visuais idênticas** ao site original — 40 páginas × 3
  viewports, sem divergência aceita (20/08/2026)

Refino de agosto/2026, também com 120/120:

- 40 `title` e 40 `description` únicos, em `meta` no `src/i18n/ui.ts` — antes as
  40 páginas dividiam três frases genéricas, uma por idioma
- `sitemap.xml` com `hreflang` de slug traduzido, `robots.txt` e JSON-LD
- foco visível, skip link, submenu pelo teclado, nomes acessíveis nos ícones
- `astro check` no build, cabeçalhos de cache e segurança no `vercel.json`
- guarda na purga de CSS contra a falha silenciosa descrita em `decisoes.md`
- `src/data/`: `src/pages/` caiu de 12.629 para 8.858 linhas, e as divergências
  entre idiomas que a duplicação escondia foram corrigidas
- seletor de idioma leva à tradução **da página atual**, não mais à home

Correções de conteúdo confirmadas pelo cliente (20/08/2026), estas com
divergência de layout registrada — o valor de referência do diff passou a ser
**117/120**, ver [docs/verificacao.md](docs/verificacao.md):

- Wyndham Gramado saiu do carrossel da home: não é mais associado
- `/en-us/join-us` passou a listar os mesmos 8 parceiros de PT e ES, em vez de 10
- os cargos da diretoria passaram a ser traduzidos nos três idiomas (a empresa
  dos conselheiros **não** traduz — é nome próprio)
- dois LinkedIn trocados na diretoria, corrigidos

Terceira passagem, agosto/2026:

- **Subset das fontes de ícone aplicado: 247 KB → 2,9 KB.** A lista de glifos do
  script estava incompleta e teria apagado as setas e bolinhas de 6 páginas —
  dois glifos entram por pseudo-elemento e não têm classe no HTML. Hoje
  `scripts/check-glifos.mjs` aborta o build se o CSS pedir um glifo fora do
  subset, e a suíte confere no navegador que os 16 renderizam.
- **Google Fonts fora do caminho crítico** — o `@import` da linha 1 do CSS de
  produção virou `<link>` com `preconnect` e `display=swap`; a Nunito saiu (5
  pesos baixados sem uso) e a lista de pesos passou a ser a medida.
- **Consentimento de verdade** — nada de Google é contatado antes da escolha,
  com Consent Mode v2, três categorias, painel de preferências e revogação pelo
  rodapé. Os vídeos do YouTube viraram fachada de clique-para-carregar.
- **A tabela de cookies da política passou a descrever este site** — a anterior
  listava uma plataforma de consentimento nunca instalada, cookies de WordPress
  e de Poptin, com validades vencidas em 2021-2023.

As três camadas passaram. O diff visual fechou **117/120 depois das fontes** —
o valor de referência anterior, sem um pixel movido — e **93/120 no fim**, com as
24 divergências novas todas explicadas em
[docs/verificacao.md](docs/verificacao.md): o retângulo dos vídeos e a tabela de
cookies, ambas mudanças pedidas. A suíte comportamental foi de 19 para 32
verificações, todas passando.

Peso final por pageview: **66,6 KB de CSS, 8,9 KB de JS e 2,9 KB de fonte de
ícone** — contra 805 KB de CSS, 504 KB de JS e 247 KB de fonte no site original.

Pendente:

- **Otimização das imagens** — 198 arquivos, 7.7 MB, sem WebP. A home entrega
  **4,3 MB de imagem** contra 64 KB de CSS. Medido: WebP q90 sem redimensionar
  economiza 15%; q82 com teto de 1920px, 45%; AVIF q60, 54%. Recompressão muda
  pixel por construção, então esta fase precisa de política de tolerância
  própria — é a única que não fecha 120/120.
- **Páginas do ebook em português nas três versões** — 1.089 linhas cada, é
  trabalho de tradutor. Ver o fim de [docs/decisoes.md](docs/decisoes.md).
- **O contador diz 83 resorts associados; a lista tem 78.**
- **Conferência do cliente sobre cookies** — duas coisas que não se resolvem no
  código: a tabela da política precisa do inventário de tags do console do
  `GTM-PK7DG6MD`, e o texto é jurídico; e falta configurar no GTM as
  *verificações de consentimento adicionais* por tag, sem as quais quem aceita
  só "Desempenho" ainda dispararia tags de publicidade.
- **Google Fonts continua no Google** — decisão registrada. O IP do visitante vai
  para o Google em toda visita, antes de qualquer consentimento; auto-hospedar
  resolveria.

A otimização de imagens mexe em renderização, então pede um diff visual
próprio.

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — como o projeto se organiza
- [docs/decisoes.md](docs/decisoes.md) — por que cada escolha foi feita, e as
  armadilhas do tema
- [docs/verificacao.md](docs/verificacao.md) — as três camadas de verificação e
  o que cada uma não cobre

## Deploy

Vercel. O [`vercel.json`](vercel.json) define `cleanUrls`, `trailingSlash: false`,
o redirect 301 de `/arena-conexoes` para `/`, os cabeçalhos de cache
(`/images`, `/webfonts` e `/_astro`) e os de segurança.

O cache de `/images` é de uma semana, não de um ano: os nomes dos arquivos não
têm hash, então um `immutable` longo prenderia uma imagem trocada no cache dos
visitantes. `/_astro` e `/webfonts` podem ser `immutable` porque só mudam de
nome quando mudam de conteúdo.

Antes de promover para produção, rode as três camadas de verificação descritas
em [docs/verificacao.md](docs/verificacao.md) — em especial o diff visual, que é
a única que pega regressão de layout.
