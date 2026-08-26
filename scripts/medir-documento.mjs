/**
 * Mede no navegador o que o DOCUMENTO precisa reproduzir.
 *
 * Quinto da familia: `medir-base.mjs` cobre o elemento nu, `medir-primitivos.mjs`
 * o que tem classe e e generico, `medir-padroes.mjs` as composicoes, e
 * `medir-cromo.mjs` o que embrulha a pagina. Este cobre o que a Etapa 6 precisa e
 * nenhum dos quatro tinha motivo para olhar: as duas paginas de TEXTO CORRIDO —
 * termos de uso e politica de privacidade.
 *
 * Sao tres superficies novas, e nenhuma delas aparece em pagina ja migrada:
 *
 *   o SEPARADOR entre secoes  `<div class="space">` e `<hr class="space">`, que
 *                             e como o tema espacava capitulo de texto. Sao dois
 *                             elementos com a mesma classe e alturas diferentes,
 *                             e um deles ainda muda por faixa (ajustes.css tem
 *                             duas regras de `hr.space` em media query);
 *   a CITACAO                 `.blockquote` do endereco, nos termos;
 *   a TABELA                  `.table.table-bordered` da secao de cookies, que a
 *                             <SecaoCookies> emite hoje com markup do tema.
 *
 * Mede tambem a LARGURA DA LINHA que o tema entrega nestas paginas — o `.row`
 * dentro do `.container` de 1500px. E o numero que justifica o
 * `<Container largura="estreita">` da migracao, e sem ele "a linha estava longa
 * demais" seria opiniao.
 *
 *   npx astro preview --port 4330
 *   node scripts/medir-documento.mjs
 *   BASE=http://localhost:4330 node scripts/medir-documento.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { VIEWPORTS } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/documento-medido.json';

const TERMOS = '/termos-de-uso.html';
const PRIVACIDADE = '/politica-de-privacidade.html';

const ALVOS = [
  // ---- o eixo: onde o texto do tema comeca e termina ----
  { grupo: 'documento', nome: 'section', pagina: TERMOS, seletor: 'main section:nth-of-type(2)' },
  { grupo: 'documento', nome: '.container', pagina: TERMOS, seletor: 'main section:nth-of-type(2) .container' },
  /*
   * A LINHA. Nao ha `.col-*` nestas duas paginas — o `<p>` e filho direto do
   * `.row`, que herda a largura inteira do container. E a medida que diz se a
   * migracao pode estreitar a coluna sem inventar um numero.
   */
  { grupo: 'documento', nome: '.row (largura da linha)', pagina: TERMOS, seletor: 'main section:nth-of-type(2) .row' },
  { grupo: 'documento', nome: '.row > p', pagina: TERMOS, seletor: 'main section:nth-of-type(2) .row > p' },
  { grupo: 'documento', nome: '.row > h4', pagina: TERMOS, seletor: 'main section:nth-of-type(2) .row > h4' },

  // ---- os dois separadores, que tem a MESMA classe e alturas diferentes ----
  { grupo: 'documento', nome: 'div.space', pagina: TERMOS, seletor: 'main div.space' },
  { grupo: 'documento', nome: 'hr.space', pagina: PRIVACIDADE, seletor: 'main hr.space' },

  // ---- a citacao do endereco ----
  { grupo: 'documento', nome: '.blockquote', pagina: TERMOS, seletor: 'main .blockquote' },
  { grupo: 'documento', nome: '.blockquote p', pagina: TERMOS, seletor: 'main .blockquote p' },

  // ---- a lista nua dos termos (sem marcador de icone) ----
  { grupo: 'documento', nome: 'ul (termos)', pagina: TERMOS, seletor: 'main section:nth-of-type(2) ul' },
  { grupo: 'documento', nome: 'ul li (termos)', pagina: TERMOS, seletor: 'main section:nth-of-type(2) ul li' },

  // ---- o titulo da pagina ----
  { grupo: 'documento', nome: 'h1.text-md.h2', pagina: TERMOS, seletor: 'main h1' },
  { grupo: 'documento', nome: 'h1 + p small', pagina: TERMOS, seletor: 'main section:nth-of-type(1) small' },
  /* O bloco de abertura da privacidade e um `<h2>` com um paragrafo inteiro
     dentro — a razao de ele virar <Texto tamanho="lg"> na migracao. */
  { grupo: 'documento', nome: 'h2 de abertura', pagina: PRIVACIDADE, seletor: 'main section:nth-of-type(2) h2' },

  // ---- a tabela de cookies ----
  { grupo: 'tabela', nome: 'table.table-bordered', pagina: PRIVACIDADE, seletor: 'main table.table-bordered' },
  { grupo: 'tabela', nome: 'thead th', pagina: PRIVACIDADE, seletor: 'main table.table-bordered thead th' },
  { grupo: 'tabela', nome: 'tbody th', pagina: PRIVACIDADE, seletor: 'main table.table-bordered tbody th' },
  { grupo: 'tabela', nome: 'tbody td', pagina: PRIVACIDADE, seletor: 'main table.table-bordered tbody td' },
  { grupo: 'tabela', nome: '.text-bold (rotulo de categoria)', pagina: PRIVACIDADE, seletor: 'main p.text-bold' },
];

