/**
 * Mede no navegador a PAGINA DO EBOOK — a landing page de paleta propria.
 *
 * Sexto da familia: medir-base.mjs cobre o elemento nu, medir-primitivos.mjs o
 * que tem classe e e generico, medir-padroes.mjs as composicoes de conteudo,
 * medir-cromo.mjs o que embrulha toda pagina e medir-documento.mjs o texto
 * corrido. Este cobre a unica pagina do site que nao usa a paleta do site.
 *
 * POR QUE ELE EXISTE. As tres paginas do ebook sao a Etapa 10, e sao 1.086
 * linhas com 140 `style=` inline cada. A paleta escura delas — sete gradientes,
 * dois fundos chapados, um acento coral e um azul de titulo de capitulo — esta
 * TODA em `style=` inline: nada disso aparece no `style.css`, entao ler o CSS
 * daria zero resposta. Ou se mede aqui, ou se copia hex a hex do markup, que e
 * exatamente o metodo que ja errou tres cores neste projeto.
 *
 * TRES COISAS SO EXISTEM MEDIDAS, e nenhuma delas esta no style.css:
 *
 *   GRADIENTE      `background-image` computado devolve os stops resolvidos em
 *                  rgb, com os angulos e as posicoes. E o unico jeito de saber
 *                  o que a pagina realmente pinta.
 *   CROMO ESCURO   `#header.dark` e `#footer.inverted` sao a variacao que so
 *                  estas tres paginas usam. O medir-cromo.mjs mede em
 *                  /historia.html, que e clara — a variacao nunca foi medida.
 *   .btn-ebook     o botao proprio do ebook, que nao e nenhuma das quatro
 *                  variantes do <Botao>. Com o hover junto, como sempre.
 *
 *   npx astro preview --port 4330
 *   node scripts/medir-ebook.mjs
 *   BASE=http://localhost:4330 node scripts/medir-ebook.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { VIEWPORTS } from '../tests/paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const SAIDA = 'tests/ebook-medido.json';

/*
 * Uma pagina so, e desta vez isso nao e uma escolha: as tres versoes do ebook
 * sao BYTE A BYTE identicas fora o `lang=`. Ver o comentario da Etapa 10 em
 * docs/decisoes.md.
 */
const PAGINA = '/ebook.html';

