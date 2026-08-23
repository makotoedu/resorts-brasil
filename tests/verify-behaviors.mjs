import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:4330';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'OK   ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();

/*
 * DUAS CAMADAS, DUAS PAGINAS DE REFERENCIA.
 *
 * Ate a Etapa 5 esta suite usava `/historia.html` para tudo — menu, seletor de
 * idioma, cookies, glifos. Aquela pagina migrou, e com ela o cromo inteiro: o
 * gatilho do submenu virou `<button>`, o submenu deixou de nascer aberto no
 * mobile e as webfontes de icone sumiram. Metade das checagens passou a testar a
 * camada nova achando que testava a antiga.
 *
 * Enquanto as duas convivem, o que e cromo roda NAS DUAS. Nao e zelo: os dois
 * cabecalhos sao dirigidos pelo MESMO src/scripts/site.js, atraves dos mesmos
 * nomes de estado, e essa e a aposta que sustenta a migracao inteira. Se ela
 * quebrar de um lado so, e aqui que tem de aparecer.
 *
 * Quando a ultima pagina migrar, `PAGINA_TEMA` some junto com o tema.
 */
const PAGINA_TEMA = '/resorts-brasil.html';
const PAGINA_SISTEMA = '/historia.html';

const CAMADAS = [
  {
    nome: 'tema',
    pagina: PAGINA_TEMA,
    gatilhoIdioma: '.p-dropdown > a',
    /* O tema deixa os 11 itens do menu mobile visiveis de uma vez: os submenus
       nascem abertos e nao ha o que acionar. */
    submenuNasceAberto: true,
    traducoes: ['/en-us/resorts-brasil', '/es-es/resorts-brasil'],
  },
  {
    nome: 'sistema',
    pagina: PAGINA_SISTEMA,
    /* O gatilho virou `<button>`: ele abre um submenu, nao navega. O
       `href="#"` do tema sujava o historico e punha um destino falso na barra
       de status. */
    gatilhoIdioma: '.p-dropdown > button',
    submenuNasceAberto: false,
    traducoes: ['/en-us/history', '/es-es/historia'],
  },
];

/* 1. Menu mobile ------------------------------------------------------- */
for (const camada of CAMADAS) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + camada.pagina);
  await page.click('#mainMenu-trigger a');
  await page.waitForTimeout(700);
  const open = await page.evaluate(() => ({
    body: document.body.classList.contains('mainMenu-open'),
    trigger: document.querySelector('#mainMenu-trigger a').classList.contains('toggle-active'),
    animate: document.querySelector('#mainMenu').classList.contains('menu-animate'),
    minHeight: parseInt(getComputedStyle(document.querySelector('#mainMenu')).minHeight),
    navVisible: document.querySelector('#mainMenu nav a').getBoundingClientRect().height > 0,
  }));
  check(`[${camada.nome}] menu mobile abre`,
    open.body && open.trigger && open.animate && open.minHeight > 100 && open.navVisible,
    `minHeight=${open.minHeight}px, nav visivel=${open.navVisible}`);

  if (camada.submenuNasceAberto) {
    const submenu = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mainMenu .dropdown-menu')).display);
    check(`[${camada.nome}] submenu expandido no mobile`, submenu === 'block', `display=${submenu}`);
  } else {
    /*
     * No sistema o submenu abre no toque, e o `aria-expanded` acompanha. Vale a
     * pena testar os dois juntos: um menu que abre com o atributo mentindo e
     * pior do que um que nao abre, porque so quem usa leitor de tela descobre.
     */
    const antes = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mainMenu .dropdown-menu')).display);
    await page.click('#mainMenu li.dropdown > button');
    await page.waitForTimeout(200);
    const depois = await page.evaluate(() => ({
      display: getComputedStyle(document.querySelector('#mainMenu .dropdown-menu')).display,
      expanded: document.querySelector('#mainMenu li.dropdown > button').getAttribute('aria-expanded'),
      alcancavel: document.querySelector('#mainMenu .dropdown-menu a').getBoundingClientRect().height > 0,
    }));
    check(`[${camada.nome}] submenu abre no toque e anuncia o estado`,
      antes === 'none' && depois.display === 'block' && depois.expanded === 'true' && depois.alcancavel,
      `${antes} -> ${depois.display}, aria-expanded=${depois.expanded}`);
  }

  await page.click('#mainMenu-trigger a');
  await page.waitForTimeout(700);
  const closed = await page.evaluate(() => !document.body.classList.contains('mainMenu-open'));
  check(`[${camada.nome}] menu mobile fecha`, closed);
  await page.close();
}

