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
 *
 * ELA JA MUDOU DUAS VEZES, E PELO MESMO MOTIVO: a pagina de referencia migrou.
 * Era `/historia.html` ate a Etapa 5 e `/resorts-brasil.html` ate a Etapa 8.
 * Agora e `/ebook.html`, escolhida de proposito por ser a ULTIMA a migrar no
 * plano (Etapa 10) — a home sai na 9. Ao migrar uma pagina, confira se ela nao
 * era a referencia de algum teste: a Etapa 5 descobriu isso depois, com metade
 * das checagens testando a camada nova achando que testava a antiga.
 */
const PAGINA_TEMA = '/ebook.html';
const PAGINA_SISTEMA = '/historia.html';

const CAMADAS = [
  {
    nome: 'tema',
    pagina: PAGINA_TEMA,
    gatilhoIdioma: '.p-dropdown > a',
    /* O tema deixa os 11 itens do menu mobile visiveis de uma vez: os submenus
       nascem abertos e nao ha o que acionar. */
    submenuNasceAberto: true,
    traducoes: ['/en-us/ebook', '/es-es/ebook'],
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

/* 3. Hero: o zoom e as legendas ------------------------------------------ */
/*
 * A HOME MIGROU NA ETAPA 9, e com ela o hero inteiro. O que este bloco testava
 * antes — `.kenburns-bg` montado por JavaScript a partir de um `style=` inline —
 * simplesmente nao existe mais: o <Hero> e uma <Imagem> com `animation` de CSS.
 *
 * O que continua valendo e a PERGUNTA, e ela e a mesma de sempre: montado nao e
 * o mesmo que visivel, e visivel nao e o mesmo que animando. No tema a camada
 * tinha `z-index: -1` e sumia atras do fundo do proprio slide quando o flickity
 * saiu — a classe continuava aplicada, a altura da pagina nao mudava, e o zoom
 * simplesmente nao acontecia. Aqui olhamos os pixels, como antes.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`);
  await page.waitForSelector('.hero .foto');

  const foto = await page.evaluate(() => {
    const img = document.querySelector('.hero .foto');
    if (!img) return { existe: false };
    return {
      existe: true,
      carregou: img.complete && img.naturalWidth > 0,
      // O hero e a primeira imagem da pagina: lazy aqui atrasa o maior pixel.
      ansiosa: img.getAttribute('loading') !== 'lazy',
      anima: getComputedStyle(img).animationName !== 'none',
    };
  });
  check(
    'hero: foto carregada, sem lazy e com animacao',
    foto.existe && foto.carregou && foto.ansiosa && foto.anima,
    JSON.stringify(foto)
  );

  await page.addStyleTag({ content: '.hero .legendas { visibility: hidden !important; }' });
  const quadro = async () => PNG.sync.read(await page.locator('.hero').screenshot());
  const q1 = await quadro();
  await page.waitForTimeout(1500);
  const q2 = await quadro();
  let soma = 0, n = 0;
  for (let i = 0; i < Math.min(q1.data.length, q2.data.length); i += 4) {
    soma += Math.abs(q1.data[i] - q2.data[i]);
    n++;
  }
  const media = soma / n;
  check('hero: o zoom realmente acontece', media > 1,
    `variacao media de ${media.toFixed(2)}/255 no canal R em 1,5 s`);

  // A cascata termina em 1,7s + 600ms; 3,2s cobre com folga.
  await page.waitForTimeout(3200);
  const legendas = await page.evaluate(() =>
    [...document.querySelectorAll('.hero .legendas > *')].map((el) => Number(getComputedStyle(el).opacity)));
  check('hero: legendas visiveis depois da cascata',
    legendas.length > 0 && legendas.every((o) => o === 1), `opacidades=[${legendas.join(', ')}]`);
  await page.close();
}

/* 3b. Hero sem animacao: a falha aponta para o lado seguro ---------------- */
/*
 * A PROMESSA CENTRAL DO <Hero>, e ela merece um teste proprio porque o defeito
 * que ela evita ja aconteceu duas vezes neste projeto — `.grid-loaded` deixou
 * seis paginas invisiveis, e as legendas do tema nasciam com `opacity: 0`
 * esperando um `setTimeout`.
 *
 * Aqui a cascata e uma animacao de CSS com `animation-fill-mode: both`, entao o
 * quadro inicial vale durante o atraso e o final permanece depois. Com
 * `prefers-reduced-motion`, o base.css zera duracao E atraso: o texto tem de
 * aparecer NA HORA, e nao sumir.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${BASE}/`);
  await page.waitForSelector('.hero .legendas');
  const legendas = await page.evaluate(() =>
    [...document.querySelectorAll('.hero .legendas > *')].map((el) => Number(getComputedStyle(el).opacity)));
  check('hero: sem animacao, as legendas aparecem mesmo assim',
    legendas.length > 0 && legendas.every((o) => o === 1), `opacidades=[${legendas.join(', ')}]`);
  await page.close();
}

/* 4. Carrossel de logos: visivel e andando ------------------------------- */
/*
 * ESTE BLOCO PASSOU MESES APROVANDO UM CARROSSEL INVISIVEL, e a licao esta na
 * diferenca entre as duas versoes.
 *
 * A antiga comparava o `src` do primeiro `.polo-carousel-item` antes e depois de
 * oito segundos. O JavaScript do tema reciclava a fila — tirava o primeiro filho
 * e o punha no fim — dentro de um elemento com `opacity: 0` e
 * `visibility: hidden`, herdados de `.carousel` no style.css: so
 * `.carousel-loaded` devolvia as duas, e quem a punha era o init do flickity, que
 * saiu com o jQuery. O `src` mudava, o teste passava, e as tres homes baixavam 70
 * logotipos para nao mostrar nenhum.
 *
 * A nova pergunta as duas coisas separadamente, e nessa ordem: ESTA VISIVEL, e
 * SE MOVE NA TELA. A segunda mede a posicao da caixa, e nao o conteudo do DOM —
 * `getBoundingClientRect` ja inclui o `transform` do ancestral, entao ela nao tem
 * como passar num elemento parado.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`);
  await page.waitForSelector('.trilho > .celula');

  const visivel = await page.evaluate(() => {
    const trilho = document.querySelector('.trilho');
    const cs = getComputedStyle(trilho);
    return {
      // A checagem exata que teria pego o carrossel do tema.
      renderizado: trilho.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
      opacity: cs.opacity,
      visibility: cs.visibility,
    };
  });
  check('carrossel: a faixa esta visivel', visivel.renderizado, JSON.stringify(visivel));

  const posicao = () => page.evaluate(() =>
    document.querySelector('.trilho > .celula').getBoundingClientRect().left);
  const antes = await posicao();
  await page.waitForTimeout(1500);
  const depois = await posicao();
  check('carrossel: a faixa anda', Math.abs(depois - antes) > 2,
    `${antes.toFixed(1)}px -> ${depois.toFixed(1)}px em 1,5 s`);

  /*
   * A volta so fecha sem emenda se as duas metades forem iguais em NUMERO: a
   * animacao desloca `-50%` da propria trilha, e meia trilha e uma fila inteira
   * so quando a fila foi escrita exatamente duas vezes.
   */
  const metades = await page.evaluate(() => ({
    total: document.querySelectorAll('.trilho > .celula').length,
    copias: document.querySelectorAll('.trilho > .celula.copia').length,
    ocultas: document.querySelectorAll('.trilho > .celula.copia[aria-hidden="true"]').length,
  }));
  check('carrossel: a fila esta escrita duas vezes, e a segunda e oculta',
    metades.total > 0 && metades.copias * 2 === metades.total && metades.ocultas === metades.copias,
    JSON.stringify(metades));
  await page.close();
}

/* 4b. Geometria das celulas do carrossel --------------------------------- */
/*
 * A escada de colunas agora e uma container query, entao ela responde a largura
 * do PAI e nao a da janela. As tres larguras abaixo sao viewports so porque o
 * container da faixa acompanha o <Container> da pagina — o que a checagem afirma
 * e a relacao: celula = largura do container / colunas, e quadrada.
 *
 * O diff visual esconde o carrossel (a posicao depende do instante da captura),
 * entao esta e a unica cobertura que a formula tem.
 */
{
  // largura da janela -> colunas esperadas, pelos degraus de 30rem e 48rem.
  const casos = [[390, 2], [768, 3], [1440, 6]];
  const erros = [];
  for (const [width, colunas] of casos) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/`);
    await page.waitForSelector('.trilho > .celula');
    const m = await page.evaluate(() => {
      const trilho = document.querySelector('.trilho');
      const caixa = trilho.parentElement.parentElement;
      const cel = trilho.querySelector('.celula').getBoundingClientRect();
      return {
        container: caixa.getBoundingClientRect().width,
        largura: cel.width,
        altura: cel.height,
        colunas: Number(getComputedStyle(trilho).getPropertyValue('--colunas')),
      };
    });
    const esperado = m.container / colunas;
    if (m.colunas !== colunas) {
      erros.push(`${width}px: --colunas=${m.colunas}, esperado ${colunas}`);
    }
    if (Math.abs(m.largura - esperado) > 1) {
      erros.push(`${width}px: celula ${m.largura.toFixed(1)}, esperado ${esperado.toFixed(1)} (${colunas} col)`);
    }
    if (Math.abs(m.altura - m.largura) > 1) {
      erros.push(`${width}px: celula nao e quadrada (${m.largura.toFixed(1)}x${m.altura.toFixed(1)})`);
    }
    await page.close();
  }
  check('carrossel: geometria das celulas', erros.length === 0, erros.join('; ') || '3 larguras conferem');
}

/* 4c. Carrossel sem animacao: a fila continua alcancavel ----------------- */
/*
 * O outro lado do `prefers-reduced-motion`, e ele nao e simetrico ao do hero.
 *
 * A regra generica do base.css zera a duracao e poe `animation-iteration-count:
 * 1`, o que faria a animacao SALTAR para o quadro final — `translateX(-50%)`, a
 * segunda volta — e parar ali. O componente desliga o nome da animacao, esconde a
 * duplicata e troca o recorte por rolagem, senao os logotipos alem da primeira
 * tela ficariam inalcancaveis por qualquer meio.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${BASE}/`);
  await page.waitForSelector('.trilho > .celula');
  const m = await page.evaluate(() => {
    const trilho = document.querySelector('.trilho');
    const janela = trilho.parentElement;
    return {
      animacao: getComputedStyle(trilho).animationName,
      transform: getComputedStyle(trilho).transform,
      rolavel: janela.scrollWidth > janela.clientWidth + 1 && getComputedStyle(janela).overflowX === 'auto',
      copiasVisiveis: [...document.querySelectorAll('.trilho > .celula.copia')]
        .filter((el) => el.checkVisibility()).length,
    };
  });
  check('carrossel: sem animacao, a faixa para no inicio e vira lista rolavel',
    m.animacao === 'none' &&
      (m.transform === 'none' || m.transform === 'matrix(1, 0, 0, 1, 0, 0)') &&
      m.rolavel && m.copiasVisiveis === 0,
    JSON.stringify(m));
  await page.close();
}

