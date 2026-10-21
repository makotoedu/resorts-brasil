/**
 * Mede o que o DESIGN SYSTEM renderiza -- 40 paginas x 3 viewports.
 *
 * POR QUE ESTE SCRIPT EXISTE, se ja ha seis `medir-*.mjs`. Aqueles mediram o
 * TEMA: miram `.btn`, `.post-item`, `.nav-tabs`, `.call-to-action` -- seletores
 * que sairam do markup com a Etapa 11. Rodados hoje, imprimem quase so AUSENTE
 * e sobrescrevem os JSON da era do tema, que sao o registro do site original.
 * Este mede o sistema que ficou, pelo que ele de fato desenha, sem depender de
 * nome de classe.
 *
 * Nasceu na revisao de design, e o motivo e a regra 2 do CLAUDE.md: valor que
 * vai para o base.css ou para um componente tem de ser medido. A revisao e a
 * primeira etapa em que os valores sao DECIDIDOS em vez de copiados, e decidir
 * sem saber o que esta renderizado e desenhar no escuro. O inventario daqui e o
 * "antes" e o "depois" de cada decisao.
 *
 * O QUE ELE CONTA, por viewport:
 *
 *   tipografia   cada combinacao de familia x tamanho x peso x entrelinha x
 *                tracking x caixa, com quantos elementos e onde. E a pergunta
 *                que nenhum portao fazia: quantas vozes o site tem.
 *   titulos      por nivel (h1..h6), os pares tamanho x peso que aparecem.
 *   linha        quantos caracteres cabem na linha de cada paragrafo de
 *                conteudo, na fonte real -- mesmo metodo do medir-documento.
 *   toque        controles com menos de 44px em algum eixo, no celular. Link
 *                dentro de frase fica de fora: a WCAG 2.5.8 isenta o inline.
 *   raio         os valores de `border-radius` que aparecem, e em que.
 *
 * A coleta de texto e a mesma ideia do `COLETAR` do verify-contraste.mjs: so
 * conta elemento com texto PROPRIO visivel, senao o <div> que embrulha a pagina
 * levaria a tipografia de todos os filhos.
 *
 *   node scripts/medir-sistema.mjs              # precisa do preview no ar
 *   PAGES=/index.html VIEWPORTS=desktop node scripts/medir-sistema.mjs
 *   SAIDA=/tmp/depois.json node scripts/medir-sistema.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { paginasSelecionadas, viewportsSelecionados } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = process.env.SAIDA || 'tests/sistema-medido.json';

/* A faixa de cookies fica de fora da passada principal pelo mesmo motivo do
   verify-contraste: com o consentimento gravado ela nem nasce. Ela e medida
   numa passada curta, sem o cookie, so na home. */
const COOKIE_ACEITO = { name: 'rb_consent', value: 'v1|a:0,p:0', url: BASE };
const PAGINA_DA_FAIXA = '/index.html';

