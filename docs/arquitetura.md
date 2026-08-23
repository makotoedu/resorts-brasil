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
  layouts/
    Cabeca.astro          o <head> das duas camadas: meta, hreflang, og, JSON-LD,
                          fonte e consentimento. Sem <style>, e isso é requisito
    BaseLayout.astro      o layout do TEMA — <body>, header, <main>, rodapé
    LayoutSistema.astro   o layout do DESIGN SYSTEM; é quem importa global.css
  components/
    Header.astro          (tema) topbar, logo, seletor de idioma, navegação
    Footer.astro          (tema) widgets do rodapé, copyright e revogar cookies
    SocialIcons.astro     (tema) os 4 links de rede social, com nome acessível
    AssociadosTabs.astro  as abas por região da página de associados
    CarrosselAssociados.astro  o carrossel de logos da home
    GradeLogos.astro      uma faixa de logos (mantenedores/parceiros/descontos)
    SecaoCookies.astro    a seção de cookies da política de privacidade
    YouTube.astro         vídeo com fachada de clique-para-carregar
    primitivos/           Titulo, Texto, Botao, Icone, Imagem
    layout/               Secao, Container, Grade
    padroes/              CartaoMembro, ChamadaAcao, CaixaIcone, Hero, Abas…
    cromo/                Cabecalho, Rodape, FaixaCookies, IconesSociais,
                          VoltarAoTopo — o que embrulha toda página migrada
  pages/                  40 páginas + o catálogo /design
  scripts/site.js         os comportamentos de interface

public/                   servido como está, na raiz do site
  css/                    plugins.css, style.css e ajustes.css
  images/                 198 arquivos
  webfonts/               fontes de ícone, geradas pelo subset (2,9 KB)
  robots.txt              aponta para o sitemap

vendor/
  webfonts/               as fontes originais do tema; public/webfonts/ é gerado

scripts/
  purge-css.mjs           purga e minifica o CSS depois do build
  subset-fonts.py         gera public/webfonts/ a partir de vendor/ e glifos.json
  glifos.json             os 16 glifos em uso — fonte única do subset e da guarda
  check-glifos.mjs        aborta o build se o CSS pedir um glifo fora do subset

tests/
  verify-behaviors.mjs    os comportamentos num navegador real
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

A divergência de `/en-us/join-us` foi preservada de propósito, num
`parceirosJoinUsEn` separado, porque não dá para saber daqui se os dois logos a
mais são erro ou intenção. Está anotada no arquivo para decisão do cliente.

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

## As props do layout, e por que existem

As 30 páginas que ainda não migraram compartilham um layout, mas o site original
não era uniforme. Em vez de "corrigir" essas diferenças — o que mudaria a
aparência de páginas que estão no ar —, o
[`BaseLayout`](../src/layouts/BaseLayout.astro) as reproduz por prop.

O [`LayoutSistema`](../src/layouts/LayoutSistema.astro) reproduz **menos**: o que
era acidente do conteúdo original some na migração (o `bodyClass`, que existia em
33 páginas e faltava em 7), e o que é decisão continua (o rodapé mínimo da 404):

| prop | páginas | o que reproduz |
|---|---|---|
| `rodapeMinimo` | 404 | rodapé só com a faixa de copyright |
| `bodyClass` | 7 | `<body>` sem `class="modern"` |
| `mainClass` | 4 | `hero-fullscreen`, o deslocamento sob o cabeçalho |
| `variacaoEbook` | 3 | cabeçalho sem topbar e com `.dark`, rodapé `.inverted` |

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

Três folhas, carregadas nesta ordem pelo [`BaseLayout`](../src/layouts/BaseLayout.astro)
— e **só por ele**, ou seja, só nas páginas que ainda não migraram:

1. `plugins.css` — Bootstrap, FontAwesome e animate.css do tema
2. `style.css` — o tema Inspiro
3. `ajustes.css` — **o que o tema resolvia em jQuery**

A ordem importa: `ajustes.css` precisa vir depois de `style.css` para vencer na
cascata. As quatro primeiras seções reparam algo que a remoção do jQuery deixou
inerte; as quatro seguintes acrescentam o que o tema não previa:

| seção | repara / acrescenta |
|---|---|
| 1 | o deslocamento sob o cabeçalho transparente, que o `<main>` ativou por engano |
| 2 | a visibilidade e as calhas das grades `.grid-layout` (Isotope) |
| 3 | as 15 regras responsivas presas a `body.breakpoint-*` |
| 4 | o contexto de empilhamento do slide, sem o qual o Ken Burns some |
| 5 | foco visível por `:focus-visible`, que o tema apagava do site inteiro |
| 6 | submenus da navegação abrindo também no foco, e não só no `:hover` |
| 7 | o painel de categorias do consentimento, e o `[hidden]` da faixa |
| 8 | a fachada dos vídeos do YouTube |

Cada seção traz o porquê em comentário, com o trecho do tema que a originou.
[decisoes.md](decisoes.md#a-armadilha-bodybreakpoint-) conta a história — é a
leitura mais importante antes de mexer em CSS aqui.

O CSS do tema fica em `public/`, servido como está, e é processado **depois** do
build por [`scripts/purge-css.mjs`](../scripts/purge-css.mjs), que roda contra o
HTML gerado em `dist/` e minifica com lightningcss. Isso está encadeado no
script `build` do `package.json`, então `npm run build` já faz tudo.

Ao adicionar uma classe que só aparece via JavaScript, inclua-a na lista
`runtimeClasses` do script de purga — o PurgeCSS não tem como enxergá-la no
HTML estático. Isso vale para **seletor**, não só para classe: `iframe` está lá
porque, depois da fachada dos vídeos, não existe um único `<iframe>` no HTML
gerado — ele nasce no clique.

---

## JavaScript

[`src/scripts/site.js`](../src/scripts/site.js) tem 10 comportamentos e ~10 KB
minificados, no lugar dos 504 KB de jQuery e do engine do tema.

Menu mobile, seletor de idioma, hero (Ken Burns e legendas em cascata),
carrossel de logos, grades masonry (.grid-layout), contadores, abas, faixa de
cookies, fachada dos vídeos e voltar ao topo.

A faixa de cookies aqui é **só a interface**. Quem grava o cookie, fala Consent
Mode e decide carregar (ou não) o GTM é o bloco inline do `<head>` do
`Cabeca.astro`, que expõe `window.rbConsent` — aquilo precisa rodar antes de
qualquer rede, e este arquivo só roda no `DOMContentLoaded`.

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

O `Cabeca.astro` recebe `lang` e `route` e monta sozinho o `canonical`, as três
tags `hreflang` mais `x-default`, e as tags `og:`/`twitter:`. Uma página sem
tradução (a 404) omite `route` e não gera `hreflang`.

---

## Deploy

Vercel, a partir da branch. `npm run build` gera `dist/`. O
[`vercel.json`](../vercel.json) traz `cleanUrls`, `trailingSlash: false` e o
redirect 301 de `/arena-conexoes` para `/`.
