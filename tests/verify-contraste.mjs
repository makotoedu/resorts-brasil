/**
 * Contraste do que e RENDERIZADO -- WCAG 1.4.3 nas 41 paginas x viewports.
 *
 * POR QUE ESTE PORTAO EXISTE, e por que os outros quatro nao cobriam.
 *
 * O projeto ja verifica contraste, e verifica bem: cada token de acento carrega
 * o proprio par de texto no tokens.css justamente para que a escolha nao possa
 * divergir do fundo. Mas isso e um checador de PARES DE TOKEN, e ha tres coisas
 * que um par de token nao sabe dizer:
 *
 *   1. TOKEN SOBRE TOKEN QUE NINGUEM DECLAROU COMO PAR. O `.botao` na variante
 *      destaque punha `--color-texto-inverso` sobre `--color-acao-destaque`:
 *      branco sobre ambar, 1,63:1, no CTA das tres homes. O tokens.css
 *      documenta essa exata correcao -- para a <FaixaDestaque>, que usa o par
 *      `acento-ambar`/`-texto`. O botao usava dois tokens que nunca foram
 *      declarados juntos, entao nao havia par para conferir.
 *   2. TOKEN SOBRE FOTOGRAFIA. Onze titulos e links brancos sobre foto
 *      reprovavam, de 2,17:1 a 3,50:1. "Branco sobre a areia que calhou de
 *      estar naquele recorte" nao e um par que exista em lugar nenhum.
 *   3. TOKEN SOBRE GRADIENTE DE FOTO. O h2 de 50px da secao de video do e-book
 *      caia sobre o facho ciano da propria imagem de fundo: 1,65:1.
 *
 * A auditoria que originou este arquivo mediu 22 falhas reais. Nenhum dos quatro
 * portoes via uma: a geometria mede caixas e as caixas estavam certas, o
 * orcamento mede bytes, os icones medem contornos, e o diff visual nao e portao.
 *
 * ------------------------------------------------------------------------
 * O METODO, e ele e a parte que vale copiar
 * ------------------------------------------------------------------------
 *
 * Duas capturas por pagina seriam o obvio: a normal e a comparacao. Nao e isso.
 * E UMA captura, com TODO O TEXTO EM `color: transparent` -- a "chapa de fundo".
 * E nela que se amostra.
 *
 * A PRIMEIRA VERSAO AMOSTRAVA A CAPTURA NORMAL E ESTAVA ERRADA, de um jeito que
 * passa despercebido: o pixel mais desfavoravel dentro da caixa de uma linha de
 * texto quase sempre e o ANTI-ALIASING DO PROPRIO GLIFO. Texto branco sobre
 * fundo escuro tem borda cinza; a borda cinza contra o branco da ~1,8:1; e o
 * script acusava reprovacao em texto perfeitamente legivel. Tentar filtrar os
 * pixels "proximos da cor do texto" nao resolve -- a borda esta justamente no
 * meio do caminho entre as duas cores. Some com o texto e o problema acaba.
 *
 * As caixas vem de `Range.getClientRects()`, e nao de `getBoundingClientRect()`
 * do elemento: aquele da as LINHAS de texto, este da o bloco. Um <p> centrado
 * num container de 960px tem bloco de 960px e linha de 300px -- amostrar o bloco
 * leria 660px de fundo onde nao ha texto nenhum, e num cartao sobre foto isso e
 * a diferenca entre reprovar e nao reprovar.
 *
 * E A CAPTURA E POR BANDA DE ROLAGEM, NAO `fullPage`. Esta e a segunda
 * armadilha, e ela e pior que a do anti-aliasing porque nao parece um erro:
 *
 *   Num screenshot `fullPage` de pagina muito alta, o Chromium monta a imagem
 *   por partes -- e algumas partes voltam EM BRANCO. O PNG tem a altura certa,
 *   nenhum erro e lancado, e o conteudo simplesmente nao esta la.
 *
 * O catalogo /design tem 28.192px no desktop e 44.413px no mobile, e foi ele
 * que denunciou: um botao azul em y=4452 amostrava branco puro, e a suite
 * acusou 920 reprovacoes, quase todas "branco sobre branco". Nao era o site --
 * era a fotografia do site que estava furada.
 *
 * O sintoma engana porque a falha inventada e SEMPRE 1,00:1 contra o branco,
 * que parece exatamente o defeito que a suite procura. Uma pagina de 4.000px
 * passa sem faixa nenhuma; uma de 28.000 volta metade branca. Se este arquivo
 * um dia acusar uma enxurrada de 1,00:1, suspeite da captura antes do CSS.
 *
 * Entao: rola ate cada banda, captura A VIEWPORT (que o Chromium sempre pinta
 * inteira) e amostra so as caixas que caem ali. So as bandas que TEM texto sao
 * visitadas, e dentro de cada uma so o retangulo que contem texto e capturado.
 *
 * ------------------------------------------------------------------------
 * O QUE ELE NAO MEDE
 * ------------------------------------------------------------------------
 *
 * Nao mede contraste de componente nao textual (criterio 1.4.11) -- borda de
 * campo, icone sozinho, estado de foco. Nao mede texto que so existe em hover
 * ou em estado aberto, porque a captura e do repouso; o menu e o submenu do
 * cabecalho continuam sendo trabalho do medir-cromo.mjs.
 *
 * NOTA DE CODIFICACAO: este arquivo e ASCII puro de proposito. A versao com
 * travessoes tipograficos foi corrompida por uma edicao via PowerShell 5.1,
 * cujo `Get-Content` sem `-Encoding` le UTF-8 como ANSI e regrava dobrado. O
 * conteudo aqui nao ganha nada com acentuacao, e ASCII nao tem como quebrar.
 *
 *   node tests/verify-contraste.mjs
 *   PAGES=/index.html VIEWPORTS=desktop node tests/verify-contraste.mjs
 *   DETALHE=1 node tests/verify-contraste.mjs
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { paginasSelecionadas, viewportsSelecionados, CATALOGO } from './paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
/* O catalogo entra na varredura completa: e a unica pagina que mostra cada
   variante de cada componente parada, entao um par de cor novo aparece ali
   antes de aparecer numa pagina de conteudo. */