/* 2. Seletor de idioma -------------------------------------------------- */
for (const camada of CAMADAS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + camada.pagina);
  await page.click(camada.gatilhoIdioma);
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
  check(`[${camada.nome}] seletor de idioma abre`,
    state.active && state.opacity === '1' && state.clickable,
    `opacity=${state.opacity}, link clicavel=${state.clickable}`);

  // Abrir nao e ir para o lugar certo. O destino era `url('home', ...)` fixo,
  // entao o seletor abria, ficava clicavel e passava nesta suite enquanto jogava
  // quem estava em /historia na home inglesa. Aqui o teste e do destino.
  const destinos = await page.$$eval('.p-dropdown-content a', (as) =>
    as.map((a) => new URL(a.href).pathname));
  check(`[${camada.nome}] seletor de idioma leva a traducao DESTA pagina`,
    JSON.stringify(destinos) === JSON.stringify(camada.traducoes),
    `de ${camada.pagina} -> ${destinos.join(', ')}`);
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

/* 7. Consentimento de cookies -------------------------------------------- */
/*
 * A versao anterior destes testes media so o cosmetico — a faixa aparece, some,
 * grava um cookie — e passava enquanto o GTM disparava antes de qualquer escolha
 * e "Recusar" nao recusava nada. O que importa aqui e a REDE: o que sai do
 * navegador antes e depois de cada decisao.
 */
/*
 * A faixa roda nas duas camadas pelo mesmo site.js, atraves dos mesmos
 * `[data-cookie]`. O markup e que e outro — no sistema os botoes sao
 * `<Botao variante="clara-solida">` em vez de `.btn.btn-light`. E exatamente o
 * tipo de coisa que se testa num lado so e se descobre no outro em producao.
 */
