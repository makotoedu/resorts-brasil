/**
 * Mede no navegador o que os PADROES precisam reproduzir.
 *
 * Terceiro da familia: medir-base.mjs cobre o elemento nu, medir-primitivos.mjs
 * cobre o que tem classe e e generico (botao, secao, container, grade, icone), e
 * este cobre as NOVE composicoes que a Etapa 3 substitui — cartao de membro,
 * chamada de acao, caixa de icone, cartao de publicacao, lista com marcador,
 * hero, faixa de destaque, contador e abas.
 *
 * Mesma disciplina e mesmo motivo dos anteriores: o style.css tem 21 mil linhas
 * e a regra que parece valer frequentemente nao e a que vence. O `padding` das
 * listas ja entrou errado no base.css por leitura (28px onde o real e 14px), a
 * largura do container por suposicao (1140px onde o real e 1500px) e a cor de
 * acao por contagem de ocorrencias. Valor que vai para um componente sai daqui.
 *
 * Alem do repouso, mede o HOVER dos elementos que tem estado — `.item-link`, o
 * link do LinkedIn no cartao e a aba inativa. Nenhum deles aparece no HTML nem
 * no diff visual, entao seriam a parte mais facil de inventar.
 *
 *   npx astro preview --port 4330
 *   node scripts/medir-padroes.mjs
 *   BASE=http://localhost:4330 node scripts/medir-padroes.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { VIEWPORTS } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/padroes-medidos.json';

/**
 * Uma pagina por alvo, escolhida pelo grep do markup. Medir a mesma composicao
 * em duas paginas so triplica o tempo — o que muda entre paginas e o conteudo,
 * nao o CSS.
 */
