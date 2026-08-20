import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:4330';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'OK   ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();

/* 1. Menu mobile ------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/historia.html`);
  await page.click('#mainMenu-trigger a');
  await page.waitForTimeout(700);
  const open = await page.evaluate(() => ({
    body: document.body.classList.contains('mainMenu-open'),
    trigger: document.querySelector('#mainMenu-trigger a').classList.contains('toggle-active'),
    animate: document.querySelector('#mainMenu').classList.contains('menu-animate'),
    minHeight: parseInt(getComputedStyle(document.querySelector('#mainMenu')).minHeight),
    navVisible: document.querySelector('#mainMenu nav a').getBoundingClientRect().height > 0,
  }));
  check('menu mobile abre', open.body && open.trigger && open.animate && open.minHeight > 100 && open.navVisible,
    `minHeight=${open.minHeight}px, nav visivel=${open.navVisible}`);

  await page.click('#mainMenu-trigger a');
  await page.waitForTimeout(700);
  const closed = await page.evaluate(() => !document.body.classList.contains('mainMenu-open'));
  check('menu mobile fecha', closed);

  const submenu = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#mainMenu .dropdown-menu')).display);
  check('submenu expandido no mobile', submenu === 'block', `display=${submenu}`);
  await page.close();
}

/* 2. Seletor de idioma -------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/historia.html`);
  await page.click('.p-dropdown > a');
  // O CSS do tema usa transition: all 0.2s; medir antes disso pega o valor
  // interpolado no meio da animacao, nao o estado final.
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const link = document.querySelector('.p-dropdown-content a');
    const rect = link.getBoundingClientRect();
    return {
      active: document.querySelector('.p-dropdown').classList.contains('dropdown-active'),
      opacity: getComputedStyle(document.querySelector('.p-dropdown-content')).opacity,
      clickable: rect.width > 0 && rect.height > 0,
    };
  });
  check('seletor de idioma abre', state.active && state.opacity === '1' && state.clickable,
    `opacity=${state.opacity}, link clicavel=${state.clickable}`);

  // Abrir nao e ir para o lugar certo. O destino era `url('home', ...)` fixo,
  // entao o seletor abria, ficava clicavel e passava nesta suite enquanto jogava
  // quem estava em /historia na home inglesa. Aqui o teste e do destino.
  const destinos = await page.$$eval('.p-dropdown-content a', (as) =>
    as.map((a) => new URL(a.href).pathname));
  const esperado = ['/en-us/history', '/es-es/historia'];
  check('seletor de idioma leva a traducao DESTA pagina',
    JSON.stringify(destinos) === JSON.stringify(esperado),
    `de /historia -> ${destinos.join(', ')}`);
  await page.close();
}

/* 2b. Seletor de idioma na 404, que nao tem traducao --------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/404.html`);
  const destinos = await page.$$eval('.p-dropdown-content a', (as) =>
    as.map((a) => new URL(a.href).pathname));
  // Sem `route`, o unico destino que existe nos tres idiomas e a home.
  check('seletor de idioma cai na home quando nao ha traducao',
    JSON.stringify(destinos) === JSON.stringify(['/en-us/home', '/es-es/inicio']),
    destinos.join(', '));
  await page.close();
}

/* 3. Hero: kenburns + legendas ------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(300);
  const kb = await page.evaluate(() => {
    const bg = document.querySelector('.slide.kenburns .kenburns-bg');
    return bg
      ? { exists: true, animate: bg.classList.contains('kenburns-bg-animate'), img: !!bg.style.backgroundImage }
      : { exists: false };
  });
  check('kenburns montado', kb.exists && kb.animate && kb.img, JSON.stringify(kb));

  // Montado nao e o mesmo que visivel. A camada tem z-index: -1 e so aparece se
  // o slide for um contexto de empilhamento — no original quem garantia isso
  // era o flickity, posicionando o slide. Sem esse contexto a camada some atras
  // do fundo do proprio slide: a classe continua aplicada, a altura da pagina
  // nao muda, e o zoom simplesmente nao acontece. Aqui olhamos os pixels.
  await page.addStyleTag({ content: '.slide-captions { visibility: hidden !important; }' });
  const quadro = async () => PNG.sync.read(await page.locator('.slide.kenburns').screenshot());
  const q1 = await quadro();
  await page.waitForTimeout(1500);
  const q2 = await quadro();
  let soma = 0, n = 0;
  for (let i = 0; i < Math.min(q1.data.length, q2.data.length); i += 4) {
    soma += Math.abs(q1.data[i] - q2.data[i]);
    n++;
  }
  const media = soma / n;
  check('kenburns realmente amplia', media > 1,
    `variacao media de ${media.toFixed(2)}/255 no canal R em 1,5 s`);

  await page.waitForTimeout(3200);
  const captions = await page.evaluate(() =>
    [...document.querySelectorAll('.inspiro-slider .slide-captions > *')]
      .map((el) => Number(getComputedStyle(el).opacity)));
  check('legendas do hero visiveis', captions.length > 0 && captions.every((o) => o === 1),
    `opacidades=[${captions.join(', ')}]`);
  await page.close();
}

/* 4. Carrossel de logos -------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`);
  // Esperar o embrulho em .polo-carousel-item antes de medir. Comparar o
  // innerHTML do primeiro filho logo apos o goto acusava "avanco" so porque o
  // script tinha acabado de inserir o wrapper — o teste passava com o
  // carrossel parado.
  await page.waitForSelector('.carousel.client-logos > .polo-carousel-item', { state: 'attached' });
  const logo = () => page.evaluate(() =>
    document.querySelector('.carousel.client-logos > .polo-carousel-item img').getAttribute('src'));
  const antes = await logo();
  // O intervalo do tema e 7000ms; a espera precisa passar de uma volta.
  await page.waitForTimeout(8000);
  check('carrossel de logos avanca', antes !== (await logo()));
  await page.close();
}

/* 4b. Geometria das celulas do carrossel --------------------------------- */
// O diff visual esconde o carrossel (a posicao depende do instante), entao a
// formula do flickity fica coberta aqui. Ver o comentario em visual-diff.mjs.
{
  // largura da janela -> colunas, pelas faixas de js/functions.js com
  // data-items="6": xs 1, sm 2, md 3, lg 4, xl 6.
  const casos = [[390, 1], [700, 2], [900, 3], [1100, 4], [1440, 6]];
  const erros = [];
  for (const [width, colunas] of casos) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${BASE}/`);
    await page.waitForSelector('.carousel.client-logos > .polo-carousel-item', { state: 'attached' });
    const m = await page.evaluate(() => {
      const c = document.querySelector('.carousel.client-logos');
      const cs = getComputedStyle(c);
      const util = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const cel = c.querySelector('.polo-carousel-item').getBoundingClientRect();
      return { util, largura: cel.width, altura: cel.height };
    });
    const esperado = (m.util + 10) / colunas;
    if (Math.abs(m.largura - esperado) > 1) {
      erros.push(`${width}px: celula ${m.largura.toFixed(1)}, esperado ${esperado.toFixed(1)} (${colunas} col)`);
    }
    if (Math.abs(m.altura - m.largura) > 1) {
      erros.push(`${width}px: celula nao e quadrada (${m.largura.toFixed(1)}x${m.altura.toFixed(1)})`);
    }
    await page.close();
  }
  check('carrossel: geometria das celulas', erros.length === 0, erros.join('; ') || '5 larguras conferem');
}

/* 5. Contadores ---------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/associados.html`);
  await page.evaluate(() => document.querySelector('[data-to]').scrollIntoView());
  await page.waitForTimeout(1200);
  const values = await page.evaluate(() =>
    [...document.querySelectorAll('[data-to]')].map((el) => ({
      text: el.textContent.trim(),
      to: el.getAttribute('data-to'),
      suffix: el.getAttribute('data-suffix') || '',
    })));
  const ok = values.every((v) => v.text === v.to + v.suffix);
  check('contadores chegam ao alvo', ok, values.map((v) => `"${v.text}"`).join(' '));
  await page.close();
}