const COLETAR = (escopo) => {
  const raiz = escopo ? document.querySelector(escopo) : document.body;
  if (!raiz) return { textos: [], controles: [], raios: [] };

  const regiao = (el) => {
    if (el.closest('.cookie-notify')) return 'cookies';
    if (el.closest('header, #header')) return 'cabecalho';
    if (el.closest('footer')) return 'rodape';
    if (el.closest('main')) return 'conteudo';
    return 'outro';
  };

  const seletor = (el) =>
    el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' +
        el.className
          .trim()
          .split(/\s+/)
          .filter((c) => !c.startsWith('astro-'))
          .slice(0, 3)
          .join('.')
      : '');

  /* Opacidade acumulada: texto em `opacity: 0` nao esta na tela. */
  const alfa = (el) => {
    let a = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      a *= Number(getComputedStyle(n).opacity);
    }
    return a;
  };

  /* Recorte por ancestral com overflow -- o menu mobile fechado mede 708x45 e
     esta dentro de uma caixa de altura zero. Ver a nota do verify-contraste. */
  const visivel = (el, b) => {
    let { left, top, right, bottom } = b;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === 'visible' && cs.clipPath === 'none') continue;
      const r = n.getBoundingClientRect();
      left = Math.max(left, r.left);
      top = Math.max(top, r.top);
      right = Math.min(right, r.right);
      bottom = Math.min(bottom, r.bottom);
      if (right - left < 2 || bottom - top < 2) return false;
    }
    return true;
  };

  const lona = document.createElement('canvas').getContext('2d');

  const textos = [];
  const controles = [];
  const raios = [];

  for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (alfa(el) < 0.02) continue;

    /* ---- raio: so o que tem superficie, borda ou e imagem ---- */
    const raio = parseFloat(cs.borderTopLeftRadius);
    if (raio > 0) {
      const temSuperficie =
        cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        cs.backgroundImage !== 'none' ||
        parseFloat(cs.borderTopWidth) > 0 ||
        el.tagName === 'IMG' ||
        el.tagName === 'PICTURE';
      const r = el.getBoundingClientRect();
      if (temSuperficie && r.width > 2 && r.height > 2) {
        raios.push({ px: Math.round(raio * 100) / 100, seletor: seletor(el), regiao: regiao(el) });
      }
    }

    /* ---- controles ---- */
    if (el.matches('a[href], button, [role="tab"], summary')) {
      const r = el.getBoundingClientRect();
      /* Fora da tela nao e alvo de toque: o `.skip-link` vive em -9999px ate o
         foco, e contado ali somava 40 "controles pequenos" que ninguem toca. */
      const naTela = r.right + scrollX > 0 && r.bottom + scrollY > 0;
      if (r.width >= 1 && r.height >= 1 && naTela && visivel(el, r)) {
        /* Link dentro de frase e isento pela WCAG 2.5.8; o resto e controle. */
        const inline = cs.display === 'inline' && !!el.closest('p, li, td, th, small, figcaption');
        controles.push({
          seletor: seletor(el),
          texto: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          inline,
          regiao: regiao(el),
        });
      }
    }

    /* ---- texto proprio visivel ---- */
    let proprio = '';
    let temCaixa = false;
    for (const no of el.childNodes) {
      if (no.nodeType !== 3 || !no.textContent.trim()) continue;
      proprio += no.textContent;
      const intervalo = document.createRange();
      intervalo.selectNodeContents(no);
      for (const b of intervalo.getClientRects()) {
        if (b.width < 2 || b.height < 2) continue;
        if (b.x + scrollX < -100 || b.y + scrollY < -100) continue;
        if (!visivel(el, b)) continue;
        temCaixa = true;
        break;
      }
    }
    if (!temCaixa) continue;

    const px = parseFloat(cs.fontSize);
    const entrelinha = cs.lineHeight === 'normal' ? 'normal' : Math.round((parseFloat(cs.lineHeight) / px) * 100) / 100;
    const tracking = cs.letterSpacing === 'normal' ? 0 : Math.round((parseFloat(cs.letterSpacing) / px) * 1000) / 1000;

    const registro = {
      tag: el.tagName.toLowerCase(),
      seletor: seletor(el),
      regiao: regiao(el),
      texto: proprio.trim().replace(/\s+/g, ' ').slice(0, 48),
      familia: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      px: Math.round(px * 100) / 100,
      peso: Number(cs.fontWeight),
      entrelinha,
      tracking,
      caixa: cs.textTransform === 'uppercase' ? 'alta' : 'normal',
      cor: cs.color,
      decorativo: !!el.closest('[aria-hidden="true"]'),
    };

    /*
     * Quantos caracteres cabem na linha, na fonte real. So para paragrafo de
     * conteudo com texto bastante para a media de largura ser estavel. Mede o
     * proprio texto, e nao o "0": e a largura media de prosa que decide a
     * leitura, e o algarismo e mais largo que a letra media na maioria das
     * fontes.
     */
    if (registro.tag === 'p' && registro.regiao === 'conteudo' && proprio.trim().length >= 80) {
      lona.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const amostra = proprio.trim().replace(/\s+/g, ' ');
      const media = lona.measureText(amostra).width / amostra.length;
      const r = el.getBoundingClientRect();
      const util = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      registro.caracteresPorLinha = media > 0 ? Math.round(util / media) : null;
    }

    textos.push(registro);
  }

  return { textos, controles, raios };
};

/* ------------------------------------------------------------------ *
 * Varredura
 * ------------------------------------------------------------------ */

const navegador = await chromium.launch();
const coletas = []; /* { viewport, pagina, textos, controles, raios } */