const PAGINAS = process.env.PAGES ? paginasSelecionadas() : [...paginasSelecionadas(), CATALOGO];
const VIEWPORTS = viewportsSelecionados();

/*
 * A FAIXA DE COOKIES E MEDIDA A PARTE, e a razao e mecanica.
 *
 * Ela e `position: fixed`, e num screenshot de pagina inteira um elemento fixo
 * e desenhado UMA vez, na posicao que ocupa na viewport -- ou seja, no meio da
 * imagem alta, por cima do conteudo que estiver ali. Amostrar aquilo daria o
 * fundo da faixa para o texto da pagina e vice-versa: falso positivo e falso
 * negativo na mesma passada.
 *
 * Entao a passada principal roda COM o consentimento ja gravado (a faixa nem
 * nasce), e uma segunda passada curta roda SEM ele, capturando so a viewport --
 * onde um elemento fixo aparece onde deve. Sem essa segunda passada a faixa
 * ficaria fora de qualquer verificacao de contraste, que e exatamente o buraco
 * que o `.polo-carousel` deixou registrado neste projeto: uma exclusao entra
 * junto com quem cobre o buraco.
 */
const COOKIE_ACEITO = { name: 'rb_consent', value: 'v1|a:0,p:0', url: BASE };
const PAGINA_DA_FAIXA = '/index.html';

/* ------------------------------------------------------------------ *
 * Contraste
 * ------------------------------------------------------------------ */

