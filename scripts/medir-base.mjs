/**
 * Mede no navegador a base tipografica que o tema aplica.
 *
 * Por que medir em vez de ler o style.css: sao 21 mil linhas e a mesma classe
 * aparece em contextos diferentes — a regra que parece valer frequentemente nao
 * e a que vence. O CLAUDE.md ja registra um caso em que a leitura do seletor
 * apontou errado e um teste no navegador resolveu em um minuto.
 *
 * Para que serve: o Preflight do Tailwind zera margens e estilos de heading e
 * lista. O src/styles/base.css precisa reestabelecer esses valores ANTES de
 * qualquer pagina migrar, senao cada pagina migrada carrega o desvio e ninguem
 * distingue o refino do reset. Este script produz a tabela de origem.
 *
 * Tambem alimenta as ancoras do clamp(): o valor medido no viewport mobile vira
 * o minimo e o do desktop vira o maximo, entao a escala fluida interpola entre
 * os extremos que o site ja tem hoje.
 *
 *   node scripts/medir-base.mjs            # precisa do preview no ar
 *   BASE=http://localhost:4330 node scripts/medir-base.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/base-medida.json';

/*
 * Uma pagina por familia de layout, nao as 40: paginas do mesmo molde repetem a
 * medida e triplicam o tempo. As tres do ebook entram porque o <body> delas nao
 * tem a classe "modern" e o cromo e outro — e exatamente onde a base pode
 * divergir.
 */
const PAGINAS = [
  '/index.html',
  '/historia.html',
  '/publicacoes.html',
  '/associados.html',
  '/termos-de-uso.html',
  '/ebook.html',
  '/404.html',
  '/en-us/home.html',
  '/es-es/inicio.html',
];

const VIEWPORTS = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1440, height: 900 },
];

/**
 * As propriedades que o Preflight mexe, mais as que definem a escala.
 *
 * `paddingInlineStart` e `listStyleType` entraram depois, e a falta delas ja
 * custou um erro: o `padding-left: 28px` das listas foi para o base.css LIDO do
 * plugins.css, nao medido — que e precisamente o que este script existe para
 * evitar. Se for usar um valor no base.css, meca-o aqui.
 */
const PROPS = [
  'fontSize',
  'fontWeight',
  'lineHeight',
  'fontFamily',
  'letterSpacing',
  'marginTop',
  'marginBottom',
  'paddingInlineStart',
  'listStyleType',
  'color',
  'textTransform',
];

const TAGS = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'small', 'strong'];

const navegador = await chromium.launch();
/** chave `viewport|tag|classes` -> { props, paginas: Set } */
const amostras = new Map();

for (const vp of VIEWPORTS) {
  const page = await navegador.newPage({ viewport: { width: vp.width, height: vp.height } });

  for (const caminho of PAGINAS) {
    const resp = await page.goto(`${BASE}${caminho}`, { waitUntil: 'load' });
    if (!resp || !resp.ok()) {
      console.error(`FALHA ao carregar ${caminho} — ${resp ? resp.status() : 'sem resposta'}`);
      continue;
    }

    const medidas = await page.evaluate(
      ({ TAGS, PROPS }) => {
        /*
         * So o conteudo. A primeira medicao pegava a primeira ocorrencia de cada
         * tag no documento, e no <header> ela vem antes do <main>: o `a` saia
         * com 40px/peso 800 (o logotipo) e o `ul` com line-height 80px (a barra
         * de navegacao). Esses valores sao do cromo, nao da base tipografica, e
         * teriam ido parar no base.css como se fossem o padrao do tema.
         */
        const FORA = '#header, #footer, nav, .p-dropdown, #cookieNotify, #scrollTop, .social-icons';
        const saida = [];
        for (const tag of TAGS) {
          const escopo = tag === 'body' ? document.querySelectorAll('body') : document.querySelectorAll(`main ${tag}`);
          for (const el of escopo) {
            if (tag !== 'body' && el.closest(FORA)) continue;

            // Elemento oculto nao tem valor computado confiavel de layout, e o
            // menu mobile fica no DOM em desktop (e vice-versa).
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0 && tag !== 'body') continue;

            const cs = getComputedStyle(el);
            const props = {};
            for (const p of PROPS) props[p] = cs[p];
            saida.push({ tag, classes: el.className || '', props });
          }
        }
        return saida;
      },
      { TAGS, PROPS }
    );

    /*
     * A chave inclui os valores computados, nao so tag+classe. Guardar a
     * primeira amostra escondia que o mesmo `h3` tem tamanhos diferentes em
     * contextos diferentes — e o base.css precisa do valor DOMINANTE, nao do
     * que aparecer primeiro. Com a contagem, a moda e visivel e as excecoes
     * tambem.
     */
    for (const m of medidas) {
      const chave = `${vp.nome}|${m.tag}|${m.classes}|${JSON.stringify(m.props)}`;
      if (!amostras.has(chave)) {
        amostras.set(chave, {
          viewport: vp.nome,
          tag: m.tag,
          classes: m.classes,
          props: m.props,
          ocorrencias: 0,
          paginas: new Set(),
        });
      }
      const a = amostras.get(chave);
      a.ocorrencias += 1;
      a.paginas.add(caminho);
    }
  }

  await page.close();
  console.log(`medido: ${vp.nome}`);
}

