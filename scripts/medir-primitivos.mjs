/**
 * Mede no navegador o que os PRIMITIVOS precisam reproduzir.
 *
 * Companheiro do medir-base.mjs, que cobre o elemento nu (h1-h6, p, ul, a). Este
 * cobre o que tem classe: botao e suas cinco variantes, secao, container, grade
 * e icone. Mesma disciplina, e pelo mesmo motivo — o style.css tem 21 mil linhas
 * e a regra que parece valer frequentemente nao e a que vence. O `padding` das
 * listas ja entrou errado no base.css por leitura (28px onde o real e 14px);
 * valor que vai para um componente sai daqui.
 *
 * Alem do repouso, mede o HOVER: e o unico estado do tema que nao aparece no
 * HTML nem no diff visual, e o <Botao> precisa dos cinco estados no catalogo.
 *
 *   npx astro preview --port 4330
 *   node scripts/medir-primitivos.mjs
 *   BASE=http://localhost:4330 node scripts/medir-primitivos.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { VIEWPORTS } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/primitivos-medidos.json';

/**
 * Onde cada coisa mora. Uma pagina por variante, escolhida pelo grep do markup:
 * medir a mesma variante em duas paginas so triplica o tempo.
 */
const ALVOS = [
  // ---- botao: as cinco variantes que o markup de fato usa ----
  { grupo: 'botao', nome: 'btn', pagina: '/associe-se.html', seletor: 'main a.btn:not([class*=" btn-"])', hover: true },
  { grupo: 'botao', nome: 'btn-outline', pagina: '/associe-se.html', seletor: 'main a.btn.btn-outline:not(.btn-light)', hover: true },
  { grupo: 'botao', nome: 'btn-light btn-outline', pagina: '/apoie.html', seletor: 'main a.btn.btn-light.btn-outline', hover: true },
  { grupo: 'botao', nome: 'btn-lg', pagina: '/associados.html', seletor: 'main a.btn.btn-lg', hover: true },
  { grupo: 'botao', nome: 'btn-warning btn-lg', pagina: '/index.html', seletor: 'main a.btn.btn-warning.btn-lg', hover: true },
  { grupo: 'botao', nome: 'btn-ebook btn-lg', pagina: '/ebook.html', seletor: 'main a.btn.btn-ebook.btn-lg', hover: true },
  {
    grupo: 'botao',
    nome: 'btn-rounded btn-light btn-sm',
    pagina: '/index.html',
    seletor: '#cookieNotify button.btn[data-cookie="aceitar"]',
    // A faixa nasce `hidden`; sem revelar, o retangulo e zero e o hover nao vai.
    revelar: '#cookieNotify',
    hover: true,
  },

  // ---- layout ----
  { grupo: 'secao', nome: 'section', pagina: '/associe-se.html', seletor: 'main section:not([class])' },
  { grupo: 'secao', nome: 'section.background-grey', pagina: '/publicacoes.html', seletor: 'main section.background-grey' },
  { grupo: 'secao', nome: 'section.background-dark', pagina: '/index.html', seletor: 'main section.background-dark' },
  { grupo: 'container', nome: '.container', pagina: '/associe-se.html', seletor: 'main .container' },
  { grupo: 'grade', nome: '.row', pagina: '/diretoria.html', seletor: 'main .row' },
  { grupo: 'grade', nome: '.col-lg-3', pagina: '/diretoria.html', seletor: 'main .col-lg-3' },
  { grupo: 'grade', nome: '.col-lg-4', pagina: '/publicacoes.html', seletor: 'main .col-lg-4' },
  { grupo: 'grade', nome: '.col-lg-6', pagina: '/fale-conosco.html', seletor: 'main .col-lg-6' },
  /*
   * As duas grades masonry, e elas sao o unico lugar do site em que o numero de
   * colunas NAO esta no CSS: quem posiciona e o `gridLayout()` do site.js, em
   * absoluto. Ler `.post-5-columns` no style.css da a largura da celula, nao a
   * contagem — a contagem sai de quantas posicoes horizontais distintas os itens
   * ocupam de fato, que e o que `itens` conta abaixo.
   */
  {
    grupo: 'grade',
    nome: '.grid-layout.post-5-columns',
    pagina: '/publicacoes.html',
    seletor: 'main .grid-layout',
    itens: 'main .grid-layout .post-item',
  },
  {
    grupo: 'grade',
    nome: '.grid-layout.post-4-columns',
    pagina: '/estatisticas-e-estudos.html',
    seletor: 'main .grid-layout',
    itens: 'main .grid-layout .post-item',
  },
  { grupo: 'grade', nome: '.post-item (publicacoes)', pagina: '/publicacoes.html', seletor: 'main .post-item' },
  { grupo: 'grade', nome: '.post-item (estudos)', pagina: '/estatisticas-e-estudos.html', seletor: 'main .post-item' },

  // ---- icone ----
  { grupo: 'icone', nome: 'i.fab (rodape)', pagina: '/index.html', seletor: '#footer i.fab' },
  { grupo: 'icone', nome: 'i.icon-* (caixa)', pagina: '/fale-conosco.html', seletor: 'main .icon-box i' },
  { grupo: 'icone', nome: 'li:before (list-icon-arrow)', pagina: '/associe-se.html', seletor: 'main .list-icon-arrow li', pseudo: '::before' },
];