const medir = async (vp, pagina, { comConsentimento, escopo }) => {
  const contexto = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  if (comConsentimento) await contexto.addCookies([COOKIE_ACEITO]);
  const page = await contexto.newPage();
  const resp = await page.goto(`${BASE}${pagina}`, { waitUntil: 'networkidle' });
  if (!resp || !resp.ok()) {
    if (!(pagina === '/404.html' && resp && resp.status() === 404)) {
      console.error(`FALHA ${pagina} ${vp.nome} -- ${resp ? resp.status() : 'sem resposta'}`);
    }
  }
  /* A fonte troca por `swap`: medir antes dela chegar mede a fonte de reserva. */
  await page.evaluate(() => document.fonts.ready);
  /*
   * ROLAR COM requestAnimationFrame, como o verify-contraste, e nao so pela
   * imagem preguicosa. O Chromium headless so produz quadro quando alguem pede:
   * medido, 1,2s depois do `networkidle` o `document.timeline.currentTime` da
   * home ainda era 0. Sem quadro a animacao nao comeca, o `fill-mode: both`
   * segura o quadro inicial, e o sobretitulo e o botao do <Hero> medem
   * opacidade 0 -- e saem da contagem sem erro nenhum.
   */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const r = await page.evaluate(COLETAR, escopo ?? null);
  await contexto.close();
  return r;
};

for (const vp of viewportsSelecionados()) {
  for (const pagina of paginasSelecionadas()) {
    const r = await medir(vp, pagina, { comConsentimento: true });
    coletas.push({ viewport: vp.nome, pagina, ...r });
  }
  const faixa = await medir(vp, PAGINA_DA_FAIXA, { comConsentimento: false, escopo: '.cookie-notify' });
  coletas.push({ viewport: vp.nome, pagina: `${PAGINA_DA_FAIXA}#cookies`, ...faixa });
  console.log(`medido: ${vp.nome}`);
}
await navegador.close();

/* ------------------------------------------------------------------ *
 * Agregacao
 * ------------------------------------------------------------------ */

const contar = (mapa, chave, exemplo) => {
  const atual = mapa.get(chave) ?? { n: 0, exemplos: [], paginas: new Set() };
  atual.n++;
  atual.paginas.add(exemplo.pagina);
  if (atual.exemplos.length < 3 && !atual.exemplos.some((e) => e.seletor === exemplo.seletor)) {
    atual.exemplos.push(exemplo);
  }
  mapa.set(chave, atual);
};

const serializar = (mapa) =>
  [...mapa.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([chave, v]) => ({ chave, n: v.n, paginas: v.paginas.size, exemplos: v.exemplos }));

