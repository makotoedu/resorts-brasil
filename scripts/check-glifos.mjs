/**
 * Confere que as fontes de icone subsetadas cobrem tudo o que o CSS pede.
 *
 * Roda no build, depois da purga, e ABORTA em vez de avisar — o modelo e o
 * mesmo do purge-css.mjs, e pela mesma razao: a falha desta classe e silenciosa.
 *
 * O historico: a primeira versao do subset preservava so U+F05A no
 * fa-solid-900, montada a partir do inventario de <i class="fa-*"> do HTML. Mas
 * dois glifos entram por pseudo-elemento e nao tem classe nenhuma —
 * `.list-icon-arrow li:before` (U+F054) e `.list-icon-circle li:before`
 * (U+F192). Aplicar aquele subset apagava as setas e bolinhas das listas de 6
 * paginas: sem erro de console, sem mudanca de altura, sem teste reprovado.
 *
 * A varredura certa e a do CSS PURGADO, nao a das classes do HTML: e o unico
 * lugar onde sobra exatamente o que as 40 paginas usam, pseudo-elemento
 * incluido. O lightningcss ja converteu os escapes `\f054` em caractere
 * literal, entao basta varrer o intervalo de uso privado.
 *
 * Confere tres coisas:
 *   1. todo codepoint de uso privado do CSS esta em scripts/glifos.json;
 *   2. todo src: de /webfonts/ carrega a query de versao declarada la;
 *   3. todo arquivo publicado em dist/webfonts/ e referenciado pelo CSS.
 */
import { readFile, readdir } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const CSS_DIR = new URL('dist/css/', ROOT);
const FONTS_DIR = new URL('dist/webfonts/', ROOT);
const GLIFOS = new URL('scripts/glifos.json', ROOT);

/** Area de uso privado do Unicode, onde as fontes de icone poem os glifos. */
const PUA_INICIO = 0xe000;
const PUA_FIM = 0xf8ff;

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/** O trecho de regra em que o codepoint aparece, para a mensagem de erro. */
function regraEm(css, indice) {
  const inicio = css.lastIndexOf('}', indice) + 1;
  const fim = css.indexOf('}', indice);
  return css
    .slice(inicio, fim === -1 ? indice + 60 : fim + 1)
    .replace(/[\u{E000}-\u{F8FF}]/gu, (c) => `\\${c.codePointAt(0).toString(16)}`)
    .trim();
}

async function main() {
  const spec = JSON.parse(await readFile(GLIFOS, 'utf8'));

  const permitidos = new Set();
  for (const familia of spec.familias) {
    for (const cp of Object.keys(familia.glifos)) permitidos.add(cp);
  }
  for (const cp of Object.keys(spec.ignorar ?? {})) permitidos.add(cp);

  const folhas = (await readdir(CSS_DIR)).filter((f) => f.endsWith('.css'));
  if (folhas.length === 0) {
    throw new Error(
      'check-glifos abortado: nenhuma folha em dist/css/. Rode "astro build" antes, ' +
        'e rode este script a partir da raiz do projeto.'
    );
  }

  const faltando = new Map(); // codepoint -> "arquivo: regra"
  const referenciados = new Set();
  const semVersao = [];

  for (const folha of folhas) {
    const css = await readFile(new URL(folha, CSS_DIR), 'utf8');

    for (let i = 0; i < css.length; i++) {
      const cp = css.codePointAt(i);
      if (cp < PUA_INICIO || cp > PUA_FIM) continue;
      const chave = hex(cp);
      if (permitidos.has(chave)) continue;
      if (!faltando.has(chave)) faltando.set(chave, `${folha}: ${regraEm(css, i)}`);
    }

    for (const m of css.matchAll(/url\(\s*['"]?([^'")\s]*\/webfonts\/[^'")\s]+)['"]?\s*\)/g)) {
      const url = m[1];
      const [arquivo, query] = url.split('/').pop().split('?');
      referenciados.add(arquivo);
      if (query !== `v=${spec.versao}`) semVersao.push(`${folha}: ${url}`);
    }
  }

  const erros = [];

  if (faltando.size > 0) {
    erros.push(
      `${faltando.size} codepoint(s) usados pelo CSS purgado e ausentes de scripts/glifos.json:\n` +
        [...faltando].map(([cp, onde]) => `    ${cp}  ${onde}`).join('\n') +
        '\n  O subset nao tem esses glifos: eles renderizariam como .notdef, sem erro nenhum.\n' +
        '  Acrescente em `glifos` se o icone e usado mesmo, ou em `ignorar` com o motivo\n' +
        '  se for falso positivo do extrator do PurgeCSS (ver o U+E919 que ja esta la).'
    );
  }

  if (semVersao.length > 0) {
    erros.push(
      `${semVersao.length} src: de fonte sem a query de versao ?v=${spec.versao}:\n` +
        semVersao.map((s) => `    ${s}`).join('\n') +
        '\n  /webfonts/ e servido com Cache-Control immutable de um ano (vercel.json) e os\n' +
        '  nomes nao tem hash. Sem a query, quem ja visitou o site recebe a fonte antiga\n' +
        '  por ate um ano — e um subset novo com um icone novo vira tofu.'
    );
  }

  const publicados = (await readdir(FONTS_DIR)).filter((f) => !f.startsWith('.'));
  const orfaos = publicados.filter((f) => !referenciados.has(f));
  if (orfaos.length > 0) {
    erros.push(
      `${orfaos.length} arquivo(s) em dist/webfonts/ que nenhum CSS referencia: ${orfaos.join(', ')}\n` +
        '  Sao bytes publicados e nunca baixados. Rode "python scripts/subset-fonts.py",\n' +
        '  que limpa public/webfonts/ do que nao esta em glifos.json.'
    );
  }

  const ausentes = [...referenciados].filter((f) => !publicados.includes(f));
  if (ausentes.length > 0) {
    erros.push(
      `${ausentes.length} fonte(s) referenciada(s) pelo CSS e ausente(s) de dist/webfonts/: ${ausentes.join(', ')}`
    );
  }

  if (erros.length > 0) {
    throw new Error('check-glifos abortado:\n\n  ' + erros.join('\n\n  ') + '\n');
  }

  const emUso = spec.familias.reduce((n, f) => n + Object.keys(f.glifos).length, 0);
  console.log(
    `  glifos         ${emUso} em uso em ${publicados.length} arquivos, versao ${spec.versao}  (ok)`
  );
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
