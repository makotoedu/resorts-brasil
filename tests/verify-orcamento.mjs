/**
 * Orçamento de performance — a catraca de peso por página.
 *
 * É o quarto portão duro do plano, e o que faltava. Sem o diff visual como
 * critério, nada impedia o projeto de ficar mais bonito e mais lento ao mesmo
 * tempo: as suítes de comportamento e geometria passam felizes com um hero de
 * 646 KB.
 *
 * **É uma catraca, não um teto absoluto.** Teto único reprovaria a home e
 * liberaria a 404 no mesmo número; e um teto que sempre falha não é portão.
 * Aqui cada página tem a própria linha de base, gravada em `orcamento.json`, e
 * o que reprova é ela ENGORDAR. Página migrada emagrece, a base é regravada
 * mais apertada, e o peso nunca mais volta.
 *
 * O peso é medido no navegador, por recurso, contando o que a página de fato
 * baixa até o `load` — imagem com `loading="lazy"` fora da dobra não entra,
 * porque de fato não é baixada.
 *
 *   npx astro preview --port 4330
 *   node tests/verify-orcamento.mjs
 *   ATUALIZAR=1 node tests/verify-orcamento.mjs    # regrava a linha de base
 */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { paginasSelecionadas, CATALOGO } from './paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const ARQUIVO = new URL('./orcamento.json', import.meta.url);

/** Quanto uma página pode engordar antes de reprovar. */
const TOLERANCIA = 1.05;

/*
 * Dois viewports, e não os três da geometria: o `srcset` entrega arquivos
 * diferentes em cada largura, e é exatamente isso que o orçamento precisa ver.
 * O tablet fica de fora porque não acrescenta um degrau de decisão — mede o
 * mesmo tipo de escolha que o desktop.
 */
const VIEWPORTS = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'desktop', width: 1440, height: 900 },
];

const PAGINAS = process.env.PAGES ? paginasSelecionadas() : [...paginasSelecionadas(), CATALOGO];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** Agrupa o tipo do Playwright no que interessa decidir. */
const familia = (tipo) => {
  if (tipo === 'document') return 'html';
  if (tipo === 'stylesheet') return 'css';
  if (tipo === 'script') return 'js';
  if (tipo === 'image') return 'imagem';
  if (tipo === 'font') return 'fonte';
  return 'outro';
};

let baseAnterior = null;
try {
  baseAnterior = JSON.parse(await readFile(ARQUIVO, 'utf8'));
} catch {
  /* primeira execução: a linha de base nasce agora */
}

const navegador = await chromium.launch();
const medido = {};

for (const vp of VIEWPORTS) {
  for (const caminho of PAGINAS) {
    /*
     * CONTEXTO NOVO A CADA PÁGINA, e não a cada viewport.
     *
     * Com um contexto só, a segunda página em diante herda do cache o CSS, o JS
     * e as fontes da primeira — e o orçamento passa a medir a ORDEM DA LISTA em
     * vez do peso da página. Foi o que a primeira execução mostrou: `index`
     * aparecia com 67 KB de CSS e as outras 40 com zero.
     *
     * Cada página é um visitante novo, que é também o caso que interessa medir.
     */
    const contexto = await navegador.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await contexto.newPage();

    const pesos = { html: 0, css: 0, js: 0, imagem: 0, fonte: 0, outro: 0 };
    const contado = new Set();

    const ouvinte = async (resposta) => {
      const url = resposta.url();
      // Terceiro (Google Fonts) não entra: não é peso que este repositório
      // controla, e a rede do CI mudaria o número sem ninguém mexer no site.
      if (!url.startsWith(BASE)) return;
      if (contado.has(url)) return;
      contado.add(url);
      try {
        const corpo = await resposta.body();
        pesos[familia(resposta.request().resourceType())] += corpo.length;
      } catch {
        /* resposta sem corpo acessível (redirect, cache) */
      }
    };

    page.on('response', ouvinte);
    await page.goto(`${BASE}${caminho}`, { waitUntil: 'load' });
    // Dá tempo para o que o `load` dispara em seguida (imagem decodificando,
    // fonte trocando) chegar à contagem.
    await page.waitForTimeout(300);
    page.off('response', ouvinte);

    const total = Object.values(pesos).reduce((a, b) => a + b, 0);
    medido[`${caminho}|${vp.nome}`] = { ...pesos, total };
    await contexto.close();
  }

  console.log(`medido: ${vp.nome}`);
}

await navegador.close();

if (!baseAnterior || process.env.ATUALIZAR) {
  await writeFile(ARQUIVO, JSON.stringify(medido, null, 2));
  console.log(`\nlinha de base gravada: ${Object.keys(medido).length} medidas -> tests/orcamento.json`);
  process.exit(0);
}

const engordaram = [];
const emagreceram = [];

for (const [chave, atual] of Object.entries(medido)) {
  const antes = baseAnterior[chave];
  if (!antes) {
    console.log(`  nova     ${chave}  ${kb(atual.total)}`);
    continue;
  }
  if (atual.total > antes.total * TOLERANCIA) {
    const piores = Object.entries(atual)
      .filter(([k, v]) => k !== 'total' && v > (antes[k] ?? 0) * TOLERANCIA)
      .map(([k, v]) => `${k} ${kb(antes[k] ?? 0)} -> ${kb(v)}`);
    engordaram.push(`${chave}  ${kb(antes.total)} -> ${kb(atual.total)}  (${piores.join('; ') || 'distribuído'})`);
  } else if (atual.total < antes.total * 0.95) {
    emagreceram.push(`${chave}  ${kb(antes.total)} -> ${kb(atual.total)}`);
  }
}

const soma = (o) => Object.values(o).reduce((a, p) => a + p.total, 0);
console.log(
  `\n${Object.keys(medido).length} medidas — total ${kb(soma(medido))}` +
    (baseAnterior ? ` (linha de base ${kb(soma(baseAnterior))})` : '')
);

if (emagreceram.length) {
  console.log(`\nEMAGRECERAM — regrave a base com ATUALIZAR=1:`);
  for (const e of emagreceram.slice(0, 12)) console.log(`  ${e}`);
  if (emagreceram.length > 12) console.log(`  ... e mais ${emagreceram.length - 12}`);
}

if (engordaram.length) {
  console.error(`\nORCAMENTO ESTOURADO — ${engordaram.length} página(s) acima da linha de base:`);
  for (const e of engordaram) console.error(`  ${e}`);
  process.exit(1);
}

console.log('\nok — nenhuma pagina engordou');