/* 5. Contadores ---------------------------------------------------------- */
/*
 * A pagina migrou na Etapa 8, e com ela o markup: o `<span data-to>` VAZIO do
 * tema virou `<span data-contador data-ate>` com o valor final ja escrito
 * dentro. A diferenca e o que este teste passa a cobrir em duas partes.
 *
 * A PRIMEIRA E MAIS IMPORTANTE QUE A SEGUNDA: o numero tem de estar no HTML
 * SERVIDO, antes de qualquer JavaScript. No tema ele nao estava, e a secao
 * inteira — que existe para dizer cinco numeros — mostrava cinco rotulos vazios
 * para quem chegasse sem script.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  /* Sem JavaScript: e a unica forma de afirmar que o valor esta no HTML e nao
     foi escrito pela animacao logo depois do carregamento. */
  const semJs = await browser.newContext({ javaScriptEnabled: false });
  const pagina = await semJs.newPage();
  await pagina.goto(`${BASE}/associados.html`);
  const estaticos = await pagina.evaluate(() =>
    [...document.querySelectorAll('[data-contador]')].map((el) => ({
      texto: el.textContent.trim(),
      ate: el.getAttribute('data-ate'),
    })));
  await semJs.close();
  check('numero do contador esta no HTML, sem JavaScript',
    estaticos.length === 5 && estaticos.every((v) => v.texto === v.ate),
    estaticos.map((v) => `"${v.texto}"`).join(' ') || 'nenhum contador encontrado');

  await page.goto(`${BASE}/associados.html`);
  await page.evaluate(() => document.querySelector('[data-contador]').scrollIntoView());
  await page.waitForTimeout(1200);
  const valores = await page.evaluate(() =>
    [...document.querySelectorAll('[data-contador]')].map((el) => ({
      texto: el.textContent.trim(),
      ate: el.getAttribute('data-ate'),
    })));
  check('contadores chegam ao alvo', valores.every((v) => v.texto === v.ate),
    valores.map((v) => `"${v.texto}"`).join(' '));

  /*
   * OS TRES IDIOMAS DIZEM O MESMO NUMERO. Era 83 em portugues e 80 em ingles e
   * espanhol — tres arquivos de markup, dois valores para o mesmo fato. Agora
   * vem todos de `src/data/associados.ts`, e este teste e o que impede a
   * divergencia de voltar por outro caminho.
   */
  const porIdioma = {};
  for (const [nome, caminho] of Object.entries({
    'pt-br': '/associados.html',
    'en-us': '/en-us/associates.html',
    'es-es': '/es-es/asociados.html',
  })) {
    await page.goto(BASE + caminho);
    porIdioma[nome] = await page.evaluate(() =>
      [...document.querySelectorAll('[data-contador]')].map((el) => el.getAttribute('data-ate')).join(','));
  }
  const distintos = new Set(Object.values(porIdioma));
  check('os cinco indicadores batem nos tres idiomas', distintos.size === 1,
    distintos.size === 1 ? porIdioma['pt-br'] : JSON.stringify(porIdioma));
  await page.close();
}