const CAIXA = [
  'display', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'backgroundColor', 'borderRadius', 'color',
];

const PROPS = {
  documento: [
    ...CAIXA, 'width', 'height', 'maxWidth', 'fontSize', 'fontWeight', 'lineHeight',
    'borderLeftWidth', 'borderTopWidth', 'borderStyle', 'borderColor',
    'listStyleType', 'paddingInlineStart', 'textAlign', 'fontStyle',
  ],
  tabela: [
    ...CAIXA, 'width', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderStyle', 'borderColor', 'verticalAlign', 'borderCollapse',
  ],
};

const navegador = await chromium.launch();
const registros = [];

for (const vp of VIEWPORTS) {
  const page = await navegador.newPage({ viewport: { width: vp.width, height: vp.height } });

  for (const alvo of ALVOS) {
    const resp = await page.goto(`${BASE}${alvo.pagina}`, { waitUntil: 'load' });
    if (!resp || !resp.ok()) {
      console.error(`FALHA ao carregar ${alvo.pagina} — ${resp ? resp.status() : 'sem resposta'}`);
      continue;
    }

    const props = PROPS[alvo.grupo];
    const medido = await page.evaluate(
      ({ seletor, props }) => {
        const el = document.querySelector(seletor);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const saida = {};
        for (const p of props) saida[p] = cs[p];
        const r = el.getBoundingClientRect();
        saida['_caixa'] = `${Math.round(r.width)}x${Math.round(r.height)}`;
        /*
         * Quantos caracteres cabem numa linha. E a unidade em que legibilidade
         * se discute, e nao ha como deriva-la do CSS: depende da fonte real.
         * Mede-se o "0" na fonte computada do proprio elemento.
         */
        const lona = document.createElement('canvas').getContext('2d');
        lona.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const zero = lona.measureText('0').width;
        const util = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        saida['_ch'] = zero > 0 ? Math.round(util / zero) : null;
        return saida;
      },
      { seletor: alvo.seletor, props }
    );

    if (!medido) {
      console.error(`AUSENTE  ${vp.nome}  ${alvo.nome}  (${alvo.seletor} em ${alvo.pagina})`);
      continue;
    }

    registros.push({ viewport: vp.nome, grupo: alvo.grupo, nome: alvo.nome, pagina: alvo.pagina, repouso: medido });
  }

  await page.close();
  console.log(`medido: ${vp.nome}`);
}

await navegador.close();

await mkdir('tests', { recursive: true });
await writeFile(SAIDA, JSON.stringify(registros, null, 2));
console.log(`\n${registros.length} medidas -> ${SAIDA}\n`);

for (const grupo of Object.keys(PROPS)) {
  const doGrupo = registros.filter((r) => r.grupo === grupo);
  if (!doGrupo.length) continue;
  console.log(`\n=== ${grupo.toUpperCase()} ===`);
  for (const nome of [...new Set(doGrupo.map((r) => r.nome))]) {
    console.log(`\n  ${nome}`);
    for (const r of doGrupo.filter((x) => x.nome === nome)) {
      const linha = PROPS[grupo]
        .filter((p) => r.repouso[p] && !['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)'].includes(r.repouso[p]))
        .map((p) => `${p}=${r.repouso[p]}`)
        .join('  ');
      console.log(`    ${r.viewport.padEnd(8)} ${r.repouso._caixa.padEnd(12)} ${String(r.repouso._ch ?? '-').padEnd(5)}ch  ${linha}`);
    }
  }
}