function luminancia([r, g, b]) {
  const canal = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function razao(a, b) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/*
 * O limiar do criterio 1.4.3, nivel AA: 4,5:1 para texto normal e 3:1 para
 * texto grande -- >=24px, ou >=18,66px quando o peso e 700 ou mais. Os numeros
 * sao em CSS px porque e o que o `getComputedStyle` devolve; a WCAG fala em
 * pontos (18pt e 14pt bold), e a conversao e a padrao de 1,333.
 */
const exigido = (px, peso) => (px >= 24 || (px >= 18.66 && Number(peso) >= 700) ? 3 : 4.5);

/*
 * Composicao de opacidade.
 *
 * Se o texto (ou um ancestral dele) tem `opacity` menor que 1, a cor que chega
 * ao olho nao e a cor computada: e ela misturada com o que esta atras. Ignorar
 * isso subestima a falha.
 */
const compor = (frente, fundo, alfa) =>
  frente.map((c, i) => Math.round(c * alfa + fundo[i] * (1 - alfa)));

/* ------------------------------------------------------------------ *
 * Coleta no navegador
 * ------------------------------------------------------------------ */

/*
 * Devolve uma entrada por elemento que tem texto PROPRIO visivel -- texto de
 * filho pertence ao filho, senao um <div> que embrulha a pagina inteira seria
 * medido contra todos os fundos dela.
 *
 * `escopo` limita a subarvore (a passada da faixa de cookies usa isso).
 */
const COLETAR = (escopo) => {
  const numeros = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const raiz = escopo ? document.querySelector(escopo) : document.body;
  if (!raiz) return [];

  /*
   * TEXTO RECORTADO NAO ESTA NA TELA, e `checkVisibility()` nao ve isso.
   *
   * O menu mobile fechado e o caso: `#mainMenu` tem `height: 0` com
   * `overflow: hidden`, e o `<nav>` de 270px dentro dele continua com display
   * `block`, visibility `visible` e opacidade 1. Os 12 links medem 708x45 cada,
   * `checkVisibility()` responde `true`, e a chapa devolve o que estiver
   * realmente naquele ponto da tela -- que na home e a foto do hero. Resultado:
   * doze reprovacoes de um menu que ninguem esta vendo, em 3 paginas.
   *
   * A regra e geometrica e vale para qualquer recorte: se um ancestral corta
   * (overflow diferente de `visible`), a parte da caixa que cai fora dele nao
   * chega ao olho.
   *
   * Nao basta DESCARTAR o que cai fora: o certo e INTERSECTAR a caixa do texto
   * com a de cada ancestral que corta, comecando pelo proprio elemento. Com
   * isso o mesmo teste resolve dois casos que pareciam diferentes:
   *
   *   menu fechado   a interseccao tem altura zero -> a caixa some;
   *   sr-only        `.yt-facade-label` mede 1x1 com `overflow: hidden`, e o
   *                  texto dentro dele transborda por 300px. O Range devolve os
   *                  300px (ele mede a LINHA, nao a caixa), e sem intersectar o
   *                  texto de leitor de tela entrava na conta como se estivesse
   *                  na tela. Intersectado, sobra 1x1 e o limite de 2px o
   *                  descarta.
   */
  const recortar = (el, caixa) => {
    let { left, top, right, bottom } = caixa;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === 'visible' && cs.clipPath === 'none') continue;
      const r = n.getBoundingClientRect();
      left = Math.max(left, r.left);
      top = Math.max(top, r.top);
      right = Math.min(right, r.right);
      bottom = Math.min(bottom, r.bottom);
      if (right - left < 2 || bottom - top < 2) return null;
    }
    return { left, top, right, bottom };
  };

  /*
   * EMOJI NAO OBEDECE `color`, e por isso sobrevive a chapa.
   *
   * Um emoji colorido e desenhado pela fonte com as cores DELE; `color:
   * transparent` nao o apaga. Se a caixa de uma linha inclui o emoji, o pior
   * pixel amostrado passa a ser o proprio desenho -- foi assim que a hashtag
   * "#ApoieOTurismoBrasileiro" mais coracao apareceu reprovando contra um cinza
   * que nao existe em lugar nenhum do site: era a borda do coracao.
   *
   * A saida e medir so os trechos de TEXTO do no, pulando os emoji. E o
   * resultado certo tambem pela norma: o criterio 1.4.3 fala de texto, e um
   * emoji colorido e, para todo efeito, uma imagem.
   *
   * O seletor de variacao (U+FE0F) e o ZWJ (U+200D) entram por escape numerico:
   * os dois sao invisiveis, e colados aqui seriam indistinguiveis de um erro de
   * digitacao.
   */
  const trechosSemEmoji = (dado) => {
    const P = '\\p{Extended_Pictographic}';
    const re = new RegExp(`(?:${P}(?:\\uFE0F|\\u200D${P})*)+`, 'gu');
    const faixas = [];
    let ultimo = 0;
    for (const m of dado.matchAll(re)) {
      if (m.index > ultimo) faixas.push([ultimo, m.index]);
      ultimo = m.index + m[0].length;
    }
    if (ultimo < dado.length) faixas.push([ultimo, dado.length]);
    return faixas;
  };

  const saida = [];
  for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;

    /*
     * CONTROLE DESABILITADO E ISENTO, e a isencao e da propria norma: o
     * criterio 1.4.3 exclui o texto "que faz parte de um componente de
     * interface inativo". E o unico jeito de um `opacity: 0.45` -- que e o
     * valor do `.botao:disabled` daqui -- nao reprovar por definicao.
     */
    if (el.closest('[disabled], [aria-disabled="true"], fieldset[disabled]')) continue;

    /*
     * `aria-hidden` e uma declaracao de que aquilo NAO E CONTEUDO, e o criterio
     * 1.4.3 nao alcanca decoracao. O caso deste site e o algarismo gigante da
     * 404: 140px na `--color-texto-decorativo`, que o tokens.css descreve como
     * "o unico cinza do site cujo papel e nao ser lido". O texto que informa
     * ("Pagina nao encontrada") esta ao lado, em cor de verdade, e e esse que
     * precisa passar.
     */
    if (el.closest('[aria-hidden="true"]')) continue;

    /* Opacidade acumulada ate a raiz. Zero e conteudo que nao esta na tela. */
    let alfa = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      alfa *= Number(getComputedStyle(n).opacity);
    }
    if (alfa < 0.02) continue;

    const caixas = [];
    for (const no of el.childNodes) {
      if (no.nodeType !== 3 || !no.textContent.trim()) continue;
      for (const [ini, fim] of trechosSemEmoji(no.data)) {
        if (!no.data.slice(ini, fim).trim()) continue;
        const intervalo = document.createRange();
        intervalo.setStart(no, ini);
        intervalo.setEnd(no, fim);
        for (const b of intervalo.getClientRects()) {
          /* Caixa degenerada, e tambem o sr-only de `clip-path: inset(50%)`,
             que mede 1x1. */
          if (b.width < 2 || b.height < 2) continue;
          /* Fora da tela -- o `.skip-link` vive em `left: -9999px` ate o foco. */
          if (b.x + scrollX < -100 || b.y + scrollY < -100) continue;
          const c = recortar(el, b);
          if (!c) continue;
          caixas.push({
            x: c.left + scrollX,
            y: c.top + scrollY,
            w: c.right - c.left,
            h: c.bottom - c.top,
          });
        }
      }
    }
    if (!caixas.length) continue;

    saida.push({
      texto: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 54),
      seletor:
        el.tagName.toLowerCase() +
        (typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : ''),
      cor: numeros(cs.color),
      alfa,
      px: parseFloat(cs.fontSize),
      peso: cs.fontWeight,
      caixas,
    });
  }
  return saida;
};