/* 6. Abas ---------------------------------------------------------------- */
/*
 * Markup novo, e o teste mede o que o padrao ARIA pede em vez das classes do
 * Bootstrap: a aba e `<button role="tab">`, o painel inativo recebe `hidden` de
 * verdade, e as setas navegam pela tabulacao rotativa.
 *
 * `hidden` e nao uma classe importa alem do cosmetico: conteudo escondido por
 * classe continua no sumario do leitor de tela e continua encontravel pela busca
 * da pagina — a pessoa "acha" um resort que nao esta na tela.
 */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/associados.html`);

  const inicial = await page.evaluate(() => ({
    aba: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    visiveis: [...document.querySelectorAll('[role="tabpanel"]')].filter((p) => !p.hidden).length,
  }));

  await page.click('#aba-sul');
  await page.waitForTimeout(200);
  const depois = await page.evaluate(() => ({
    aba: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    painel: document.querySelector('#painel-sul')?.hidden === false,
    sudesteEscondido: document.querySelector('#painel-sudeste')?.hidden === true,
    alcancavel: document.querySelector('#painel-sul a')?.getBoundingClientRect().height > 0,
  }));
  check('abas trocam e o painel inativo recebe hidden',
    inicial.aba === 'aba-sudeste' && inicial.visiveis === 1 && depois.aba === 'aba-sul' &&
      depois.painel && depois.sudesteEscondido && depois.alcancavel,
    `${inicial.aba} -> ${depois.aba}, 1 painel visivel=${inicial.visiveis === 1}`);

  /* Tabulacao rotativa: so a aba selecionada esta na ordem de tabulacao, e a
     seta move o foco e a selecao juntos. E o que o `tabs()` do site.js fazia. */
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const seta = await page.evaluate(() => ({
    foco: document.activeElement?.id,
    selecionada: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    naOrdem: [...document.querySelectorAll('[role="tab"]')].filter((t) => t.tabIndex !== -1).length,
  }));
  check('seta navega entre abas com tabulacao rotativa',
    seta.foco === 'aba-norte' && seta.selecionada === 'aba-norte' && seta.naOrdem === 1,
    `foco=${seta.foco}, na ordem=${seta.naOrdem}`);
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
/*
 * NAS DUAS CAMADAS, e aqui a razao e mais forte que no cromo: sao dois
 * COMPONENTES diferentes, e nao um markup so dirigido pelo mesmo script.
 *
 * O <YouTube> do tema tem o CSS em `public/css/ajustes.css`, folha que pagina
 * migrada nao carrega — entao a Etapa 8 precisou de um <Video> proprio, com
 * `<style>` escopado. Duas implementacoes da mesma promessa de privacidade e da
 * mesma caixa; se uma quebrar, e aqui que tem de aparecer.
 *
 * A CAIXA E O UNICO EIXO EM QUE ELAS DIVERGEM DE PROPOSITO. O tema fixa
 * `height: 420px`, a altura que o `<iframe>` original rendia; o sistema usa
 * `aspect-ratio: 16/9`, que e a proporcao real do video e some com a tarja preta
 * em cima e embaixo. Por isso o alvo de altura e uma funcao da largura, e nao um
 * numero.
 */
for (const alvo of [
  {
    nome: 'tema',
    pagina: PAGINA_TEMA,
    video: 'C-_CoEDJu7o',
    /* 420px fixos, o `style=` inline do <YouTube>. */
    alturaEsperada: () => 420,
  },
  {
    nome: 'sistema',
    pagina: '/resorts-brasil.html',
    video: 'LJ_9oUeE4e8',
    /* 16/9 sobre a largura medida, com 1px de folga para o arredondamento. */
    alturaEsperada: (w) => Math.round((w * 9) / 16),
  },
]) {
  const marca = `[${alvo.nome}]`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const yt = [];
  page.on('request', (r) => /youtube|ytimg|googlevideo/i.test(r.url()) && yt.push(new URL(r.url()).host));
  await page.goto(BASE + alvo.pagina);
  await page.waitForTimeout(1500);
  const antes = yt.length;

  const caixa = await page.evaluate(() => {
    const r = document.querySelector('.yt-facade').getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });

  /*
   * O rotulo TEM de estar fora da tela. Ele e texto de verdade para o leitor de
   * tela, e sem o CSS que o esconde ele fica impresso por cima da miniatura —
   * que e exatamente o que aconteceria se a pagina migrada tivesse ficado com o
   * componente do tema. Um teste que so olha requisicao de rede nao veria.
   */
  const rotulo = await page.evaluate(() => {
    const r = document.querySelector('.yt-facade-label').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });

  await page.click('.yt-facade-btn');
  await page.waitForTimeout(1500);
  const depois = await page.evaluate(() => {
    const f = document.querySelector('.yt-facade iframe');
    const r = f?.getBoundingClientRect();
    return { src: f?.src ?? '', h: Math.round(r?.height ?? 0), w: Math.round(r?.width ?? 0) };
  });

  check(`${marca} video nao contata o YouTube antes do clique`, antes === 0,
    antes ? [...new Set(yt)].join(', ') : 'zero requisicoes');
  const esperada = alvo.alturaEsperada(caixa.w);
  check(`${marca} fachada ocupa a caixa esperada`,
    Math.abs(caixa.h - esperada) <= 1 && caixa.w > 400, `${caixa.w}x${caixa.h}, esperado ~${esperada}`);
  check(`${marca} rotulo do leitor de tela fica fora da tela`, rotulo.w <= 1 && rotulo.h <= 1,
    `${rotulo.w}x${rotulo.h}`);
  /*
   * O embed entra NA MESMA CAIXA. E onde o `:global(iframe)` do <Video> se
   * prova: o site.js cria o `<iframe>` com createElement, e elemento criado em
   * tempo de execucao nao recebe o atributo de escopo do Astro — sem o
   * `:global`, a regra de altura nao casaria e o video viria com os 150px
   * padrao. So depois do clique, que e onde nada mais olha.
   */
  check(`${marca} clique carrega o embed sem cookie, na mesma caixa`,
    depois.src.startsWith(`https://www.youtube-nocookie.com/embed/${alvo.video}?`) &&
      depois.src.includes('autoplay=1') &&
      Math.abs(depois.h - caixa.h) <= 1 && depois.w === caixa.w,
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
