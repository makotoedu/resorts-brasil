/**
 * Mede no navegador o CROMO — cabecalho, rodape, faixa de cookies e o botao de
 * voltar ao topo.
 *
 * Quarto da familia: medir-base.mjs cobre o elemento nu, medir-primitivos.mjs o
 * que tem classe e e generico, medir-padroes.mjs as composicoes de conteudo, e
 * este cobre o que EMBRULHA toda pagina.
 *
 * POR QUE ELE EXISTE, e por que apareceu so na Etapa 5: o catalogo /design monta
 * o proprio documento justamente porque o unico layout de entao trazia cabecalho
 * e rodape do tema. Qualquer pagina de conteudo usava aquele layout, entao a
 * primeira a trocar de camada perderia o estilo dos dois — nao havia etapa de
 * pagina possivel antes desta medicao.
 *
 * O cromo tem tres coisas que nenhum dos anteriores tinha, e as tres so existem
 * medidas:
 *
 *   ESTADO ABERTO   o menu mobile, o submenu de desktop e o seletor de idioma
 *                   so tem geometria depois de abertos. Em repouso medem zero,
 *                   ou nem estao no fluxo.
 *   HOVER           link de menu, link de rodape e icone social mudam de cor com
 *                   o mouse em cima, e isso nao aparece no HTML nem no diff.
 *   FAIXA ESCONDIDA a de cookies nasce `hidden`. Medi-la exige revela-la antes.
 *
 *   npx astro preview --port 4330
 *   node scripts/medir-cromo.mjs
 *   BASE=http://localhost:4330 node scripts/medir-cromo.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { VIEWPORTS } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/cromo-medido.json';

/*
 * Uma pagina so. O cromo e identico nas 40 — e essa e a razao de ele ser cromo.
 * A de historia serve porque nao tem hero transparente por cima do cabecalho,
 * entao o `#header` mede a propria altura em vez da do slide.
 */
const PAGINA = '/historia.html';

/**
 * `preparo` roda no navegador antes de medir, e e o que distingue este script
 * dos tres anteriores: metade do cromo nao tem geometria em repouso.
 */
