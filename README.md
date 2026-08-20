# Resorts Brasil

Site institucional da Associação Brasileira de Resorts, em português, inglês e
espanhol. Estático, sem backend: 40 páginas geradas com [Astro](https://astro.build)
e hospedadas na Vercel.

## Requisitos

- Node.js 20 ou superior (desenvolvido com a 24)
- Python 3 com `fonttools` e `brotli`, só para rodar o subset de fontes

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
| `npm run build` | gera `dist/` e roda a purga de CSS |
| `npm run preview` | serve o `dist/` gerado |
| `npm run verify` | suíte de comportamento (precisa de um preview no ar) |

Scripts auxiliares:

```bash
node scripts/purge-css.mjs      # purga e minifica (já embutido no build)
python scripts/subset-fonts.py  # reduz as fontes aos ícones em uso
node tests/visual-diff.mjs      # compara o build com o site original
#   PAGES=/index.html VIEWPORTS=desktop ... limita a rodada
```

### URLs no preview local

Com `build.format: 'file'`, o `astro preview` serve tanto `/historia` quanto
`/historia.html` — as duas formas respondem 200, nos três idiomas. Em produção,
o `cleanUrls` da Vercel deixa `/historia` como a URL canônica.

## Estrutura

```
src/i18n/ui.ts            rotas e strings dos 3 idiomas — comece por aqui
src/layouts/              o layout único de todas as páginas
src/components/           header e rodapé
src/pages/                as 40 páginas
src/scripts/site.js       comportamentos de interface
public/                   css, imagens e fontes, servidos como estão
scripts/                  purga de CSS e subset de fontes
tests/                    verificação comportamental e diff visual
docs/                     documentação técnica
```

## Tarefas comuns

**Mudar um texto do menu ou do rodapé** — edite [`src/i18n/ui.ts`](src/i18n/ui.ts),
nunca os componentes. As strings dos três idiomas ficam todas lá.

**Adicionar uma página** — acrescente a chave em `routes` e os rótulos em `ui`
no [`src/i18n/ui.ts`](src/i18n/ui.ts), depois crie os três arquivos `.astro` em
`src/pages/`. O `hreflang` e o `canonical` saem automaticamente.

**Mexer em CSS** — leia antes o trecho sobre `body.breakpoint-*` em
[docs/decisoes.md](docs/decisoes.md), e rode o diff visual depois. Há uma
armadilha específica deste tema que não é óbvia.

**Adicionar uma classe aplicada via JavaScript** — inclua o nome na lista
`runtimeClasses` de [`scripts/purge-css.mjs`](scripts/purge-css.mjs), senão a
purga remove o estilo dela.

## Estado da refatoração

Feito e verificado:

- 40 páginas em um layout único, URLs preservadas, `hreflang` nos 3 idiomas
- jQuery e o engine do tema trocados por ~9 KB de JS nativo
- CSS de 805 KB para 63 KB (purga contra o HTML gerado + lightningcss)
- paridade visual com o site original conferida página a página

Pendente:

- **Subset das fontes de ícone** — `scripts/subset-fonts.py` está pronto mas não
  foi rodado; `public/webfonts/` ainda tem os 256 KB originais.
- **Otimização das imagens** — 198 arquivos, 8.3 MB, sem WebP. Exige mover
  `public/images/` para `src/assets/` para usar `astro:assets`, que é a mudança
  de maior superfície que resta.

As duas mexem em renderização, então cada uma pede um diff visual próprio.

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — como o projeto se organiza
- [docs/decisoes.md](docs/decisoes.md) — por que cada escolha foi feita, e as
  armadilhas do tema
- [docs/verificacao.md](docs/verificacao.md) — as três camadas de verificação e
  o que cada uma não cobre

## Deploy

Vercel. O [`vercel.json`](vercel.json) define `cleanUrls`, `trailingSlash: false`
e o redirect 301 de `/arena-conexoes` para `/`.

Antes de promover para produção, rode as três camadas de verificação descritas
em [docs/verificacao.md](docs/verificacao.md) — em especial o diff visual, que é
a única que pega regressão de layout.