/** As propriedades que definem a aparencia de cada grupo. */
const PROPS = {
  botao: [
    'display', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
    'borderRadius', 'borderTopWidth', 'borderStyle', 'borderColor',
    'backgroundColor', 'color', 'boxShadow', 'transitionDuration', 'transitionProperty',
  ],
  secao: ['paddingTop', 'paddingBottom', 'backgroundColor', 'color'],
  container: ['width', 'maxWidth', 'paddingLeft', 'paddingRight', 'marginLeft'],
  grade: ['display', 'flexWrap', 'marginLeft', 'marginRight', 'width', 'paddingLeft', 'paddingRight', 'flexBasis'],
  icone: ['fontSize', 'lineHeight', 'fontFamily', 'width', 'height', 'color', 'content'],
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

    if (alvo.revelar) {
      await page.evaluate((s) => document.querySelector(s)?.removeAttribute('hidden'), alvo.revelar);
    }

    const props = PROPS[alvo.grupo];
    const medir = () =>
      page.evaluate(
        ({ seletor, props, pseudo, itens }) => {
          const el = document.querySelector(seletor);
          if (!el) return null;
          const cs = getComputedStyle(el, pseudo || undefined);
          const saida = {};
          for (const p of props) saida[p] = cs[p];
          const r = el.getBoundingClientRect();
          saida['_caixa'] = `${Math.round(r.width)}x${Math.round(r.height)}`;
          /*
           * Quantas COLUNAS a grade tem de fato: posicoes horizontais distintas
           * entre os itens. Numa grade masonry posicionada em absoluto, e a
           * unica forma de saber — e nas duas do tema o numero nao esta em lugar
           * nenhum do CSS.
           */
          if (itens) {
            const caixas = [...document.querySelectorAll(itens)];
            const xs = new Set(caixas.map((n) => Math.round(n.getBoundingClientRect().left)));
            saida['_colunas'] = `${xs.size} colunas / ${caixas.length} itens`;
          }
          return saida;
        },
        { seletor: alvo.seletor, props, pseudo: alvo.pseudo, itens: alvo.itens }
      );

    const repouso = await medir();
    if (!repouso) {
      console.error(`AUSENTE  ${vp.nome}  ${alvo.nome}  (${alvo.seletor} em ${alvo.pagina})`);
      continue;
    }

    let hover = null;
    if (alvo.hover) {
      await page.hover(alvo.seletor);
      // O tema anima; sem esperar, mede-se o meio da transicao.
      await page.waitForTimeout(400);
      hover = await medir();
    }

    registros.push({ viewport: vp.nome, grupo: alvo.grupo, nome: alvo.nome, pagina: alvo.pagina, repouso, hover });
  }

  await page.close();
  console.log(`medido: ${vp.nome}`);
}

await navegador.close();

await mkdir('tests', { recursive: true });
await writeFile(SAIDA, JSON.stringify(registros, null, 2));
console.log(`\n${registros.length} medidas -> ${SAIDA}\n`);

/* ---- resumo legivel, um bloco por grupo ---- */
for (const grupo of Object.keys(PROPS)) {
  const doGrupo = registros.filter((r) => r.grupo === grupo);
  if (!doGrupo.length) continue;
  console.log(`\n=== ${grupo.toUpperCase()} ===`);
  for (const nome of [...new Set(doGrupo.map((r) => r.nome))]) {
    console.log(`\n  ${nome}`);
    for (const r of doGrupo.filter((x) => x.nome === nome)) {
      const linha = PROPS[grupo]
        .map((p) => `${p}=${r.repouso[p]}`)
        .join('  ');
      const colunas = r.repouso._colunas ? `${r.repouso._colunas.padEnd(22)}` : '';
      console.log(`    ${r.viewport.padEnd(8)} ${r.repouso._caixa.padEnd(10)} ${colunas}${linha}`);
      if (r.hover) {
        // So o que muda no hover: repetir o resto esconde a diferenca.
        const delta = PROPS[grupo].filter((p) => r.hover[p] !== r.repouso[p]).map((p) => `${p}: ${r.repouso[p]} -> ${r.hover[p]}`);
        console.log(`    ${''.padEnd(8)} hover     ${delta.length ? delta.join('  ') : '(sem mudanca)'}`);
      }
    }
  }
}