/*
 * Some com o texto sem mexer no layout. `color` nao participa de layout, entao
 * as caixas coletadas antes continuam validas depois desta injecao.
 *
 * `text-decoration-color` e o contorno entram junto: sublinhado e stroke tambem
 * sao tinta do texto, e um sublinhado sobrevivente seria amostrado como fundo.
 */
const CSS_CHAPA = `*, *::before, *::after {
  color: transparent !important;
  text-shadow: none !important;
  text-decoration-color: transparent !important;
  -webkit-text-stroke-color: transparent !important;
  caret-color: transparent !important;
}`;

/* ------------------------------------------------------------------ *
 * Amostragem da chapa
 * ------------------------------------------------------------------ */

/**
 * O pior contraste dentro de UMA caixa de linha, em coordenadas da chapa.
 *
 * Varre uma grade esparsa em vez de todo pixel: uma linha de texto de 600x24
 * tem 14 mil pixels, e o fundo atras dela varia devagar. 30 colunas x 6 linhas
 * por caixa acham o gradiente e a foto sem custar a varredura inteira.
 */
function piorNaCaixa(item, caixa, chapa) {
  const { dados, largura, altura, canais } = chapa;
  let pior = Infinity;
  let fundoPior = null;

  const x0 = Math.max(0, Math.round(caixa.x));
  const y0 = Math.max(0, Math.round(caixa.y));
  const w = Math.min(Math.round(caixa.x + caixa.w), largura) - x0;
  const h = Math.min(Math.round(caixa.y + caixa.h), altura) - y0;
  if (w < 2 || h < 2) return { pior, fundoPior };

  const passoX = Math.max(1, Math.floor(w / 30));
  const passoY = Math.max(1, Math.floor(h / 6));
  for (let y = y0; y < y0 + h; y += passoY) {
    for (let x = x0; x < x0 + w; x += passoX) {
      const i = (y * largura + x) * canais;
      const fundo = [dados[i], dados[i + 1], dados[i + 2]];
      /* A cor que chega ao olho, e nao a declarada. Ver `compor`. */
      const frente = item.alfa < 1 ? compor(item.cor, fundo, item.alfa) : item.cor;
      const r = razao(frente, fundo);
      if (r < pior) {
        pior = r;
        fundoPior = fundo;
      }
    }
  }
  return { pior, fundoPior };
}