const ALVOS = [
  // ---- topbar (some abaixo de 1025px: d-none d-xl-block d-lg-block) ----
  { grupo: 'topbar', nome: '#topbar', seletor: '#topbar' },
  { grupo: 'topbar', nome: '.top-menu li a', seletor: '#topbar .top-menu li a', hover: true },
  { grupo: 'topbar', nome: 'social a', seletor: '#topbar .social-icons li a', hover: true },
  { grupo: 'topbar', nome: 'social i', seletor: '#topbar .social-icons li a i' },

  // ---- cabecalho ----
  { grupo: 'cabecalho', nome: '#header', seletor: '#header' },
  { grupo: 'cabecalho', nome: '.header-inner', seletor: '#header .header-inner' },
  { grupo: 'cabecalho', nome: '#logo img', seletor: '#header #logo img.logo-default' },
  { grupo: 'cabecalho', nome: '.header-extras a', seletor: '#header .header-extras > ul > li > .p-dropdown > a', hover: true },
  { grupo: 'cabecalho', nome: '.header-extras i', seletor: '#header .header-extras .p-dropdown > a > i' },
  { grupo: 'cabecalho', nome: '.header-extras span', seletor: '#header .header-extras .p-dropdown > a > span' },

  // ---- navegacao de desktop ----
  { grupo: 'nav', nome: '#mainMenu', seletor: '#mainMenu' },
  { grupo: 'nav', nome: 'nav > ul > li > a', seletor: '#mainMenu nav > ul > li > a', hover: true },
  {
    grupo: 'nav',
    nome: '.dropdown-menu (aberto)',
    seletor: '#mainMenu nav > ul > li.dropdown .dropdown-menu',
    // O submenu de desktop abre por :hover no pai. Sem isto ele mede 0x0.
    preparo: async (page) => page.hover('#mainMenu nav > ul > li.dropdown > a'),
  },
  {
    grupo: 'nav',
    nome: '.dropdown-menu a',
    seletor: '#mainMenu nav > ul > li.dropdown .dropdown-menu li a',
    preparo: async (page) => page.hover('#mainMenu nav > ul > li.dropdown > a'),
    hover: true,
  },
  {
    grupo: 'nav',
    nome: '.p-dropdown-content (aberto)',
    seletor: '#header .p-dropdown-content',
    preparo: async (page) => page.click('#header .header-extras .p-dropdown > a'),
  },
  {
    grupo: 'nav',
    nome: '.p-dropdown-content a',
    seletor: '#header .p-dropdown-content li a',
    preparo: async (page) => page.click('#header .header-extras .p-dropdown > a'),
    hover: true,
  },

  // ---- gatilho do menu mobile (some acima de 991px) ----
  { grupo: 'gatilho', nome: '.lines-button', seletor: '#mainMenu-trigger .lines-button' },
  { grupo: 'gatilho', nome: '.lines', seletor: '#mainMenu-trigger .lines' },
  { grupo: 'gatilho', nome: '.lines::before', seletor: '#mainMenu-trigger .lines', pseudo: '::before' },
  {
    grupo: 'gatilho',
    nome: '#mainMenu (aberto)',
    seletor: '#mainMenu',
    // O menu mobile so tem altura depois do clique; o site.js anima 500ms.
    preparo: async (page) => {
      await page.click('#mainMenu-trigger a');
      await page.waitForTimeout(700);
    },
  },
  {
    grupo: 'gatilho',
    nome: 'nav a (menu aberto)',
    seletor: '#mainMenu nav > ul > li > a',
    preparo: async (page) => {
      await page.click('#mainMenu-trigger a');
      await page.waitForTimeout(700);
    },
  },

  // ---- rodape ----
  { grupo: 'rodape', nome: '#footer', seletor: '#footer' },
  { grupo: 'rodape', nome: '.footer-content', seletor: '#footer .footer-content' },
  { grupo: 'rodape', nome: '.widget h4', seletor: '#footer .widget h4' },
  { grupo: 'rodape', nome: '.widget ul.list', seletor: '#footer .widget ul.list' },
  { grupo: 'rodape', nome: '.widget ul.list li', seletor: '#footer .widget ul.list li' },
  { grupo: 'rodape', nome: '.widget ul.list a', seletor: '#footer .widget ul.list li a', hover: true },
  { grupo: 'rodape', nome: 'logo img', seletor: '#footer .footer-content img' },
  { grupo: 'rodape', nome: 'social a', seletor: '#footer .social-icons li a', hover: true },
  { grupo: 'rodape', nome: 'social i', seletor: '#footer .social-icons li a i' },
  { grupo: 'rodape', nome: '.copyright-content', seletor: '#footer .copyright-content' },
  { grupo: 'rodape', nome: '.copyright-text', seletor: '#footer .copyright-text' },
  { grupo: 'rodape', nome: '.copyright-text a', seletor: '#footer .copyright-text a', hover: true },

  // ---- faixa de cookies (nasce hidden) ----
  {
    grupo: 'cookies',
    nome: '.modal-strip',
    seletor: '#cookieNotify',
    preparo: async (page) => {
      await page.evaluate(() => {
        const n = document.querySelector('#cookieNotify');
        n.hidden = false;
        n.classList.add('modal-active');
      });
      await page.waitForTimeout(800);
    },
  },
  {
    grupo: 'cookies',
    nome: 'texto',
    seletor: '#cookieNotify .col-lg-7',
    preparo: async (page) =>
      page.evaluate(() => {
        const n = document.querySelector('#cookieNotify');
        n.hidden = false;
        n.classList.add('modal-active');
      }),
  },
  {
    grupo: 'cookies',
    nome: 'botao',
    seletor: '#cookieNotify .btn',
    preparo: async (page) =>
      page.evaluate(() => {
        const n = document.querySelector('#cookieNotify');
        n.hidden = false;
        n.classList.add('modal-active');
      }),
    hover: true,
  },
  {
    grupo: 'cookies',
    nome: '.cookie-prefs',
    seletor: '#cookiePrefs',
    preparo: async (page) =>
      page.evaluate(() => {
        const n = document.querySelector('#cookieNotify');
        n.hidden = false;
        n.classList.add('modal-active');
        document.querySelector('#cookiePrefs').hidden = false;
      }),
  },

  // ---- voltar ao topo ----
  {
    grupo: 'topo',
    nome: '#scrollTop',
    seletor: '#scrollTop',
    // O site.js so o revela depois de 400px de rolagem, mexendo no style inline.
    preparo: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(300);
    },
    hover: true,
  },
  {
    grupo: 'topo',
    nome: '#scrollTop i',
    seletor: '#scrollTop i',
    preparo: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(300);
    },
  },
];

const CAIXA = [
  'display', 'position', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginBottom', 'backgroundColor', 'borderRadius', 'color',
];
const TEXTO = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform'];

