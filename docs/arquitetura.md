# Arquitetura

Site institucional estático da Associação Brasileira de Resorts, em três
idiomas, gerado com Astro e hospedado na Vercel. Não há backend, formulário,
autenticação ou banco de dados.

---

## Estrutura

```
astro.config.mjs          i18n, formato de build, domínio canônico e sitemap
vercel.json               cleanUrls, redirect, cache e cabeçalhos de segurança
tsconfig.json             astro/tsconfigs/strict — `astro check` roda no build

src/
  i18n/ui.ts              rotas, títulos, descrições e strings dos 3 idiomas
  data/                   os dados que eram markup
    associados.ts         78 resorts por região e estado
    carrossel-home.ts     os 71 logos do carrossel da home
    parceiros.ts          mantenedores, parceiros e descontos
    diretoria.ts          diretoria e conselho consultivo
    contato.ts            endereço, e-mails e telefones
    cookies.ts            os cookies que o site grava, levantados por medição
  content/                publicações e estudos (Content Collections, YAML)
  layouts/
    Cabeca.astro          o <head>: meta, hreflang, og, JSON-LD, fonte e
                          consentimento. Sem <style>, e isso é requisito
    LayoutSistema.astro   o layout único; é quem importa global.css
  components/
    AssociadosTabs.astro  as abas por região da página de associados
    ConviteAssociese.astro  o convite de associação, em quatro páginas
    DestaquesHome.astro   os seis cartões de destaque da home
    FaixaAssociados.astro   o título e o carrossel de logos da home
    FaixaParceiros.astro  mantenedores, parceiros e descontos
    PaginaEbook.astro     o corpo da landing page, um só para os três idiomas
    SecaoCookies.astro    a seção de cookies da política de privacidade
    primitivos/           Titulo, Texto, Botao, Icone, Imagem
    layout/               Secao, Container, Grade
    padroes/              CartaoMembro, ChamadaAcao, CaixaIcone, Hero, Abas…
    cromo/                Cabecalho, Rodape, FaixaCookies, IconesSociais,
                          VoltarAoTopo — o que embrulha toda página
  styles/                 tokens.css, base.css e global.css
  icones/glifos.ts        os 16 ícones em SVG — GERADO, não edite
  imagens.ts              resolve /images/… para o módulo otimizado
  assets/imagens/         o acervo
  pages/                  40 páginas + o catálogo /design
  scripts/site.js         os comportamentos de interface

public/                   servido como está, na raiz do site
  images/                 favicon.png e og-image.png, e nada mais
  robots.txt              aponta para o sitemap

vendor/
  webfonts/               as fontes de origem dos 16 contornos; não publicadas

scripts/
  glifos.json             a procedência de cada um dos 16 contornos
  glifos-para-svg.py      gera src/icones/glifos.ts a partir de vendor/
  imagens.mjs             purga o que o Vite emitiu sem uso; aborta se algum
                          /images/ escapar do pipeline
  verifica-sistema.mjs    as invariantes do design system, no build
  medir-*.mjs             os seis medidores, no navegador

tests/
  verify-behaviors.mjs    os comportamentos num navegador real
  verify-geometria.mjs    41 páginas × 3 viewports, procurando layout colapsado
  verify-icones.mjs       cada ícone SVG contra a webfont de origem
  verify-orcamento.mjs    peso por página, como catraca
  visual-diff.mjs         40 páginas × 3 viewports contra o site original
```

---

## Dados em vez de markup

`src/data/` existe porque os mesmos dados estavam escritos à mão em três
arquivos por página. Os 78 resorts associados ocupavam ~600 linhas em cada uma
das três versões de `/associados`; a diretoria, ~350 em cada uma das três de
`/diretoria`; a faixa de mantenedores e parceiros se repetia em **12** páginas.

Nada disso variava por idioma — e onde variava, era por engano. A extração
levou `src/pages/` de 12.629 para 8.855 linhas e tornou impossível a classe de
divergência que já havia acontecido:

| divergência encontrada | onde |
|---|---|
| um logo a menos no carrossel | só na home em espanhol |
| dois logos de parceiro a mais | só em `/en-us/join-us` |
| dois logos com `alt` em caixa baixa | só em EN e ES |