const ALVOS = [
  // ---- cartao de membro: 124 usos, o padrao mais repetido do site ----
  { grupo: 'cartaoMembro', nome: '.team-member', pagina: '/diretoria.html', seletor: 'main .team-member' },
  { grupo: 'cartaoMembro', nome: '.team-image', pagina: '/diretoria.html', seletor: 'main .team-member .team-image' },
  { grupo: 'cartaoMembro', nome: '.team-image img', pagina: '/diretoria.html', seletor: 'main .team-member .team-image img' },
  { grupo: 'cartaoMembro', nome: '.team-desc h3', pagina: '/diretoria.html', seletor: 'main .team-desc h3' },
  { grupo: 'cartaoMembro', nome: '.team-desc span', pagina: '/diretoria.html', seletor: 'main .team-desc > span' },
  {
    grupo: 'cartaoMembro',
    nome: '.social-icons a',
    pagina: '/diretoria.html',
    seletor: 'main .team-desc .social-icons li a[href]',
    hover: true,
  },

  // ---- chamada de acao: 51 usos, tres superficies diferentes ----
  { grupo: 'chamadaAcao', nome: '.call-to-action.background-grey', pagina: '/associe-se.html', seletor: 'main .call-to-action.background-grey' },
  { grupo: 'chamadaAcao', nome: '.call-to-action.background-dark', pagina: '/apoie.html', seletor: 'main .call-to-action.background-dark' },
  { grupo: 'chamadaAcao', nome: '.call-to-action.background-image', pagina: '/index.html', seletor: 'main .call-to-action.background-image' },
  { grupo: 'chamadaAcao', nome: '.bg-overlay', pagina: '/index.html', seletor: 'main .call-to-action .bg-overlay' },
  { grupo: 'chamadaAcao', nome: '.call-to-action h3', pagina: '/index.html', seletor: 'main .call-to-action.background-image h3' },
  { grupo: 'chamadaAcao', nome: '.item-link', pagina: '/index.html', seletor: 'main .call-to-action .item-link', hover: true },

  // ---- caixa de icone: 36 usos ----
  { grupo: 'caixaIcone', nome: '.icon-box.small.clean', pagina: '/associe-se.html', seletor: 'main .icon-box.small.clean' },
  { grupo: 'caixaIcone', nome: '.icon-box .icon', pagina: '/associe-se.html', seletor: 'main .icon-box .icon' },
  { grupo: 'caixaIcone', nome: '.icon-box .icon i', pagina: '/associe-se.html', seletor: 'main .icon-box .icon i' },
  { grupo: 'caixaIcone', nome: '.icon-box h3', pagina: '/associe-se.html', seletor: 'main .icon-box h3' },
  { grupo: 'caixaIcone', nome: '.icon-box p', pagina: '/associe-se.html', seletor: 'main .icon-box p' },

  // ---- cartao de publicacao: 27 usos ----
  { grupo: 'cartaoPublicacao', nome: '.post-item', pagina: '/publicacoes.html', seletor: 'main .post-item' },
  { grupo: 'cartaoPublicacao', nome: '.post-item-wrap', pagina: '/publicacoes.html', seletor: 'main .post-item-wrap' },
  { grupo: 'cartaoPublicacao', nome: '.post-image img', pagina: '/publicacoes.html', seletor: 'main .post-image img' },
  { grupo: 'cartaoPublicacao', nome: '.post-meta-category', pagina: '/publicacoes.html', seletor: 'main .post-meta-category' },
  { grupo: 'cartaoPublicacao', nome: '.post-item-description', pagina: '/publicacoes.html', seletor: 'main .post-item-description' },
  { grupo: 'cartaoPublicacao', nome: '.post-item-description h2', pagina: '/publicacoes.html', seletor: 'main .post-item-description h2' },
  { grupo: 'cartaoPublicacao', nome: '.post-item-description p', pagina: '/publicacoes.html', seletor: 'main .post-item-description p' },

  // ---- lista com marcador: 24 usos, os dois marcadores ----
  { grupo: 'listaIcones', nome: '.list-icon-circle ul', pagina: '/historia.html', seletor: 'main ul.list-icon-circle' },
  { grupo: 'listaIcones', nome: '.list-icon-circle li', pagina: '/historia.html', seletor: 'main ul.list-icon-circle li' },
  { grupo: 'listaIcones', nome: '.list-icon-circle li::before', pagina: '/historia.html', seletor: 'main ul.list-icon-circle li', pseudo: '::before' },
  { grupo: 'listaIcones', nome: '.list-icon-arrow li', pagina: '/politica-de-privacidade.html', seletor: 'main ul.list-icon-arrow li' },
  { grupo: 'listaIcones', nome: '.list-icon-arrow li::before', pagina: '/politica-de-privacidade.html', seletor: 'main ul.list-icon-arrow li', pseudo: '::before' },

  // ---- hero ----
  { grupo: 'hero', nome: '.inspiro-slider', pagina: '/index.html', seletor: 'main .inspiro-slider' },
  { grupo: 'hero', nome: '.slide', pagina: '/index.html', seletor: 'main .inspiro-slider .slide' },
  { grupo: 'hero', nome: '.slide-captions', pagina: '/index.html', seletor: 'main .slide-captions' },
  { grupo: 'hero', nome: '.slide-captions .strong', pagina: '/index.html', seletor: 'main .slide-captions .strong' },
  { grupo: 'hero', nome: '.slide-captions h2', pagina: '/index.html', seletor: 'main .slide-captions h2' },

  // ---- faixa de destaque ----
  { grupo: 'faixaDestaque', nome: '.box-fancy', pagina: '/resorts-brasil.html', seletor: 'main .box-fancy' },
  { grupo: 'faixaDestaque', nome: '.box-fancy .col-lg-4', pagina: '/resorts-brasil.html', seletor: 'main .box-fancy .col-lg-4' },
  { grupo: 'faixaDestaque', nome: '.box-fancy h2.text-lg', pagina: '/resorts-brasil.html', seletor: 'main .box-fancy h2' },
  { grupo: 'faixaDestaque', nome: '.box-fancy h4', pagina: '/resorts-brasil.html', seletor: 'main .box-fancy h4' },
  { grupo: 'faixaDestaque', nome: '.box-fancy p', pagina: '/resorts-brasil.html', seletor: 'main .box-fancy p' },

  // ---- contador ----
  { grupo: 'contador', nome: '.counter', pagina: '/associados.html', seletor: 'main .counter' },
  { grupo: 'contador', nome: '.counter span', pagina: '/associados.html', seletor: 'main .counter span' },
  { grupo: 'contador', nome: 'rotulo (p)', pagina: '/associados.html', seletor: 'main .counter + p' },

  // ---- abas ----
  { grupo: 'abas', nome: '.nav-tabs', pagina: '/associados.html', seletor: 'main ul.nav-tabs' },
  { grupo: 'abas', nome: '.nav-link.active', pagina: '/associados.html', seletor: 'main .nav-tabs .nav-link.active' },
  { grupo: 'abas', nome: '.nav-link (inativa)', pagina: '/associados.html', seletor: 'main .nav-tabs .nav-link:not(.active)', hover: true },
  { grupo: 'abas', nome: '.tab-content', pagina: '/associados.html', seletor: 'main .tab-content' },
  { grupo: 'abas', nome: '.line (divisor)', pagina: '/associados.html', seletor: 'main .tab-pane.active .line' },

  /*
   * ---- faixa de logos: mantenedores, parceiros e descontos ----
   *
   * ACRESCENTADA NA ETAPA 8, e a ausencia dela era um buraco antigo: a faixa
   * aparece em QUATRO paginas por idioma (associe-se, apoie, resorts-brasil e a
   * home) e nunca tinha sido medida — o <GradeLogos> de transicao emitia o
   * markup do tema, entao ate aqui ninguem precisou saber os numeros.
   *
   * Como a grade masonry da Etapa 7, o numero de colunas NAO se le no CSS de
   * forma confiavel: `.grid-5-columns` e `.grid-6-columns` sao floats com
   * largura percentual, e a contagem efetiva por faixa sai de quantas posicoes
   * horizontais distintas os `<li>` ocupam. E o que `itens` conta.
   */
  {
    grupo: 'gradeLogos',
    nome: '.grid-5-columns',
    pagina: '/apoie.html',
    seletor: 'main #parceiros ul.grid',
    itens: 'main #parceiros ul.grid > li',
  },
  {
    grupo: 'gradeLogos',
    nome: '.grid-6-columns',
    pagina: '/associe-se.html',
    seletor: 'main #parceiros ul.grid',
    itens: 'main #parceiros ul.grid > li',
  },
  { grupo: 'gradeLogos', nome: 'li (5 colunas)', pagina: '/apoie.html', seletor: 'main #parceiros ul.grid > li' },
  { grupo: 'gradeLogos', nome: 'li img (5 colunas)', pagina: '/apoie.html', seletor: 'main #parceiros ul.grid > li img' },
  {
    grupo: 'gradeLogos',
    nome: 'li a (hover)',
    pagina: '/apoie.html',
    seletor: 'main #parceiros ul.grid > li a[href]',
    hover: true,
  },
  /* A grade de logos dentro das abas de associados: mesma classe, outro
     contexto — dentro de um `.col-lg-9`, e nao do container inteiro. */
  {
    grupo: 'gradeLogos',
    nome: '.grid-6-columns (abas)',
    pagina: '/associados.html',
    seletor: 'main .tab-pane.active ul.grid',
    itens: 'main .tab-pane.active ul.grid > li',
  },

  /*
   * ---- cartao de modalidade: as duas caixas coloridas de /apoie ----
   *
   * `.card` com fundo em `style=` inline e um `.item-link` dentro. Sao 6 usos
   * (2 x 3 idiomas) e a Etapa 3 ja os citava como um dos tres lugares em que o
   * <LinkAcao> vive — mas o cartao em volta nunca foi medido.
   */
  { grupo: 'cartaoModalidade', nome: '.card', pagina: '/apoie.html', seletor: 'main #apoie .card' },
  { grupo: 'cartaoModalidade', nome: '.card-body', pagina: '/apoie.html', seletor: 'main #apoie .card .card-body' },
  { grupo: 'cartaoModalidade', nome: '.card-body h4', pagina: '/apoie.html', seletor: 'main #apoie .card .card-body h4' },

  /*
   * ---- titulo de secao com linha ----
   *
   * `.heading-text.heading-line` — o titulo com um risco embaixo. Aparece em
   * associados, associe-se, apoie, resorts-brasil e na home; a linha e um
   * `:before`, entao so o pseudo diz onde ela esta e que tamanho tem.
   */
  { grupo: 'tituloSecao', nome: '.heading-text.heading-line', pagina: '/apoie.html', seletor: 'main .heading-text.heading-line' },
  { grupo: 'tituloSecao', nome: '.heading-line h4', pagina: '/apoie.html', seletor: 'main .heading-text.heading-line h4' },
  { grupo: 'tituloSecao', nome: '.heading-line h4::before', pagina: '/apoie.html', seletor: 'main .heading-text.heading-line h4', pseudo: '::before' },
];