const PROPS = {
  topbar: [...CAIXA, ...TEXTO, 'width', 'height', 'borderBottomWidth', 'borderColor'],
  cabecalho: [...CAIXA, ...TEXTO, 'width', 'height', 'top', 'zIndex', 'maxHeight', 'objectFit'],
  nav: [...CAIXA, ...TEXTO, 'width', 'height', 'top', 'left', 'boxShadow', 'opacity', 'visibility', 'zIndex'],
  gatilho: [...CAIXA, ...TEXTO, 'width', 'height', 'minHeight', 'borderTopWidth', 'borderColor', 'content'],
  rodape: [...CAIXA, ...TEXTO, 'width', 'height', 'borderTopWidth', 'borderColor', 'textAlign', 'listStyleType', 'paddingInlineStart'],
  cookies: [...CAIXA, ...TEXTO, 'width', 'height', 'bottom', 'zIndex', 'transform', 'textAlign'],
  topo: [...CAIXA, ...TEXTO, 'width', 'height', 'right', 'bottom', 'opacity', 'zIndex'],
};

const navegador = await chromium.launch();
const registros = [];

for (const vp of VIEWPORTS) {
  const page = await navegador.newPage({ viewport: { width: vp.width, height: vp.height } });

  for (const alvo of ALVOS) {
    const resp = await page.goto(`${BASE}${PAGINA}`, { waitUntil: 'load' });
    if (!resp || !resp.ok()) {
      console.error(`FALHA ao carregar ${PAGINA} — ${resp ? resp.status() : 'sem resposta'}`);
      continue;
    }

    if (alvo.preparo) {
      try {
        await alvo.preparo(page);
      } catch {
        /* O alvo pode nao existir nesta faixa (topbar no mobile, gatilho no
           desktop). Segue para a medicao, que reporta AUSENTE com o motivo. */
      }
    }

    const props = PROPS[alvo.grupo];
    const medir = () =>
      page.evaluate(
        ({ seletor, props, pseudo }) => {
          const el = document.querySelector(seletor);
          if (!el) return null;
          const cs = getComputedStyle(el, pseudo || undefined);
          const saida = {};
          for (const p of props) saida[p] = cs[p];
          const r = el.getBoundingClientRect();
          saida['_caixa'] = `${Math.round(r.width)}x${Math.round(r.height)}`;
          return saida;
        },
        { seletor: alvo.seletor, props, pseudo: alvo.pseudo }
      );

    const repouso = await medir();
    if (!repouso) {
      console.error(`AUSENTE  ${vp.nome.padEnd(8)} ${alvo.grupo}/${alvo.nome}`);
      continue;
    }

    let hover = null;
    if (alvo.hover) {
      try {
        await page.hover(alvo.seletor, { timeout: 2000 });
        await page.waitForTimeout(400); // o tema anima; sem esperar mede-se o meio
        hover = await medir();
      } catch {
        /* Elemento fora da tela ou coberto: o repouso ja e util sozinho. */
      }
    }

    registros.push({ viewport: vp.nome, grupo: alvo.grupo, nome: alvo.nome, repouso, hover });
  }

  await page.close();
  console.log(`medido: ${vp.nome}`);
}

await navegador.close();

await mkdir('tests', { recursive: true });
await writeFile(SAIDA, JSON.stringify(registros, null, 2));
console.log(`\n${registros.length} medidas -> ${SAIDA}\n`);

const VAZIO = ['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)', 'visible', ''];

for (const grupo of Object.keys(PROPS)) {
  const doGrupo = registros.filter((r) => r.grupo === grupo);
  if (!doGrupo.length) continue;
  console.log(`\n=== ${grupo.toUpperCase()} ===`);
  for (const nome of [...new Set(doGrupo.map((r) => r.nome))]) {
    console.log(`\n  ${nome}`);
    for (const r of doGrupo.filter((x) => x.nome === nome)) {
      const linha = PROPS[grupo]
        .filter((p) => r.repouso[p] && !VAZIO.includes(r.repouso[p]))
        .map((p) => `${p}=${r.repouso[p]}`)
        .join('  ');
      console.log(`    ${r.viewport.padEnd(8)} ${r.repouso._caixa.padEnd(12)} ${linha}`);
      if (r.hover) {
        const delta = PROPS[grupo]
          .filter((p) => r.hover[p] !== r.repouso[p])
          .map((p) => `${p}: ${r.repouso[p]} -> ${r.hover[p]}`);
        console.log(`    ${''.padEnd(8)} hover        ${delta.length ? delta.join('  ') : '(sem mudanca)'}`);
      }
    }
  }
}
