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

/*
 * A CONEXAO E FIXADA EM 4G, E SEM ISSO A CATRACA NAO TEM NUMERO.
 *
 * Entrou na Etapa 9. O limiar de `loading="lazy"` do Chromium depende da
 * velocidade ESTIMADA da conexao, e essa estimativa nao existe na primeira
 * navegacao de um processo: ali ele usa um limiar curto e, das seguintes em
 * diante, um mais generoso. Medido, a home entregou 2 imagens na primeira
 * navegacao e 26 em todas as outras — 26 KB contra 275, para o mesmo HTML.
 *
 * O efeito era invisivel enquanto nenhuma pagina tinha muita imagem abaixo da
 * dobra. Com os 70 logotipos do <CarrosselLogos>, tres medicoes seguidas da
 * mesma home deram 451, 201 e 451 KB — e o numero passava a depender de a home
 * ser a primeira da lista, que ela e. Uma catraca que reprova e aprova a mesma
 * pagina em execucoes consecutivas ensina a ser ignorada.
 *
 * Fixar em 4G torna a medida repetivel E mais honesta: e o que um visitante
 * comum baixa, e nao o piso de um navegador que ainda nao sabe onde esta.
 */
const navegador = await chromium.launch({ args: ['--force-effective-connection-type=4G'] });

/*
 * E UMA NAVEGACAO DE AQUECIMENTO, DESCARTADA, porque a flag sozinha nao bastou.
 *
 * Medido: com a flag, uma primeira navegacao logo apos o `launch()` ainda
 * entregava 2 imagens onde todas as seguintes entregavam 26 — e a primeira
 * pagina da lista e justamente a home. A flag fixa o TIPO de conexao; o que
 * ainda faltava era o processo ter visto uma navegacao qualquer antes de a
 * medicao comecar.
 *
 * As duas juntas dao o mesmo numero em execucoes consecutivas, que e o unico
 * requisito de uma catraca. A pagina escolhida e a 404, a mais leve do site.
 */
{
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const page = await contexto.newPage();
  await page.goto(`${BASE}/404.html`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await contexto.close();
}

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
    /*
     * `reducedMotion` NAO E PREFERENCIA AQUI, E O QUE TORNA A MEDIDA UM NUMERO.
     *
     * Entrou na Etapa 9, e a razao apareceu na primeira execucao com a home
     * migrada: tres medicoes seguidas da MESMA pagina deram 451, 201 e 378 KB.
     * O culpado e o <CarrosselLogos>, cuja fila anda sozinha — os 70 logotipos
     * sao `loading="lazy"`, e quantos deles entraram na tela ate o `load` depende
     * do instante em que o navegador comecou a animar. Uma catraca precisa de um
     * numero estavel; com essa variacao ela reprovaria e aprovaria a mesma
     * pagina em execucoes consecutivas, e a primeira reprovacao ensinaria a
     * ignora-la.
     *
     * Parar a animacao e coerente com o criterio que este arquivo ja adotava:
     * "imagem com loading=lazy fora da dobra nao entra, porque de fato nao e
     * baixada". A faixa parada mede exatamente o que a primeira tela pede.
     *
     * O QUE A MEDIDA NAO COBRE, e fica dito: quem ficar na home vendo a volta
     * inteira baixa os 70 logotipos, ~447 KB de AVIF, espalhados por 70 segundos
     * e em prioridade baixa. Contra os 4,4 MB que a pagina do tema baixava DE
     * UMA VEZ — para nao mostrar nenhum deles —, e o teto que se aceitou.
     */
    const contexto = await navegador.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce',
    });
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
    /*
     * ESPERAR A REDE SILENCIAR, e não 300ms de cortesia.
     *
     * O `load` não espera imagem com `loading="lazy"`: o navegador decide
     * buscá-la logo depois, e a resposta chega no instante seguinte. Com uma
     * janela fixa de 300ms, o que entrava na conta dependia de a máquina estar
     * ocupada — três medições seguidas da home deram 451, 201 e 451 KB, porque
     * às vezes os 24 logotipos do carrossel chegavam a tempo e às vezes não.
     *
     * `networkidle` fecha a janela quando a rede para de fato. Ele só é
     * alcançável porque a animação está congelada logo acima; com a faixa
     * andando, novas imagens entrariam na tela para sempre e a rede nunca
     * silenciaria. As duas decisões são a mesma decisão.
     *
     * O `catch` mantém a página que não silencia (um `<video>`, um poll) medida
     * pelo que já chegou, em vez de derrubar a rodada inteira.
     */
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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