O que **traduz** continua em [`src/i18n/ui.ts`](../src/i18n/ui.ts): rótulo de
aba, título de seção, `title` e `description` de cada página. O que **não
traduz** — nome de resort, URL, foto, cargo — está em `src/data/`.

A divergência de `/en-us/join-us` chegou a ser preservada num
`parceirosJoinUsEn` separado, enquanto não se sabia se os dois logos a mais eram
erro ou intenção. **Eram erro**: os dois já apareciam na faixa de *mantenedores*
da mesma página. A página inglesa passou a usar a mesma constante `parceiros` das
outras duas, e a constante separada deixou de existir — ver
[decisoes.md](decisoes.md), "A lista de parceiros correta é a portuguesa".

---

## A fonte única de verdade

[`src/i18n/ui.ts`](../src/i18n/ui.ts) é a peça central da arquitetura. Ele
concentra:

- **`routes`** — o slug de cada uma das 13 páginas nos 3 idiomas. Os slugs são
  traduzidos (`/historia`, `/en-us/history`, `/es-es/historia`), então não podem
  ser derivados automaticamente.
- **`meta`** — `title` e `description` de cada página nos 3 idiomas. Antes eram
  props escritas em cada arquivo, e as 40 páginas acabaram compartilhando **três**
  descriptions genéricas, uma por idioma. Lado a lado aqui, a repetição fica
  visível. O `Cabeca.astro` lê daqui quando a página passa `route`; a prop
  continua existindo para a 404, que não tem rota.
- **`ui`** — as strings de topbar, navegação, rodapé, aviso de cookies, rótulos
  de região e os nomes acessíveis (menu, seletor de idioma, voltar ao topo).
- **`social`** — as URLs das redes sociais, antes repetidas em cada página.
- **`htmlLang` / `ogLocale`** — os códigos de idioma em duas convenções
  diferentes: `hreflang` quer `pt-br`, o Open Graph quer `pt_BR`. Derivar um do
  outro com `replace('-','_')` produzia `pt_br`, que o Facebook descarta em
  silêncio.

Esse arquivo alimenta ao mesmo tempo a navegação, o rodapé, o seletor de idioma
e as tags `hreflang`. É o que resolve o problema que motivou a refatoração: o
`<nav>` era copiado byte a byte nas 40 páginas e o rodapé já havia divergido,
com o ano do copyright fixo em `2022` nas 12 páginas internas em português.

Para adicionar uma página nova, comece por aqui: acrescente a chave em `routes`
com os três slugs e os rótulos em `ui`. Só depois crie os arquivos `.astro`.

---

## As props do layout, e por que são só duas

O site original não era uniforme, e o layout do tema reproduzia cada diferença
por prop — eram quatro. O
[`LayoutSistema`](../src/layouts/LayoutSistema.astro) reproduz **menos**, e o
critério é o que separa acidente de decisão:

| prop | páginas | o que reproduz |
|---|---|---|
| `rodapeMinimo` | 404 | rodapé só com a faixa de copyright |
| `variacaoEbook` | 3 | cabeçalho sem topbar e escuro, rodapé invertido |

As duas que sumiram eram acidente. O `bodyClass` existia em 33 páginas e faltava
em 7, mudando o layout de quem não o tinha — uma inconsistência do conteúdo
original, resolvida por **remoção** em vez de padronização. O `mainClass` levava
`hero-fullscreen`, que fazia o `ajustes.css` puxar o hero para trás do cabeçalho
transparente; no sistema o cabeçalho está no fluxo, e o deslocamento negativo
deixou de existir.

O `variacaoEbook` é uma prop só para três traços — sem topbar, cabeçalho escuro,
rodapé invertido — porque no site eles nunca apareceram separados. Três booleanos
permitiriam oito combinações, das quais uma existe.

Antes de acrescentar uma prop nova, vale confirmar no original
(`git show 74fc1fd:pagina.html`) que a diferença é mesmo do conteúdo, e registrar
o porquê em [decisoes.md](decisoes.md) — sem isso, elas parecem arbitrariedade.

---

## Preservação de URLs

O site tem histórico de indexação, então as URLs são requisito.

