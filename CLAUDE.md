# Orientação para o Claude Code

Site institucional estático da Associação Brasileira de Resorts: 40 páginas em
3 idiomas, Astro, hospedado na Vercel. Sem backend, formulário ou banco.

Leia o [README.md](README.md) para comandos e estrutura, e
[docs/](docs/) para arquitetura, decisões e verificação.

## Antes de mexer em CSS

Este projeto tem uma armadilha que não é óbvia e já causou uma regressão.

O tema Inspiro **resolvia parte da responsividade em JavaScript**, não em media
queries: o plugin `breakpoints` do jQuery aplicava classes `breakpoint-xs`/`sm`/
`md`/`lg`/`xl` no `<body>`, e 15 regras do `style.css` dependiam delas. O jQuery
foi removido na refatoração e essas regras foram convertidas para media queries
em [`public/css/ajustes.css`](public/css/ajustes.css).

As faixas são **as de `js/functions.js`, não as do array padrão do plugin em
`js/plugins.js`** — o site sobrescreve a configuração:

| classe | faixa |
|---|---|
| `xs` | 0 – 575 |
| `sm` | 576 – 767 |
| `md` | 768 – 1024 |
| `lg` | 1025 – 1199 |
| `xl` | 1200+ |

Ler o array errado desloca tudo uma faixa e **acerta nos extremos**: o celular e
o desktop ficam certos e o erro se esconde no meio da escala. Foi assim que 22
comparações de tablet ficaram reprovadas sem sintoma óbvio. Os mesmos valores
governam o número de colunas do carrossel de logos no
[`site.js`](src/scripts/site.js).

Consequências práticas:

- `ajustes.css` **precisa continuar sendo carregado depois de** `style.css`,
  senão perde na cascata.
- Media query não acrescenta especificidade. Os seletores desse arquivo usam
  `body ...` de propósito, para reproduzir o peso dos originais.
- [`scripts/purge-css.mjs`](scripts/purge-css.mjs) fixa `targets` do
  lightningcss. Sem isso ele emite `@media (width<=767px)`, sintaxe que
  navegador antigo ignora **em silêncio**, ressuscitando a regressão.

Generalizando: neste tema, procure por seletores que dependam de classes que
nenhum HTML estático contém antes de remover qualquer script.

A mesma armadilha mordeu uma segunda vez, pior: `.grid-layout > *` tem
`opacity: 0` e só `.grid-layout.grid-loaded > *` devolve `opacity: 1` — e quem
adicionava `.grid-loaded` era o Isotope. Seis páginas ficaram com o conteúdo
**invisível**. Hoje a visibilidade está no CSS (funciona mesmo se o JS falhar) e
o empacotamento masonry em `gridLayout()` no [`site.js`](src/scripts/site.js).

E uma terceira vez, mais silenciosa: o `.kenburns-bg` do hero tem `z-index: -1` e
só aparece se o `.slide` for um contexto de empilhamento — quem criava isso era o
flickity, posicionando o slide. Sem ele a camada foi para trás do fundo do
próprio slide e **o zoom parou de acontecer**, sem mudar altura nem quebrar
nenhum teste. Resolvido com `position: relative` no slide, em `ajustes.css`.

O padrão comum às três: **plugin removido, CSS que dependia dele silenciosamente
inerte**. Procure por `z-index` negativo, `opacity: 0` e classes de estado antes
de tirar qualquer script.

Ao reproduzir qualquer coisa que o tema fazia em JavaScript, **leia o valor
padrão junto com o atributo**. `data-margin` vale 20 nas grades e 10 nos
carrosséis quando ausente, `data-autoplay` vale 7000, e `data-items` desdobra
numa cadeia de tetos por faixa. Reproduzir só o caso explícito passa no build e
erra no pixel.

## Antes de declarar qualquer coisa pronta

Rode o diff visual:

```bash
node tests/visual-diff.mjs      # precisa dos dois servidores no ar
```

`npm run verify` passou 14/14 durante todo o período em que a grade de logos
estava quebrada — teste de comportamento verifica estados pontuais e não vê
layout colapsar. O procedimento completo está em
[docs/verificacao.md](docs/verificacao.md).

Ao ler o resultado, confira a linha `N/120 comparacoes identicas`, não o código
de saída.

## Convenções

- Textos de navegação, rodapé e cookies ficam em [`src/i18n/ui.ts`](src/i18n/ui.ts),
  nunca nos componentes. É a fonte única que alimenta nav, rodapé, seletor de
  idioma e `hreflang`.
- URLs são requisito: o site tem histórico de indexação. `build.format: 'file'`
  mais `cleanUrls` da Vercel preservam os caminhos originais. Mudança de caminho
  exige redirect 301 no [`vercel.json`](vercel.json).
- [`src/scripts/site.js`](src/scripts/site.js) usa as mesmas classes de estado
  do tema original (`.toggle-active`, `.mainMenu-open`, `.modal-active`, …) para
  que o CSS existente continue valendo. Preserve esses nomes.
- Classe aplicada via JavaScript precisa entrar em `runtimeClasses` no script de
  purga, senão o estilo dela é removido do build.
- Comentários e documentação em português, acompanhando o resto do projeto.

## O que não existe aqui

Para poupar buscas: não há lightbox, formulário, carrossel com múltiplos slides
nem cabeçalho fixo no scroll. O `functions.js` original
inicializava tudo isso, mas nenhuma das 40 páginas usa — foi por isso que a
remoção do jQuery coube em 8 KB.