for (const camada of CAMADAS) {
  const RASTREIO = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/i;
  const marca = `[${camada.nome}]`;

  /** Abre uma pagina limpa registrando todo request a dominio de rastreamento. */
  const abrir = async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const rastreio = [];
    page.on('request', (r) => RASTREIO.test(r.url()) && rastreio.push(new URL(r.url()).host));
    await page.goto(BASE + camada.pagina);
    await page.waitForTimeout(800);
    return { page, rastreio };
  };

  const lerCookie = (page) =>
    page.evaluate(() => decodeURIComponent(document.cookie.match(/rb_consent=([^;]*)/)?.[1] ?? ''));

  const consentimentos = (page) =>
    page.evaluate(() =>
      (window.dataLayer ?? [])
        .map((e) => (e && typeof e.length === 'number' ? Array.from(e) : e))
        .filter((e) => Array.isArray(e) && e[0] === 'consent')
        .map((e) => [e[1], e[2]])
    );

  /* 7a. Nada sai antes da escolha */
  {
    const { page, rastreio } = await abrir();
    const visivel = await page.evaluate(
      () => !document.querySelector('.cookie-notify').hidden &&
        document.querySelector('.cookie-notify').classList.contains('modal-active')
    );
    const padroes = (await consentimentos(page)).find(([tipo]) => tipo === 'default')?.[1] ?? {};
    check(`${marca} nada e carregado antes da escolha`, rastreio.length === 0,
      rastreio.length ? `vazou para ${[...new Set(rastreio)].join(', ')}` : 'zero requisicoes');
    check(`${marca} faixa de cookies aparece sem atraso`, visivel);
    check(`${marca} Consent Mode v2 nasce negado`,
      padroes.ad_storage === 'denied' && padroes.ad_user_data === 'denied' &&
      padroes.ad_personalization === 'denied' && padroes.analytics_storage === 'denied',
      JSON.stringify(padroes));
    await page.close();
  }

  /* 7b. Rejeitar todos */
  {
    const { page, rastreio } = await abrir();
    await page.click('[data-cookie="rejeitar"]');
    await page.waitForTimeout(1200);
    const cookie = await lerCookie(page);
    const escondida = await page.evaluate(() => document.querySelector('.cookie-notify').hidden);
    check(`${marca} rejeitar nao carrega nada`, rastreio.length === 0 && cookie.startsWith('v1|a:0|p:0'),
      `rede=${rastreio.length} requisicoes, cookie=${cookie.replace(/\|t:\d+/, '')}`);
    check(`${marca} rejeitar esconde a faixa`, escondida);

    await page.reload();
    await page.waitForTimeout(1200);
    const voltou = await page.evaluate(() => !document.querySelector('.cookie-notify').hidden);
    check(`${marca} faixa nao reaparece apos recusa`, !voltou && rastreio.length === 0,
      `rede acumulada=${rastreio.length}`);
    await page.close();
  }

  /* 7c. Aceitar todos */
  {
    const { page, rastreio } = await abrir();
    await page.click('[data-cookie="aceitar"]');
    await page.waitForTimeout(2500);
    const cookie = await lerCookie(page);
    const update = (await consentimentos(page)).find(([tipo]) => tipo === 'update')?.[1] ?? {};
    check(`${marca} aceitar carrega o GTM`, rastreio.some((h) => h.includes('googletagmanager')),
      [...new Set(rastreio)].join(', ') || 'nenhuma requisicao');
    check(`${marca} aceitar grava as duas categorias`, cookie.startsWith('v1|a:1|p:1'),
      cookie.replace(/\|t:\d+/, ''));
    check(`${marca} aceitar libera o Consent Mode`,
      update.analytics_storage === 'granted' && update.ad_storage === 'granted',
      JSON.stringify(update));
    await page.close();
  }

  /* 7d. Painel: so desempenho */
  {
    const { page, rastreio } = await abrir();
    await page.click('[data-cookie="personalizar"]');
    await page.waitForTimeout(200);
    const expandido = await page.getAttribute('[data-cookie="personalizar"]', 'aria-expanded');
    await page.check('[data-cookie-cat="analise"]');
    await page.click('[data-cookie="salvar"]');
    await page.waitForTimeout(2500);
    const cookie = await lerCookie(page);
    const update = (await consentimentos(page)).find(([tipo]) => tipo === 'update')?.[1] ?? {};
    check(`${marca} painel abre e anuncia estado`, expandido === 'true', `aria-expanded=${expandido}`);
    check(`${marca} escolha parcial e respeitada`,
      cookie.startsWith('v1|a:1|p:0') &&
        update.analytics_storage === 'granted' && update.ad_storage === 'denied' &&
        rastreio.some((h) => h.includes('googletagmanager')),
      `cookie=${cookie.replace(/\|t:\d+/, '')}, ad_storage=${update.ad_storage}`);
    await page.close();
  }

  /* 7e. Revogar pelo rodape, e Esc no painel */
  {
    const { page } = await abrir();
    await page.click('[data-cookie="personalizar"]');
    await page.check('[data-cookie-cat="publicidade"]');
    await page.click('[data-cookie="salvar"]');
    await page.waitForTimeout(1000);

    await page.click('.cookie-manage-btn');
    await page.waitForTimeout(300);
    const reaberto = await page.evaluate(() => ({
      faixa: !document.querySelector('.cookie-notify').hidden,
      painel: !document.querySelector('#cookiePrefs').hidden,
      analise: document.querySelector('[data-cookie-cat="analise"]').checked,
      publicidade: document.querySelector('[data-cookie-cat="publicidade"]').checked,
    }));
    check(`${marca} rodape reabre o painel com a escolha salva`,
      reaberto.faixa && reaberto.painel && !reaberto.analise && reaberto.publicidade,
      JSON.stringify(reaberto));

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const aposEsc = await page.evaluate(() => ({
      painel: document.querySelector('#cookiePrefs').hidden,
      faixa: !document.querySelector('.cookie-notify').hidden,
      foco: document.activeElement?.dataset?.cookie,
    }));
    // Esc fecha so o painel: fechar a faixa equivaleria a decidir por quem nao decidiu.
    check(`${marca} Esc fecha o painel e devolve o foco`,
      aposEsc.painel && aposEsc.faixa && aposEsc.foco === 'personalizar',
      JSON.stringify(aposEsc));
    await page.close();
  }
}