/* ------------------------------------------------------------------ */

const falhas = [];
let medidos = 0;

const registrar = (pagina, vp, item, resultado, minimo) => {
  falhas.push({
    pagina,
    vp,
    seletor: item.seletor,
    texto: item.texto,
    px: Math.round(item.px),
    peso: item.peso,
    /*
     * A cor EFETIVA, e nao a declarada. Com `opacity` no caminho as duas
     * divergem, e imprimir a declarada produz uma linha impossivel de conferir
     * a mao -- "rgb(34,80,252) sobre branco = 2,09:1" faz quem le duvidar do
     * script, quando a conta esta certa e o que falta e a opacidade.
     */
    cor: item.alfa < 1 ? compor(item.cor, resultado.fundoPior, item.alfa) : item.cor,
    opacidade: item.alfa < 1 ? item.alfa.toFixed(2) : null,
    fundo: resultado.fundoPior,
    razao: resultado.pior,
    minimo,
  });
};

async function medirPagina(page, caminho, vpNome, alturaVp, larguraVp, { escopo } = {}) {
  const itens = await page.evaluate(COLETAR, escopo || null);
  if (!itens.length) return;

  await page.addStyleTag({ content: CSS_CHAPA });

  /*
   * ELEMENTO FIXO CONTAMINA TODA BANDA, e este e o irmao da armadilha do
   * `fullPage`.
   *
   * Capturando por banda, um `position: fixed` e pintado em TODAS elas, sempre
   * na mesma posicao da viewport. O botao de voltar ao topo deste site e um
   * quadrado de 40x40 com `rgb(0 0 0 / 0.25)`; sobre branco ele da exatamente
   * rgb(191,191,191), e foi esse cinza que apareceu como "fundo" de paragrafos
   * da politica de privacidade, de celulas de tabela e ate do corpo da faixa
   * verde -- 60 reprovacoes inventadas em 34 paginas, todas no mobile, que e
   * onde ha bandas suficientes para o botao aparecer.
   *
   * Some com eles aqui. Nao e perda de cobertura: o unico elemento fixo com
   * texto e a faixa de cookies, que ja tem passada propria por causa da mesma
   * mecanica.
   */
  if (!escopo) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        if (getComputedStyle(el).position === 'fixed') el.style.visibility = 'hidden';
      }
    });
  }

  await page.waitForTimeout(120);

  /*
   * Cada caixa entra na banda (ou nas duas) em que aparece. Uma linha que cruza
   * a dobra e amostrada nas duas metades, e o pior das duas vale -- que e o
   * resultado certo, nao uma aproximacao.
   */
  const bandas = new Map();
  for (const item of itens) {
    for (const caixa of item.caixas) {
      const primeira = Math.max(0, Math.floor(caixa.y / alturaVp));
      const ultima = Math.floor((caixa.y + caixa.h) / alturaVp);
      for (let b = primeira; b <= ultima; b++) {
        if (!bandas.has(b)) bandas.set(b, []);
        bandas.get(b).push({ item, caixa });
      }
    }
  }

  const piores = new Map();
  for (const banda of [...bandas.keys()].sort((a, b) => a - b)) {
    /* `scrollTo` satura no fim da pagina, entao a posicao REAL e lida de volta.
       Usar a pedida deslocaria todas as caixas da ultima banda. */
    const topo = await page.evaluate((y) => {
      window.scrollTo(0, y);
      return window.scrollY;
    }, banda * alturaVp);
    await page.waitForTimeout(50);

    const entradas = bandas.get(banda);

    /*
     * Captura so o retangulo que contem texto nesta banda. Numa pagina com
     * muito respiro isso e uma fracao da viewport, e o custo de PNG cai junto.
     */
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const { caixa } of entradas) {
      x1 = Math.min(x1, caixa.x);
      y1 = Math.min(y1, caixa.y - topo);
      x2 = Math.max(x2, caixa.x + caixa.w);
      y2 = Math.max(y2, caixa.y - topo + caixa.h);
    }
    const clip = {
      x: Math.max(0, Math.floor(x1)),
      y: Math.max(0, Math.floor(y1)),
      width: 0,
      height: 0,
    };
    clip.width = Math.min(Math.ceil(x2), larguraVp) - clip.x;
    clip.height = Math.min(Math.ceil(y2), alturaVp) - clip.y;
    if (clip.width < 2 || clip.height < 2) continue;

    const png = await page.screenshot({ clip });
    const meta = await sharp(png).metadata();
    const dados = await sharp(png).ensureAlpha().raw().toBuffer();
    const chapa = { dados, largura: meta.width, altura: meta.height, canais: 4 };

    for (const { item, caixa } of entradas) {
      /* Do documento para a viewport, e da viewport para o recorte. */
      const local = {
        x: caixa.x - clip.x,
        y: caixa.y - topo - clip.y,
        w: caixa.w,
        h: caixa.h,
      };
      if (local.y + local.h < 0 || local.y > chapa.altura) continue;
      if (local.x + local.w < 0 || local.x > chapa.largura) continue;
      const r = piorNaCaixa(item, local, chapa);
      if (r.pior === Infinity) continue;
      const atual = piores.get(item);
      if (!atual || r.pior < atual.pior) piores.set(item, r);
    }
  }

  for (const [item, resultado] of piores) {
    medidos += 1;
    const minimo = exigido(item.px, item.peso);
    if (resultado.pior < minimo) registrar(caminho, vpNome, item, resultado, minimo);
  }
}

