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
| `npm run build` | checa os tipos, gera `dist/` e purga o CSS |
| `npm run check` | só a checagem de tipos (`astro check`) |
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
src/i18n/ui.ts            rotas, títulos e strings dos 3 idiomas — comece aqui
src/data/                 associados, parceiros, diretoria, contato
src/layouts/              o layout único de todas as páginas
src/components/           header, rodapé e as grades de dados
src/pages/                as 40 páginas
src/scripts/site.js       comportamentos de interface
public/                   css, imagens, fontes e robots.txt
scripts/                  purga de CSS e subset de fontes
tests/                    verificação comportamental e diff visual
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

Pendente:

- **Subset das fontes de ícone** — `scripts/subset-fonts.py` está pronto mas não
  foi rodado; `public/webfonts/` ainda tem os 253 KB originais.
- **Otimização das imagens** — 198 arquivos, 7.7 MB, sem WebP. A home entrega
  **4,3 MB de imagem** contra 64 KB de CSS. Medido: WebP q90 sem redimensionar
  economiza 15%; q82 com teto de 1920px, 45%; AVIF q60, 54%. Recompressão muda
  pixel por construção, então esta fase precisa de política de tolerância
  própria — é a única que não fecha 120/120.
- **Páginas do ebook em português nas três versões** — 1.089 linhas cada, é
  trabalho de tradutor. Ver o fim de [docs/decisoes.md](docs/decisoes.md).
- **O contador diz 83 resorts associados; a lista tem 78.**
- **Consentimento de cookies** — o GTM dispara antes de qualquer escolha do
  visitante. Decisão do cliente, com implicação de LGPD.

As duas primeiras mexem em renderização, então cada uma pede um diff visual
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