const resumo = {};
for (const vp of viewportsSelecionados()) {
  const daqui = coletas.filter((c) => c.viewport === vp.nome);
  const combos = new Map();
  const titulos = new Map();
  const familias = new Map();
  const pesos = new Map();
  const tamanhos = new Map();
  const entrelinhas = new Map();
  const trackings = new Map();
  const caixaAlta = new Map();
  const raios = new Map();
  const linhas = [];
  const toque = [];

  for (const c of daqui) {
    for (const t of c.textos) {
      const ex = { seletor: t.seletor, texto: t.texto, pagina: c.pagina, regiao: t.regiao };
      contar(combos, `${t.familia} ${t.px}px ${t.peso} lh${t.entrelinha} ls${t.tracking}em ${t.caixa}`, ex);
      contar(familias, t.familia, ex);
      contar(pesos, String(t.peso), ex);
      contar(tamanhos, String(t.px), ex);
      contar(entrelinhas, String(t.entrelinha), ex);
      if (t.tracking !== 0) contar(trackings, `${t.tracking}em @${t.px}px`, ex);
      if (t.caixa === 'alta') contar(caixaAlta, `${t.familia} ${t.px}px ${t.peso} ls${t.tracking}em`, ex);
      if (/^h[1-6]$/.test(t.tag) && t.regiao === 'conteudo') {
        contar(titulos, `${t.tag} ${t.familia} ${t.px}px ${t.peso}`, ex);
      }
      if (t.caracteresPorLinha) linhas.push({ n: t.caracteresPorLinha, pagina: c.pagina, seletor: t.seletor });
    }
    for (const r of c.raios) contar(raios, `${r.px}px`, { seletor: r.seletor, pagina: c.pagina, regiao: r.regiao });
    if (vp.nome === 'mobile') {
      for (const k of c.controles) {
        if (!k.inline && (k.w < 44 || k.h < 44)) toque.push({ ...k, pagina: c.pagina });
      }
    }
  }

  linhas.sort((a, b) => a.n - b.n);
  const mediana = linhas.length ? linhas[Math.floor(linhas.length / 2)].n : null;

  resumo[vp.nome] = {
    combinacoes: serializar(combos),
    titulos: serializar(titulos),
    familias: serializar(familias),
    pesos: serializar(pesos),
    tamanhos: serializar(tamanhos),
    entrelinhas: serializar(entrelinhas),
    trackings: serializar(trackings),
    caixaAlta: serializar(caixaAlta),
    raios: serializar(raios),
    linha: {
      paragrafos: linhas.length,
      min: linhas[0]?.n ?? null,
      mediana,
      max: linhas.at(-1)?.n ?? null,
      acimaDe75: linhas.filter((l) => l.n > 75).length,
    },
    /* Uma entrada por FORMA (seletor x caixa), com a contagem: as 555
       ocorrencias da primeira medicao eram 63 formas repetidas por pagina. */
    toqueAbaixoDe44:
      vp.nome === 'mobile'
        ? [...Map.groupBy(toque, (k) => `${k.seletor} ${k.w}x${k.h}`).values()].map((g) => ({
            ...g[0],
            ocorrencias: g.length,
          }))
        : undefined,
  };
}

await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(
  SAIDA,
  /* Data local, e nao a do UTC: medido as 21h de Brasilia, o ISO ja diz amanha. */
  JSON.stringify({ medidoEm: new Date().toLocaleDateString('sv-SE'), base: BASE, resumo }, null, 2) + '\n'
);

/* ------------------------------------------------------------------ *
 * Resumo legivel
 * ------------------------------------------------------------------ */

for (const [vp, r] of Object.entries(resumo)) {
  console.log(`\n=== ${vp} ===`);
  console.log(`combinacoes tipograficas ...... ${r.combinacoes.length}`);
  console.log(`familias ...................... ${r.familias.map((f) => `${f.chave} (${f.n})`).join(', ')}`);
  console.log(`pesos ......................... ${r.pesos.map((f) => `${f.chave} (${f.n})`).join(', ')}`);
  console.log(`tamanhos distintos ............ ${r.tamanhos.length}: ${r.tamanhos.map((t) => t.chave).sort((a, b) => a - b).join(' ')}`);
  console.log(`entrelinhas distintas ......... ${r.entrelinhas.length}`);
  console.log(`trackings nao nulos ........... ${r.trackings.length}`);
  console.log(`caixa alta (combinacoes) ...... ${r.caixaAlta.length}`);
  for (const c of r.caixaAlta) console.log(`    ${String(c.n).padStart(5)}  ${c.chave}  ${c.exemplos[0].seletor}`);
  console.log(`titulos no conteudo:`);
  for (const t of r.titulos) console.log(`    ${String(t.n).padStart(5)}  ${t.chave}`);
  console.log(`raios ......................... ${r.raios.map((x) => `${x.chave} (${x.n})`).join(', ')}`);
  console.log(
    `caracteres por linha .......... ${r.linha.paragrafos} paragrafos, min ${r.linha.min}, mediana ${r.linha.mediana}, max ${r.linha.max}, ${r.linha.acimaDe75} acima de 75`
  );
  if (r.toqueAbaixoDe44) {
    const total = r.toqueAbaixoDe44.reduce((s, k) => s + k.ocorrencias, 0);
    console.log(`controles < 44px no celular ... ${total} ocorrencias, ${r.toqueAbaixoDe44.length} formas`);
    for (const k of [...r.toqueAbaixoDe44].sort((a, b) => b.ocorrencias - a.ocorrencias).slice(0, 25)) {
      console.log(`    ${String(k.ocorrencias).padStart(4)}x  ${k.w}x${k.h}  ${k.seletor}  "${k.texto}"`);
    }
  }
}
console.log(`\ngravado em ${SAIDA}`);