await navegador.close();

const registros = [...amostras.values()]
  .map((a) => ({ ...a, paginas: [...a.paginas], usos: a.paginas.size }))
  .sort((a, b) => b.ocorrencias - a.ocorrencias || a.tag.localeCompare(b.tag));

/** O valor dominante de um elemento nu: o mais frequente, nao o primeiro. */
const dominante = (tag, viewport) =>
  registros
    .filter((r) => r.tag === tag && r.classes === '' && r.viewport === viewport)
    .sort((a, b) => b.ocorrencias - a.ocorrencias)[0];

await mkdir('tests', { recursive: true });
await writeFile(SAIDA, JSON.stringify(registros, null, 2));

/* ---- resumo legivel: so o elemento nu, que e o que o Preflight zera ---- */
console.log(`\n${registros.length} combinacoes tag+classe medidas -> ${SAIDA}\n`);
console.log('BASE DO ELEMENTO NU (sem classe) — o que base.css precisa restaurar:\n');
console.log(
  ['tag', 'viewport', 'font-size', 'weight', 'line-height', 'mt', 'mb', 'n', 'variantes']
    .map((s, i) => s.padEnd([7, 9, 11, 8, 12, 7, 7, 6, 10][i]))
    .join('')
);
console.log('-'.repeat(80));

for (const tag of TAGS) {
  for (const vp of VIEWPORTS) {
    const r = dominante(tag, vp.nome);
    if (!r) continue;
    // Quantas medidas diferentes o mesmo elemento nu produziu neste viewport:
    // mais de uma significa que o contexto manda, e o base.css sozinho nao
    // reproduz — o componente precisa carregar a variacao.
    const variantes = registros.filter(
      (x) => x.tag === tag && x.classes === '' && x.viewport === vp.nome
    ).length;
    console.log(
      [
        tag.padEnd(7),
        vp.nome.padEnd(9),
        r.props.fontSize.padEnd(11),
        r.props.fontWeight.padEnd(8),
        r.props.lineHeight.padEnd(12),
        r.props.marginTop.padEnd(7),
        r.props.marginBottom.padEnd(7),
        String(r.ocorrencias).padEnd(6),
        variantes > 1 ? `${variantes} !` : '1',
      ].join('')
    );
  }
}

/* A escala de fonte de fato usada, para desenhar os degraus dos tokens. */
console.log('\nESCALA DE FONTE EM USO (todas as combinacoes, por viewport):\n');
for (const vp of VIEWPORTS) {
  const tamanhos = [...new Set(registros.filter((r) => r.viewport === vp.nome).map((r) => parseFloat(r.props.fontSize)))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  console.log(`${vp.nome.padEnd(9)} ${tamanhos.map((t) => `${t}px`).join('  ')}`);
}