`build.format: 'file'` gera `historia.html` em vez de `historia/index.html`.
Combinado com o `cleanUrls: true` do [`vercel.json`](../vercel.json), a URL
pública continua sendo `/historia`, exatamente como antes.

O i18n usa `prefixDefaultLocale: false` e `redirectToDefaultLocale: false` para
não introduzir nenhum redirect implícito — o português segue na raiz.

No desenvolvimento, o `astro preview` aceita as duas formas — `/historia` e
`/historia.html` respondem 200. Em produção, o `cleanUrls` da Vercel mantém
`/historia` como a URL canônica.

---

## CSS

Uma folha, [`src/styles/global.css`](../src/styles/global.css), importada pelo
`LayoutSistema` e portanto presente nas 41 páginas. Ela importa três coisas nesta
ordem, e a ordem é o ponto:

1. `tailwindcss` — o Preflight (o reset) e as camadas theme/base/utilities
2. `tokens.css` — o `@theme`, que alimenta as utilitárias
3. `base.css` — a base tipográfica que o Preflight zera, **restaurada a partir de
   valores medidos no navegador**

Não há `@apply`, não há cor literal fora do `tokens.css`, e CSS de verdade vai em
`<style>` com escopo dentro do componente que precisa dele. As três regras são
verificadas por [`verifica-sistema.mjs`](../scripts/verifica-sistema.mjs), que
**aborta o build** — o que separa um design system de um conjunto de componentes
é o build falhar quando alguém sai dele.

A varredura do Tailwind é declarada por diretório: `components`, `layouts`,
`pages`, `styles`. `src/data/`, `src/i18n/` e `src/content/` guardam dado e prosa,
e `src/scripts/` só aplica nomes de estado escritos à mão.

Até a Etapa 11 o site carregava três folhas do tema Inspiro de `public/css/`,
purgadas depois do build contra o HTML gerado. Nenhuma delas existe mais, nem o
script que as purgava. A história — inclusive as três armadilhas que aquele CSS
escondia — está em [decisoes.md](decisoes.md), e o padrão que ela ensina, no
[CLAUDE.md](../CLAUDE.md).

---

## JavaScript

[`src/scripts/site.js`](../src/scripts/site.js) tem seis comportamentos e ~4 KB
minificados, no lugar dos 504 KB de jQuery e do engine do tema.

Menu mobile, seletor de idioma, submenus, faixa de cookies, voltar ao topo e a
fachada dos vídeos. Eram dez: hero, carrossel, masonry, contadores e abas saíram
conforme o design system substituiu cada um por CSS — container query, animação
declarada, valor renderizado no servidor. **Não há mais nenhum `setInterval` nem
nenhum listener persistente de `resize`.**

A faixa de cookies aqui é **só a interface**. Quem grava o cookie, fala Consent
Mode e decide carregar (ou não) o GTM é o bloco inline do `<head>` do
`Cabeca.astro`, que expõe `window.rbConsent` — aquilo precisa rodar antes de
qualquer rede, e este arquivo só roda no `DOMContentLoaded`.

O módulo usa **nomes de estado herdados do tema** (`.toggle-active`,
`.mainMenu-open`, `.menu-animate`, `.dropdown-active`, `.modal-active`,
`#mainMenu`, `#scrollTop`). Foi isso que deixou um script só servir as duas
camadas durante a migração inteira; hoje quem os declara é o `<style>` do cromo.
Ao mexer nele, preserve os nomes.

O Astro processa esse script pelo Vite, então ele é minificado e recebe hash no
build.

---

## Internacionalização

13 páginas de conteúdo em 3 idiomas, mais a 404 (só em português) — 40 no total.

- **pt-br** na raiz: `/historia`
- **en-us** em `/en-us/`: `/en-us/history`
- **es-es** em `/es-es/`: `/es-es/historia`

O `Cabeca.astro` recebe `lang` e `route` e monta sozinho o `canonical`, as três
tags `hreflang` mais `x-default`, e as tags `og:`/`twitter:`. Uma página sem
tradução (a 404) omite `route` e não gera `hreflang`.

---

## Deploy

Vercel, a partir da branch. `npm run build` gera `dist/`. O
[`vercel.json`](../vercel.json) traz `cleanUrls`, `trailingSlash: false` e o
redirect 301 de `/arena-conexoes` para `/`.