/* 7f. Fachada dos videos ------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const yt = [];
  page.on('request', (r) => /youtube|ytimg|googlevideo/i.test(r.url()) && yt.push(new URL(r.url()).host));
  await page.goto(`${BASE}/resorts-brasil.html`);
  await page.waitForTimeout(1500);
  const antes = yt.length;

  const caixa = await page.evaluate(() => {
    const r = document.querySelector('.yt-facade').getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });

  await page.click('.yt-facade-btn');
  await page.waitForTimeout(1500);
  const depois = await page.evaluate(() => {
    const f = document.querySelector('.yt-facade iframe');
    const r = f?.getBoundingClientRect();
    return { src: f?.src ?? '', h: Math.round(r?.height ?? 0), w: Math.round(r?.width ?? 0) };
  });

  check('video nao contata o YouTube antes do clique', antes === 0,
    antes ? [...new Set(yt)].join(', ') : 'zero requisicoes');
  // 420px e a altura que o <iframe> original rendia: o tema tem iframe{width:100%}
  // e o height do atributo. A fachada tem de ocupar a mesma caixa.
  check('fachada ocupa a caixa do iframe original', caixa.h === 420 && caixa.w > 400,
    `${caixa.w}x${caixa.h}`);
  check('clique carrega o embed sem cookie, na mesma caixa',
    depois.src.startsWith('https://www.youtube-nocookie.com/embed/LJ_9oUeE4e8?') &&
      depois.src.includes('autoplay=1') && depois.h === 420 && depois.w === caixa.w,
    `${depois.w}x${depois.h} — ${depois.src}`);
  await page.close();
}

/* 8. Voltar ao topo ------------------------------------------------------ */
/*
 * Nas duas camadas: o site.js escreve `bottom`, `opacity` e `z-index` inline no
 * mesmo `#scrollTop`, mas o estado de REPOUSO vem do CSS, e sao dois CSS
 * diferentes. O do sistema precisa nascer invisivel por conta propria — se
 * nascesse visivel, o botao ficaria parado num canto sem funcao para quem esta
 * sem JavaScript, e nenhum teste de clique veria isso.
 */
for (const { nome, pagina } of [
  { nome: 'tema', pagina: '/politica-de-privacidade.html' },
  { nome: 'sistema', pagina: '/diretoria.html' },
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + pagina);
  // Decide antes: a faixa e `position: fixed` com z-index 999 e cobre o canto do
  // #scrollTop (z-index 199) enquanto esta na tela. Vale no original tambem — la
  // o atraso de 2s so escondia o encontro. Aqui o teste e do voltar ao topo.
  await page.click('[data-cookie="rejeitar"]');
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('#scrollTop')).opacity);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('#scrollTop')).opacity);
  await page.click('#scrollTop');
  await page.waitForTimeout(900);
  const scrolled = await page.evaluate(() => window.scrollY);
  check(`[${nome}] voltar ao topo`, before === '0' && after === '1' && scrolled < 50,
    `opacity ${before}->${after}, scrollY final=${scrolled}`);
  await page.close();
}