/* 6. Abas ---------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/associados.html`);
  const initial = await page.evaluate(() =>
    document.querySelector('.tab-pane.active')?.id);
  await page.click('a[href="#sul"]');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    pane: document.querySelector('.tab-pane.active')?.id,
    display: getComputedStyle(document.querySelector('#sul')).display,
    link: document.querySelector('a[href="#sul"]').classList.contains('active'),
  }));
  check('abas trocam', initial === 'sudeste' && after.pane === 'sul' && after.display === 'block' && after.link,
    `${initial} -> ${after.pane}, display=${after.display}`);
  await page.close();
}

/* 7. Aviso de cookies ---------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/historia.html`);
  await page.waitForTimeout(2600);
  const shown = await page.evaluate(() =>
    document.querySelector('.cookie-notify').classList.contains('modal-active'));
  check('aviso de cookies aparece', shown);

  await page.click('.cookie-notify .modal-confirm');
  await page.waitForTimeout(200);
  const afterAccept = await page.evaluate(() => ({
    hidden: !document.querySelector('.cookie-notify').classList.contains('modal-active'),
    cookie: document.cookie.includes('cookiebar21_cbe'),
  }));
  check('aceitar cookie persiste', afterAccept.hidden && afterAccept.cookie,
    `cookie gravado=${afterAccept.cookie}`);

  await page.reload();
  await page.waitForTimeout(2600);
  const stillHidden = await page.evaluate(() =>
    !document.querySelector('.cookie-notify').classList.contains('modal-active'));
  check('aviso nao reaparece apos aceite', stillHidden);
  await page.close();
}

/* 8. Voltar ao topo ------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/politica-de-privacidade.html`);
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('#scrollTop')).opacity);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('#scrollTop')).opacity);
  await page.click('#scrollTop');
  await page.waitForTimeout(900);
  const scrolled = await page.evaluate(() => window.scrollY);
  check('voltar ao topo', before === '0' && after === '1' && scrolled < 50,
    `opacity ${before}->${after}, scrollY final=${scrolled}`);
  await page.close();
}

/* 9. Erros de console em todas as paginas -------------------------------- */
{
  const pages = ['/', '/historia.html', '/associados.html', '/en-us/home.html', '/es-es/inicio.html', '/ebook.html'];
  const errors = [];
  for (const path of pages) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${path}: ${m.text()}`));
    await page.goto(BASE + path);
    await page.waitForTimeout(1200);
    await page.close();
  }
  const real = errors.filter((e) => !/googletagmanager|gtm\.js|ERR_BLOCKED|net::/i.test(e));
  check('sem erros de JS no console', real.length === 0, real.slice(0, 3).join(' | ') || 'nenhum');
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} verificacoes passaram`);
process.exit(failed.length ? 1 : 0);