const ALVOS = [
  /*
   * ---- cromo escuro ----
   *
   * A variacao `dark`/`inverted` das tres paginas do ebook, medida pela
   * primeira vez. O medir-cromo.mjs da Etapa 5 mede em /historia.html, onde o
   * cabecalho e claro; o <Cabecalho> e o <Rodape> do design system nasceram sem
   * saber que esta variacao existe.
   */
  { grupo: 'cromoEscuro', nome: '#header.dark', seletor: '#header' },
  { grupo: 'cromoEscuro', nome: 'menu link', seletor: '#mainMenu nav > ul > li > a', hover: true },
  { grupo: 'cromoEscuro', nome: 'menu link (dropdown)', seletor: '#mainMenu nav > ul > li.dropdown > a', hover: true },
  { grupo: 'cromoEscuro', nome: 'seletor de idioma', seletor: '#header .header-extras .p-dropdown > a' },
  { grupo: 'cromoEscuro', nome: '#footer.inverted', seletor: '#footer' },
  { grupo: 'cromoEscuro', nome: 'rodape h4', seletor: '#footer h4' },
  { grupo: 'cromoEscuro', nome: 'rodape p', seletor: '#footer p' },
  { grupo: 'cromoEscuro', nome: 'rodape link', seletor: '#footer .footer-content a[href]', hover: true },
  { grupo: 'cromoEscuro', nome: 'copyright', seletor: '#footer #copyright' },

  /*
   * ---- botao do ebook ----
   *
   * `.btn-ebook.btn-lg`, tres usos por pagina. Nao e nenhuma das quatro
   * variantes que o <Botao> ja tem — e o motivo de a Etapa 10 precisar de uma
   * quinta, ou de uma variante de token. Hover junto.
   */
  { grupo: 'botaoEbook', nome: '.btn-ebook.btn-lg', seletor: 'main .btn-ebook', hover: true },

  /*
   * ---- hero em duas colunas ----
   *
   * NAO e o `.inspiro-slider` da home, que o <Hero> ja substitui: aqui sao duas
   * colunas — texto a esquerda, ilustracao a direita — sobre uma foto de fundo,
   * e a secao e `fullscreen`. O <Hero> centraliza legenda sobre foto e nao serve.
   */
  { grupo: 'hero', nome: 'section.fullscreen', seletor: 'main > section.fullscreen' },
  { grupo: 'hero', nome: 'coluna de texto', seletor: 'main > section.fullscreen .col-lg-6.p-t-80' },
  { grupo: 'hero', nome: 'h1.text-md', seletor: 'main > section.fullscreen h1' },
  { grupo: 'hero', nome: 'h4 (subtitulo)', seletor: 'main > section.fullscreen h4' },
  { grupo: 'hero', nome: 'ilustracao', seletor: 'main > section.fullscreen img' },

  /*
   * ---- as sete superficies ----
   *
   * Cada `<section>` do ebook tem o proprio fundo em `style=` inline: cinco
   * gradientes e dois chapados com textura. `backgroundImage` computado devolve
   * os stops ja resolvidos em rgb — que e o que os tokens precisam.
   */
  { grupo: 'superficies', nome: '#sobre', seletor: 'main #sobre' },
  { grupo: 'superficies', nome: '#iniciativa', seletor: 'main #iniciativa' },
  { grupo: 'superficies', nome: '#video', seletor: 'main #video' },
  { grupo: 'superficies', nome: '#estrutura', seletor: 'main #estrutura' },
  { grupo: 'superficies', nome: '#secoes', seletor: 'main #secoes' },
  { grupo: 'superficies', nome: '#autores', seletor: 'main #autores' },
  { grupo: 'superficies', nome: '#creditos', seletor: 'main #creditos' },

  /*
   * ---- a chamada de acao do #sobre ----
   *
   * `.call-to-action.background-color.rounded` com um gradiente proprio
   * (verde -> azul) que nao aparece em nenhum outro lugar do site. O
   * <ChamadaAcao> da Etapa 3 foi medido no navy da home.
   */
  { grupo: 'chamada', nome: '.call-to-action', seletor: 'main #sobre .call-to-action' },
  { grupo: 'chamada', nome: '.call-to-action .container', seletor: 'main #sobre .call-to-action > .container' },
  { grupo: 'chamada', nome: 'chamada h2', seletor: 'main #sobre .call-to-action h2' },
  { grupo: 'chamada', nome: 'chamada p', seletor: 'main #sobre .call-to-action p' },
  { grupo: 'chamada', nome: 'capa (img)', seletor: 'main #sobre .col-lg-6 img.img-fluid' },

  /*
   * ---- blocos de estrutura ----
   *
   * Tres colunas de texto centralizado sobre fundo escuro. `h3.m-b-0` e o
   * unico h3 do site com margem zerada por classe.
   */
  { grupo: 'estrutura', nome: 'coluna', seletor: 'main #estrutura .row:nth-of-type(2) .col-lg-4' },
  { grupo: 'estrutura', nome: 'h3.m-b-0', seletor: 'main #estrutura h3.m-b-0' },
  { grupo: 'estrutura', nome: 'p', seletor: 'main #estrutura .text-light p' },

  /*
   * ---- indice de capitulos ----
   *
   * O titulo de secao coral (`h4` com `color` inline e `!important`), a linha
   * embaixo (`hr.line` com `border-color` inline), e o par titulo/autor de cada
   * capitulo. Sao 24 capitulos em 3 secoes.
   */
  { grupo: 'indice', nome: 'h4 (secao coral)', seletor: 'main #secoes h4' },
  { grupo: 'indice', nome: 'hr.line', seletor: 'main #secoes hr.line' },
  { grupo: 'indice', nome: 'capitulo (coluna)', seletor: 'main #secoes .col-lg-3' },
  { grupo: 'indice', nome: 'titulo do capitulo', seletor: 'main #secoes .col-lg-3 p.m-b-5' },
  { grupo: 'indice', nome: 'autores do capitulo', seletor: 'main #secoes .col-lg-3 p strong' },

  /*
   * ---- cartao de autor ----
   *
   * O `.team-member` de novo, mas ESCURO: fundo `#0c101b` em `style=` inline,
   * nome em `.text-light`, capitulo num `<span>` azul e cargo em `.text-muted`.
   * Sao 44 cartoes por pagina e 129 dos 140 `style=` inline.
   *
   * O <CartaoMembro> da Etapa 3 foi medido na diretoria, que e clara. Este
   * grupo diz o que muda — e se muda so a cor, ou tambem a caixa.
   */
  { grupo: 'cartaoAutor', nome: '.team-member', seletor: 'main #autores .team-members .team-member' },
  { grupo: 'cartaoAutor', nome: '.team-image img', seletor: 'main #autores .team-member .team-image img' },
  { grupo: 'cartaoAutor', nome: '.team-desc', seletor: 'main #autores .team-member .team-desc' },
  { grupo: 'cartaoAutor', nome: 'h3 (nome)', seletor: 'main #autores .team-member h3' },
  { grupo: 'cartaoAutor', nome: 'span (capitulo)', seletor: 'main #autores .team-member .team-desc span' },
  { grupo: 'cartaoAutor', nome: 'p.text-muted (cargo)', seletor: 'main #autores .team-member p.text-muted' },
  { grupo: 'cartaoAutor', nome: 'linkedin a', seletor: 'main #autores .team-member .align-center a', hover: true },
  { grupo: 'cartaoAutor', nome: 'linkedin i', seletor: 'main #autores .team-member .align-center a i' },
  /* Quantas colunas a grade de autores tem de fato, por faixa. */
  {
    grupo: 'cartaoAutor',
    nome: 'grade de autores',
    seletor: 'main #autores .team-members:last-of-type',
    itens: 'main #autores .team-members:last-of-type > .col-lg-3',
  },

  /*
   * ---- titulo de secao do ebook ----
   *
   * `.heading-text.heading-section` com um `<img>` de medalha acima do `<h2>`.
   * Nao e o `.heading-line` que o <TituloSecao> da Etapa 8 reproduz — aquele
   * tem risco, este tem icone.
   */
  { grupo: 'tituloEbook', nome: '.heading-section', seletor: 'main #autores .heading-section' },
  { grupo: 'tituloEbook', nome: 'icone (img)', seletor: 'main #autores .heading-section img' },
  { grupo: 'tituloEbook', nome: 'h2', seletor: 'main #autores .heading-section h2' },
  { grupo: 'tituloEbook', nome: 'h3 (creditos)', seletor: 'main #creditos h3' },
  { grupo: 'tituloEbook', nome: 'logo fgv', seletor: 'main #creditos img.img-fluid' },
];

