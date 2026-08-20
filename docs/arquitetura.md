# Arquitetura

Site institucional estático da Associação Brasileira de Resorts, em três
idiomas, gerado com Astro e hospedado na Vercel. Não há backend, formulário,
autenticação ou banco de dados.

---

## Estrutura

```
astro.config.mjs          i18n, formato de build e domínio canônico
vercel.json               cleanUrls e o redirect de /arena-conexoes

src/
  i18n/ui.ts              fonte única de rotas e strings dos 3 idiomas
  layouts/BaseLayout.astro  <head>, header, <main>, rodapé, cookies, scripts
  components/
    Header.astro          topbar, logo, seletor de idioma, navegação
    Footer.astro          widgets do rodapé e copyright
  pages/                  40 páginas — PT na raiz, en-us/ e es-es/
  scripts/site.js         os comportamentos de interface

public/                   servido como está, na raiz do site
  css/                    plugins.css, style.css e ajustes.css
  images/                 198 arquivos
  webfonts/               fontes de ícone (subsetadas)

scripts/
  purge-css.mjs           purga e minifica o CSS depois do build
  subset-fonts.py         reduz as fontes aos glifos em uso

tests/
  verify-behaviors.mjs    os comportamentos num navegador real
  visual-diff.mjs         40 páginas × 3 viewports contra o site original
```

---

## A fonte única de verdade

[`src/i18n/ui.ts`](../src/i18n/ui.ts) é a peça central da arquitetura. Ele
concentra:

- **`routes`** — o slug de cada uma das 13 páginas nos 3 idiomas. Os slugs são
  traduzidos (`/historia`, `/en-us/history`, `/es-es/historia`), então não podem
  ser derivados automaticamente.
- **`ui`** — as strings de topbar, navegação, rodapé e aviso de cookies por
  idioma.
- **`social`** — as URLs das redes sociais, antes repetidas em cada página.

Esse arquivo alimenta ao mesmo tempo a navegação, o rodapé, o seletor de idioma
e as tags `hreflang`. É o que resolve o problema que motivou a refatoração: o
`<nav>` era copiado byte a byte nas 40 páginas e o rodapé já havia divergido,
com o ano do copyright fixo em `2022` nas 12 páginas internas em português.

Para adicionar uma página nova, comece por aqui: acrescente a chave em `routes`
com os três slugs e os rótulos em `ui`. Só depois crie os arquivos `.astro`.

---

## As props do layout, e por que existem

Um layout único cobre as 40 páginas, mas o site original não era uniforme. Em vez
de "corrigir" essas diferenças — o que mudaria a aparência de páginas que estão
no ar —, o [`BaseLayout`](../src/layouts/BaseLayout.astro) as reproduz por prop:

| prop | páginas | o que reproduz |
|---|---|---|
| `rodapeMinimo` | 404 | rodapé só com a faixa de copyright |
| `bodyClass` | 7 | `<body>` sem `class="modern"` |
| `mainClass` | 4 | `hero-fullscreen`, o deslocamento sob o cabeçalho |
| `cabecalhoEbook` | 3 | cabeçalho sem topbar e com `.dark` |

Cada uma dessas apareceu como uma página reprovada no diff visual, não como uma
decisão de projeto. Antes de acrescentar uma prop nova, vale confirmar no
original (`git show 74fc1fd:pagina.html`) que a diferença é mesmo do conteúdo, e
registrar o porquê em [decisoes.md](decisoes.md) — sem isso, elas parecem
arbitrariedade.

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

Três folhas, carregadas nesta ordem pelo [`BaseLayout`](../src/layouts/BaseLayout.astro):

1. `plugins.css` — Bootstrap, FontAwesome e animate.css do tema
2. `style.css` — o tema Inspiro
3. `ajustes.css` — **o que o tema resolvia em jQuery**

A ordem importa: `ajustes.css` precisa vir depois de `style.css` para vencer na
cascata. Ele é dividido em quatro seções, cada uma reparando algo que a remoção
do jQuery deixou inerte:

| seção | repara |
|---|---|
| 1 | o deslocamento sob o cabeçalho transparente, que o `<main>` ativou por engano |
| 2 | a visibilidade e as calhas das grades `.grid-layout` (Isotope) |
| 3 | as 15 regras responsivas presas a `body.breakpoint-*` |
| 4 | o contexto de empilhamento do slide, sem o qual o Ken Burns some |

Cada seção traz o porquê em comentário, com o trecho do tema que a originou.
[decisoes.md](decisoes.md#a-armadilha-bodybreakpoint-) conta a história — é a
leitura mais importante antes de mexer em CSS aqui.

O CSS do tema fica em `public/`, servido como está, e é processado **depois** do
build por [`scripts/purge-css.mjs`](../scripts/purge-css.mjs), que roda contra o
HTML gerado em `dist/` e minifica com lightningcss. Isso está encadeado no
script `build` do `package.json`, então `npm run build` já faz tudo.

Ao adicionar uma classe que só aparece via JavaScript, inclua-a na lista
`runtimeClasses` do script de purga — o PurgeCSS não tem como enxergá-la no
HTML estático.

---

## JavaScript

[`src/scripts/site.js`](../src/scripts/site.js) tem 9 comportamentos e ~9 KB
minificados, no lugar dos 504 KB de jQuery e do engine do tema.

Menu mobile, seletor de idioma, hero (Ken Burns e legendas em cascata),
carrossel de logos, grades masonry (.grid-layout), contadores, abas, aviso de
cookies e voltar ao topo.

O módulo aplica **as mesmas classes de estado que o tema aplicava**
(`.toggle-active`, `.mainMenu-open`, `.menu-animate`, `.dropdown-active`,
`.kenburns-bg-animate`, `.modal-active`, `.active`), de modo que o CSS do tema
continua valendo sem alteração. Ao mexer nele, preserve os nomes de classe.

O Astro processa esse script pelo Vite, então ele é minificado e recebe hash no
build.

---

## Internacionalização

13 páginas de conteúdo em 3 idiomas, mais a 404 (só em português) — 40 no total.

- **pt-br** na raiz: `/historia`
- **en-us** em `/en-us/`: `/en-us/history`
- **es-es** em `/es-es/`: `/es-es/historia`

O `BaseLayout` recebe `lang` e `route` e monta sozinho o `canonical`, as três
tags `hreflang` mais `x-default`, e as tags `og:`/`twitter:`. Uma página sem
tradução (a 404) omite `route` e não gera `hreflang`.

---

## Deploy

Vercel, a partir da branch. `npm run build` gera `dist/`. O
[`vercel.json`](../vercel.json) traz `cleanUrls`, `trailingSlash: false` e o
redirect 301 de `/arena-conexoes` para `/`.