/**
 * As propriedades que definem a aparencia de cada grupo. Sao listas por grupo, e
 * nao uma lista unica, porque um bloco com 40 propriedades esconde a que
 * importa: no cartao interessa foto e espacamento, na aba interessa borda e cor.
 */
const CAIXA = [
  'display', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginBottom', 'backgroundColor', 'borderRadius', 'color',
];
const TEXTO = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'marginBottom'];

const PROPS = {
  cartaoMembro: [...CAIXA, 'textAlign', 'overflow', 'width', 'height', 'objectFit', 'borderTopWidth', 'borderColor', 'fontSize', 'fontWeight'],
  chamadaAcao: [...CAIXA, 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'opacity', 'position', 'textAlign', 'fontSize', 'fontWeight'],
  caixaIcone: [...CAIXA, 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'width', 'height'],
  cartaoPublicacao: [...CAIXA, 'borderTopWidth', 'borderColor', 'borderStyle', 'position', 'width', 'height', 'objectFit', 'fontSize', 'fontWeight', 'textTransform'],
  listaIcones: [...CAIXA, 'listStyleType', 'paddingInlineStart', 'content', 'fontFamily', 'fontSize', 'position', 'left', 'top'],
  hero: [...CAIXA, 'position', 'minHeight', 'textAlign', 'fontSize', 'fontWeight', 'overflow', 'backgroundImage'],
  faixaDestaque: [...CAIXA, 'textAlign', 'flexBasis', 'maxWidth', 'fontSize', 'fontWeight', 'lineHeight'],
  contador: [...TEXTO, 'display', 'marginTop'],
  abas: [...CAIXA, 'borderTopWidth', 'borderBottomWidth', 'borderColor', 'borderStyle', 'fontSize', 'fontWeight', 'textTransform', 'textAlign', 'flexBasis', 'height'],
  gradeLogos: [...CAIXA, 'listStyleType', 'float', 'width', 'maxWidth', 'height', 'objectFit', 'verticalAlign', 'opacity', 'filter', 'textAlign'],
  cartaoModalidade: [...CAIXA, 'borderTopWidth', 'borderStyle', 'borderColor', 'textAlign', 'fontSize', 'fontWeight'],
  tituloSecao: [...CAIXA, 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'content', 'position', 'width', 'height', 'left', 'bottom'],
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
           * Quantas COLUNAS a grade tem de fato, pela mesma conta do
           * medir-primitivos.mjs: posicoes horizontais distintas entre os itens.
           * Na faixa de logos o numero esta no nome da classe, mas a classe
           * mente nas faixas estreitas — `.grid-6-columns` nao poe seis colunas
           * num celular, e e justamente a escada que a <Grade> precisa
           * reproduzir.
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
      /* Propriedade sem valor util (vazia, `none`, `normal`, `auto`, `0px`) so
         ocupa linha: o resumo existe para achar o numero que interessa. */
      const linha = PROPS[grupo]
        .filter((p) => r.repouso[p] && !['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)'].includes(r.repouso[p]))
        .map((p) => `${p}=${r.repouso[p]}`)
        .join('  ');
      console.log(`    ${r.viewport.padEnd(8)} ${r.repouso._caixa.padEnd(12)} ${linha}`);
      if (r.hover) {
        // So o que muda no hover: repetir o resto esconde a diferenca.
        const delta = PROPS[grupo]
          .filter((p) => r.hover[p] !== r.repouso[p])
          .map((p) => `${p}: ${r.repouso[p]} -> ${r.hover[p]}`);
        console.log(`    ${''.padEnd(8)} hover        ${delta.length ? delta.join('  ') : '(sem mudanca)'}`);
      }
    }
  }
}