const CAIXA = [
  'display', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginBottom', 'backgroundColor', 'borderRadius', 'color',
];
const TEXTO = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'marginBottom'];
/* O gradiente e o motivo deste script existir; ele vem sempre junto da caixa. */
const FUNDO = ['backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'];

const PROPS = {
  cromoEscuro: [...CAIXA, ...FUNDO, ...TEXTO, 'borderTopWidth', 'borderColor', 'borderStyle', 'position'],
  botaoEbook: [...CAIXA, ...FUNDO, ...TEXTO, 'borderWidth', 'borderColor', 'borderStyle', 'width', 'height'],
  hero: [...CAIXA, ...FUNDO, 'position', 'minHeight', 'height', 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'maxWidth', 'width', 'objectFit'],
  superficies: [...CAIXA, ...FUNDO],
  chamada: [...CAIXA, ...FUNDO, 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'maxWidth', 'width', 'overflow'],
  estrutura: [...CAIXA, 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'flexBasis', 'maxWidth'],
  indice: [...CAIXA, ...TEXTO, 'borderTopWidth', 'borderColor', 'borderStyle', 'flexBasis', 'maxWidth', 'opacity'],
  cartaoAutor: [...CAIXA, 'textAlign', 'overflow', 'width', 'height', 'objectFit', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'flexBasis', 'maxWidth', 'borderRadius'],
  tituloEbook: [...CAIXA, 'textAlign', 'fontSize', 'fontWeight', 'lineHeight', 'width', 'height', 'objectFit'],
};

const navegador = await chromium.launch();
const registros = [];

for (const vp of VIEWPORTS) {
  const page = await navegador.newPage({ viewport: { width: vp.width, height: vp.height } });
  const resp = await page.goto(`${BASE}${PAGINA}`, { waitUntil: 'load' });
  if (!resp || !resp.ok()) {
    console.error(`FALHA ao carregar ${PAGINA} — ${resp ? resp.status() : 'sem resposta'}`);
    await page.close();
    continue;
  }

  for (const alvo of ALVOS) {
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
      /*
       * AUSENTE nao e necessariamente defeito aqui: o menu de desktop e o
       * seletor de idioma somem abaixo de 992px, e a topbar nao existe nestas
       * paginas. O aviso continua impresso porque um alvo que desaparece nos
       * TRES viewports e um seletor que nao casa nada — e um seletor que nao
       * casa nada nao falha, ele passa. Ver o CLAUDE.md, Etapa 9.
       */
      console.error(`AUSENTE  ${vp.nome}  ${alvo.nome}  (${alvo.seletor})`);
      continue;
    }

    let hover = null;
    if (alvo.hover) {
      try {
        await page.hover(alvo.seletor, { timeout: 3000 });
        await page.waitForTimeout(400); // o tema anima; sem esperar mede-se o meio
        hover = await medir();
      } catch {
        console.error(`HOVER falhou  ${vp.nome}  ${alvo.nome}`);
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

for (const grupo of Object.keys(PROPS)) {
  const doGrupo = registros.filter((r) => r.grupo === grupo);
  if (!doGrupo.length) continue;
  console.log(`\n=== ${grupo.toUpperCase()} ===`);
  for (const nome of [...new Set(doGrupo.map((r) => r.nome))]) {
    console.log(`\n  ${nome}`);
    for (const r of doGrupo.filter((x) => x.nome === nome)) {
      const util = (v) => v && !['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)', 'repeat', '0%', 'medium'].includes(v);
      const linha = PROPS[grupo]
        .filter((p) => util(r.repouso[p]))
        .map((p) => `${p}=${r.repouso[p]}`)
        .join('  ');
      console.log(`    ${r.viewport.padEnd(8)} ${r.repouso._caixa}${r.repouso._colunas ? `  [${r.repouso._colunas}]` : ''}  ${linha}`);
      if (r.hover) {
        const mudou = PROPS[grupo]
          .filter((p) => r.hover[p] !== r.repouso[p])
          .map((p) => `${p}=${r.hover[p]}`)
          .join('  ');
        console.log(`    ${''.padEnd(8)} hover: ${mudou || '(nada muda)'}`);
      }
    }
  }
}