/* ------------------------------------------------------------------ */

const navegador = await chromium.launch();

for (const vp of VIEWPORTS) {
  /*
   * `reducedMotion: 'reduce'` NAO e economia de tempo, e determinismo.
   *
   * O <Hero> tem tres animacoes de entrada escalonadas em 1s, 1,35s e 1,7s, com
   * `animation-fill-mode: both` -- o primeiro quadro e transparente. Capturar
   * antes do fim mediria opacidade parcial e acusaria falha que nao existe;
   * capturar "depois de esperar o bastante" e uma aposta. Com movimento
   * reduzido o base.css zera duracao E atraso (ver o comentario dele sobre por
   * que o delay entra junto), e o conteudo esta no estado final desde o
   * primeiro quadro.
   */
  const ctx = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  await ctx.addCookies([COOKIE_ACEITO]);

  for (const caminho of PAGINAS) {
    const page = await ctx.newPage();
    const resposta = await page.goto(BASE + caminho, { waitUntil: 'networkidle' });
    if (!resposta || !resposta.ok()) {
      console.error(`  ${caminho} ${vp.nome}: HTTP ${resposta ? resposta.status() : 'sem resposta'}`);
      await page.close();
      continue;
    }

    /* Mesma rolagem da suite de geometria, e pelo mesmo motivo: `loading="lazy"`
       so resolve quando a imagem entra na viewport, e uma foto que nao carregou
       nao e o fundo que o texto tera. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(200);

    await medirPagina(page, caminho, vp.nome, vp.height, vp.width);
    await page.close();
  }

  /* A faixa de cookies, sem consentimento e so na viewport. Ver a nota do topo. */
  const ctxFaixa = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  const pageFaixa = await ctxFaixa.newPage();
  await pageFaixa.goto(BASE + PAGINA_DA_FAIXA, { waitUntil: 'networkidle' });
  await pageFaixa.waitForTimeout(400);
  await medirPagina(
    pageFaixa,
    `${PAGINA_DA_FAIXA} (faixa de cookies)`,
    vp.nome,
    vp.height,
    vp.width,
    { escopo: '.cookie-notify' }
  );
  await ctxFaixa.close();

  await ctx.close();
  console.log(`varrido: ${vp.nome}`);
}

await navegador.close();

/* ------------------------------------------------------------------ */

console.log(`\n${medidos} trechos de texto medidos\n`);

if (!falhas.length) {
  console.log('  ok -- todo texto renderizado passa no criterio 1.4.3 da WCAG');
  process.exit(0);
}

/*
 * Agrupa por seletor + cor: uma variante de componente errada aparece em 41
 * paginas x 3 viewports, e listar 123 linhas iguais esconde a segunda causa.
 * A pior ocorrencia representa o grupo -- e ela que precisa subir.
 */
const grupos = new Map();
for (const f of falhas) {
  const chave = `${f.seletor}|${f.cor}|${f.minimo}`;
  const atual = grupos.get(chave);
  if (!atual) {
    grupos.set(chave, { pior: f, n: 1, paginas: new Set([f.pagina]) });
  } else {
    atual.n += 1;
    atual.paginas.add(f.pagina);
    if (f.razao < atual.pior.razao) atual.pior = f;
  }
}

const limite = process.env.DETALHE ? 999 : 20;
const ordenados = [...grupos.values()].sort((a, b) => a.pior.razao - b.pior.razao);

for (const g of ordenados.slice(0, limite)) {
  const f = g.pior;
  console.log(
    `  ${f.razao.toFixed(2).padStart(5)}:1  (min ${f.minimo})  ${String(f.px).padStart(3)}px/${f.peso}  ${g.n}x em ${g.paginas.size} pagina(s)`
  );
  console.log(
    `     ${f.seletor}  rgb(${f.cor}) sobre rgb(${f.fundo})${f.opacidade ? `  (opacity ${f.opacidade})` : ''}`
  );
  console.log(`     ${f.vp} ${f.pagina} -- "${f.texto}"`);
}
if (ordenados.length > limite) console.log(`  ... e mais ${ordenados.length - limite} grupo(s) (DETALHE=1)`);

console.error(
  `\ncontraste reprovou: ${falhas.length} ocorrencia(s) em ${new Set(falhas.map((f) => f.pagina)).size} pagina(s), ${ordenados.length} causa(s) distinta(s).`
);
process.exit(1);
