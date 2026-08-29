# Resorts Brasil

Site institucional da Associação Brasileira de Resorts, em português, inglês e
espanhol. Estático, sem backend: 41 páginas geradas com [Astro](https://astro.build)
e hospedadas na Vercel.

## Requisitos

- Node.js 20 ou superior (desenvolvido com a 24)
- Python 3 com `fonttools`, só para regerar os ícones em SVG

## Como rodar

```bash
npm install
npm run dev          # http://localhost:4321
```

Requer **Node ≥ 22.12**, que é o mínimo do Astro 7 e está declarado em `engines`.

O `npm install` pode avisar que os install scripts de `sharp` e `esbuild` estão
bloqueados — o npm 11 faz isso por padrão. Os dois entram pela árvore do Astro (o
`sharp` também é declarado em `devDependencies`, que é o que o `medir-imagens.mjs`
e o `verify-icones.mjs` usam) e já estão aprovados no campo `allowScripts` do
`package.json`; se o aviso aparecer, rode `npm approve-scripts sharp esbuild`.
**A entrada do `allowScripts` guarda a versão**, então uma atualização que mova o
`esbuild` ou o `sharp` faz o aviso voltar:
atualize a chave junto, senão a allowlist passa a autorizar uma versão que não
está mais na árvore.

## Comandos

| comando | o que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com recarga |
| `npm run build` | checa os tipos, gera `dist/`, confere as imagens e as invariantes |
| `npm run check` | só a checagem de tipos (`astro check`) |
| `npm run preview` | serve o `dist/` gerado |
| `npm run verify` | comportamento, geometria, ícones e orçamento (precisa de um preview no ar) |

Scripts auxiliares:

```bash
node scripts/verifica-sistema.mjs # invariantes do design system (já embutido no build)
#   DETALHE=1 ... detalha os avisos
node scripts/imagens.mjs          # guarda e purga de imagens (idem)
#   DETALHE=1 ... lista as imagens do acervo que ninguém referencia
python scripts/glifos-para-svg.py # regera src/icones/glifos.ts a partir de vendor/webfonts/
node scripts/medir-base.mjs       # mede a base tipográfica no navegador
node scripts/medir-primitivos.mjs # mede botão, seção, container, grade e ícone
node scripts/medir-padroes.mjs    # mede as composições (cartão, hero, abas…)
node scripts/medir-cromo.mjs      # mede cabeçalho, rodapé, cookies e voltar-ao-topo
node scripts/medir-documento.mjs  # mede o texto corrido e a largura da linha
node scripts/medir-ebook.mjs      # mede a paleta escura e o contraste do ebook
node scripts/medir-imagens.mjs    # tamanho x fidelidade por formato e qualidade
node tests/verify-geometria.mjs   # varredura de layout: 41 páginas × 3 viewports
node tests/verify-icones.mjs      # compara cada ícone SVG com a webfont de origem
node tests/verify-orcamento.mjs   # peso por página; ATUALIZAR=1 regrava a linha de base
node tests/visual-diff.mjs        # compara o build com o site original
#   PAGES=/index.html VIEWPORTS=desktop ... limita a rodada dos três acima
```

> No Git Bash, `PAGES=/index.html` vira `C:/Program Files/Git/index.html` —
> a conversão automática de caminho do MSYS. Use
> `MSYS_NO_PATHCONV=1 PAGES=/index.html node …`, ou rode pelo PowerShell.

`npm run verify` roda os quatro portões; `verify:comportamento`,
`verify:geometria`, `verify:icones` e `verify:orcamento` rodam um de cada vez.

## Design system

O site roda inteiro sobre um design system próprio — Tailwind v4, tokens
semânticos, componentes com contrato e invariantes que **quebram o build**. O
catálogo vivo fica em `/design`, fora do índice e fora do sitemap.

Toda página usa o `LayoutSistema`, que é quem importa a folha:

```astro
---
import LayoutSistema from '../layouts/LayoutSistema.astro';
---
<LayoutSistema lang="pt-br" route="history">
```

Quatro camadas de componente:

- `src/components/primitivos/` — `Titulo`, `Texto`, `Botao`, `Icone`, `Imagem`
- `src/components/layout/` — `Secao`, `Container`, `Grade`
- `src/components/padroes/` — `CartaoMembro`, `ChamadaAcao`, `CaixaIcone`,
  `CartaoPublicacao`, `LinkAcao`, `ListaIcones`, `Hero`, `FaixaDestaque`,
  `Contador`, `Abas`, `Prosa`, `Tabela`, `Video`, `CarrosselLogos`, …
- `src/components/cromo/` — `Cabecalho`, `Rodape`, `FaixaCookies`,
  `IconesSociais`, `VoltarAoTopo`

Componente novo nesses quatro diretórios **precisa** entrar no catálogo `/design`
no mesmo commit: `scripts/verifica-sistema.mjs` reprova o build se ele não for
importado por lá.

**A navegação é sem recarga** (`<ClientRouter />`), então o `site.js` tem ciclo
de vida: tudo é montado no `astro:page-load` sobre um `AbortController` e
desmontado no `astro:before-swap`. **Todo listener novo recebe o `signal`** — sem
ele, o que estiver preso a `window` ou a `document` ganha uma cópia por
navegação, sem sintoma funcional nenhum. Quem vigia isso é a contagem de
listeners via CDP em `tests/verify-behaviors.mjs`.

**Valor de componente é medido, nunca lido.** Os seis scripts `medir-*` imprimem
o valor computado no navegador, nos três viewports e com o hover. Ler o CSS já
deu resposta errada cinco vezes neste projeto; contar ocorrências no markup, três.

O que o build verifica e aborta: cor literal fora do `tokens.css`, `@apply`,
`style=` inline fora da allowlist, hierarquia de headings nas 41 páginas,
componente fora do catálogo, página sem a folha do sistema, e referência a
`/images/` que não exista em `public/`.

### URLs no preview local

Com `build.format: 'file'`, o `astro preview` serve tanto `/historia` quanto
`/historia.html` — as duas formas respondem 200, nos três idiomas. Em produção,
o `cleanUrls` da Vercel deixa `/historia` como a URL canônica.

## Estrutura

```
src/i18n/ui.ts            rotas, títulos e strings dos 3 idiomas — comece aqui
src/data/                 associados, parceiros, diretoria, contato, cookies
src/content/              publicações e estudos (Content Collections, YAML)
src/content.config.ts     o schema Zod das duas coleções
src/conteudo.ts           lê as coleções e resolve idioma e ordem
src/layouts/              LayoutSistema (o layout) e Cabeca (o <head>)
src/components/           os quatro diretórios do sistema, mais a montagem de conteúdo
src/styles/               tokens, base e a folha do design system
src/icones/glifos.ts      os 16 ícones em SVG — GERADO, não edite
src/imagens.ts            resolve /images/… para o módulo otimizado
src/assets/imagens/       o acervo (public/images/ só tem favicon e og-image)
src/pages/                as 40 páginas + o catálogo /design
src/scripts/site.js       comportamentos de interface
public/                   favicon, og-image e robots.txt
vendor/webfonts/          as fontes de origem dos 16 contornos — não publicadas
scripts/                  medição, imagens, ícones e invariantes
tests/                    comportamento, geometria, ícones, orçamento e diff visual
docs/                     documentação técnica
```

## Tarefas comuns

**Mudar um texto do menu ou do rodapé** — edite [`src/i18n/ui.ts`](src/i18n/ui.ts),
nunca os componentes. As strings dos três idiomas ficam todas lá.

**Mudar o título ou a descrição de uma página** — também em
[`src/i18n/ui.ts`](src/i18n/ui.ts), no mapa `meta`. As páginas não passam
`title`/`description`: o `<head>` lê de lá pela chave da rota.

**Acrescentar ou tirar um resort, parceiro ou membro da diretoria** — edite o
arquivo correspondente em [`src/data/`](src/data/). Os três idiomas mudam juntos,
que é o ponto: quando isso era markup, as versões divergiram.

**Acrescentar uma publicação ou um estudo** — acrescente um item em
[`src/content/publicacoes.yaml`](src/content/publicacoes.yaml) ou
[`src/content/estudos.yaml`](src/content/estudos.yaml). Campo faltando aborta o
build; campo que traduz exige os três idiomas. Quando isso era markup, os dois
estudos mais recentes entraram sem tradução e as páginas inglesa e espanhola
ficaram com dois cartões dizendo "Leia agora".

**Adicionar uma página** — acrescente a chave em `routes`, o `title`/`description`
em `meta` e os rótulos em `ui` no [`src/i18n/ui.ts`](src/i18n/ui.ts), depois crie
os três arquivos `.astro` em `src/pages/` com o `LayoutSistema`. O `hreflang`, o
`canonical` e a entrada no `sitemap.xml` saem automaticamente.

**Adicionar uma imagem** — ponha o arquivo em
[`src/assets/imagens/`](src/assets/imagens/) e use
`<Imagem src="/images/…" />`. Escrito à mão num `<img src>`, aquele caminho vira
404 e o build aborta.

**Acrescentar um ícone** — acrescente o codepoint em
[`scripts/glifos.json`](scripts/glifos.json), rode
`python scripts/glifos-para-svg.py` e depois `node tests/verify-icones.mjs`, que
compara o desenho novo com a fonte de origem. Não edite `src/icones/glifos.ts`.

**Mexer em cookies, GTM ou qualquer script de terceiro** — o consentimento fica
no bloco inline do `<head>` de [`src/layouts/Cabeca.astro`](src/layouts/Cabeca.astro),
que expõe `window.rbConsent`. Nada de terceiro pode ser carregado fora dele. Se a
lista de cookies mudar, atualize [`src/data/cookies.ts`](src/data/cookies.ts) —
a tabela da política sai de lá, nos três idiomas — e suba a versão do cookie
`rb_consent` para que a faixa volte a perguntar.

## De onde o projeto veio

O site rodava sobre o tema Inspiro: 21 mil linhas de `style.css`, Bootstrap, 196
cores, 110 `!important`, jQuery e uma dúzia de plugins. Duas passagens o
transformaram, e as duas estão registradas em
[docs/decisoes.md](docs/decisoes.md).

**A refatoração (2026).** jQuery e o engine do tema trocados por JS nativo, 40
páginas num layout único, CSS purgado de 805 KB para 64 KB, `title` e
`description` únicos, `sitemap` com `hreflang` de slug traduzido, foco visível e
navegação por teclado, subset das fontes de ícone, consentimento de verdade com
Consent Mode v2 e fachada de clique-para-carregar nos vídeos.

**A reconstrução da camada de apresentação (11 etapas).** O tema saiu inteiro,
substituído pelo design system. O
[plano](docs/plano-design-system.md) tem etapa por etapa; o resultado medido:

| | antes | depois |
|---|---|---|
| páginas migradas | 0 de 41 | **41 de 41** |
| `style=` inline | 549 | **0** (2 na allowlist, justificadas) |
| cor literal fora dos tokens | 413 | **0** |
| headings irregulares | 39 de 40 páginas | **0** |
| transbordo horizontal | 72 ocorrências | **0** |
| home no mobile | 4.405 KB | **451 KB** |
| conjunto medido | 68 MB | **19 MB** |
| webfont de ícone | 247 KB | **0** — 16 SVG inline |

Cinco defeitos que estavam **em produção** apareceram no caminho, nenhum deles
procurado: o carrossel de logos das três homes invisível havia meses, o texto do
rodapé do ebook a 1,23:1 de contraste, um capítulo inteiro em espanhol na
política de privacidade inglesa, três números diferentes para a mesma contagem de
associados, e dois `alt` em português nas versões traduzidas.

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — como o projeto se organiza
- [docs/decisoes.md](docs/decisoes.md) — por que cada escolha foi feita
- [docs/verificacao.md](docs/verificacao.md) — os portões e o que cada um não cobre
- [docs/plano-design-system.md](docs/plano-design-system.md) — as 11 etapas
- [docs/deltas-visuais.md](docs/deltas-visuais.md) — o que mudou de pixel, e por quê

## Deploy

Vercel. O [`vercel.json`](vercel.json) define `cleanUrls`, `trailingSlash: false`,
o redirect 301 de `/arena-conexoes` para `/`, os cabeçalhos de cache (`/images` e
`/_astro`) e os de segurança.

O cache de `/images` é de uma semana, não de um ano: ali ficam `favicon.png` e
`og-image.png`, cujos nomes não têm hash — um `immutable` longo prenderia uma
imagem trocada no cache dos visitantes. `/_astro` pode ser `immutable` porque só
muda de nome quando muda de conteúdo, e é por onde passa o acervo inteiro.

Antes de promover para produção, rode `npm run build` e `npm run verify`.