/* 9. Glifos das fontes subsetadas ---------------------------------------- */
/*
 * Cobre o buraco que deixou o subset incompleto passar: nada nesta suite
 * verificava fonte, e o diff visual so pegaria as 6 paginas afetadas.
 *
 * O `check-glifos.mjs` do build garante que a LISTA cobre o que o CSS pede;
 * este teste garante que os ARQUIVOS gerados contem mesmo os glifos da lista.
 * Sao coisas diferentes: um pyftsubset com a flag errada passa no primeiro e
 * falha aqui.
 *
 * Metodo: pintar o codepoint num canvas e comparar com um codepoint sabidamente
 * ausente da mesma familia. Glifo que caiu do subset renderiza como tofu, e o
 * tofu e identico para qualquer codepoint ausente — se os bitmaps baterem, o
 * glifo sumiu. Medir largura NAO serve: o tofu ocupa 1em, e varios icones
 * tambem (info-circle e dot-circle dao exatamente os mesmos 100px).
 */
{
  const { readFile } = await import('node:fs/promises');
  const spec = JSON.parse(await readFile(new URL('../scripts/glifos.json', import.meta.url), 'utf8'));

  // Peso do @font-face de cada familia, e um codepoint que o subset nao tem.
  const perfil = {
    'Font Awesome 5 Brands': { peso: 400, controle: 0xf099 },
    'Font Awesome 5 Free (peso 900)': { peso: 900, controle: 0xf007, css: 'Font Awesome 5 Free' },
    'inspiro-icons': { peso: 400, controle: 0xe919 },
  };

  /*
   * PAGINA_TEMA, e nao mais /historia.html. As tres webfontes servem so as
   * paginas nao migradas — o cromo novo desenha SVG inline pelo <Icone>, e a
   * pagina de historia deixou de baixar fonte de icone na Etapa 5. Rodar isto
   * la mediria tofu contra tofu e passaria sempre.
   *
   * A checagem morre junto com as webfontes, na Etapa 11.
   */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + PAGINA_TEMA);

  const alvos = spec.familias.map((f) => {
    const p = perfil[f.familia_css];
    return {
      familia: p.css ?? f.familia_css,
      peso: p.peso,
      controle: p.controle,
      glifos: Object.entries(f.glifos).map(([cp, nome]) => ({
        cp: parseInt(cp.slice(2), 16),
        nome: String(nome).split(' ')[0],
      })),
    };
  });

  const ausentes = await page.evaluate(async (alvos) => {
    const pintar = async (familia, peso, cp) => {
      await document.fonts.load(`${peso} 64px "${familia}"`);
      const c = document.createElement('canvas');
      c.width = c.height = 80;
      const ctx = c.getContext('2d');
      ctx.font = `${peso} 64px "${familia}"`;
      ctx.textBaseline = 'top';
      ctx.fillText(String.fromCodePoint(cp), 8, 8);
      return c.toDataURL();
    };
    const faltando = [];
    for (const alvo of alvos) {
      const tofu = await pintar(alvo.familia, alvo.peso, alvo.controle);
      for (const g of alvo.glifos) {
        if ((await pintar(alvo.familia, alvo.peso, g.cp)) === tofu) faltando.push(`${alvo.familia}/${g.nome}`);
      }
    }
    return faltando;
  }, alvos);

  const total = alvos.reduce((n, a) => n + a.glifos.length, 0);
  check('todos os glifos do subset renderizam', ausentes.length === 0,
    ausentes.length ? `tofu em: ${ausentes.join(', ')}` : `${total} glifos, 3 familias`);
  await page.close();
}

/* 10. Erros de console em todas as paginas ------------------------------- */
{
  // Uma de cada camada, de proposito: o cromo novo traz um <script> proprio
  // (o seletor de idioma), e erro nele so apareceria nas paginas migradas.
  const pages = ['/', PAGINA_TEMA, PAGINA_SISTEMA, '/diretoria.html', '/404.html',
    '/associados.html', '/en-us/home.html', '/en-us/contact-us.html',
    '/es-es/inicio.html', '/es-es/directorio.html', '/ebook.html'];
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
