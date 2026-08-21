/**
 * Varredura de geometria: 40 paginas x 3 viewports.
 *
 * POR QUE ESTA SUITE EXISTE. Ate aqui, quem protegia o layout era o diff
 * visual. Com a reconstrucao da camada de apresentacao, pixel passa a mudar de
 * proposito e aquele portao cai — e o projeto ficaria sem rede justamente
 * durante a migracao. Pior: `npm run verify` passou 14/14 durante todo o
 * periodo em que a grade de logos estava quebrada, porque teste de
 * comportamento verifica estados pontuais e nao ve layout colapsar.
 *
 * O QUE ELA MEDE, E O QUE NAO MEDE. Mede geometria: caixa com tamanho zero,
 * irmaos sobrepostos, grade que perdeu as colunas, imagem que nao carregou,
 * conteudo transbordando na horizontal. NAO mede altura de pagina — decisao do
 * projeto e que altura nao e criterio (ver docs/deltas-visuais.md). Uma pagina
 * pode encurtar 800px por ter menos conteudo; nao pode encurtar porque uma
 * secao virou zero.
 *
 * Roda em ~2 minutos contra o preview, contra os 15 do diff visual.
 *
 *   node tests/verify-geometria.mjs
 *   PAGES=/index.html VIEWPORTS=desktop node tests/verify-geometria.mjs
 */
import { chromium } from 'playwright';
import { paginasSelecionadas, viewportsSelecionados } from './paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
const PAGINAS = paginasSelecionadas();
const VIEWPORTS = viewportsSelecionados();

/**
 * Contêineres cujos filhos formam uma grade. Sao os que ja quebraram neste
 * projeto ou que quebrariam sem aviso:
 *
 *   .grid-layout   masonry posicionado em JS — onde nasceu o bug do
 *                  `.grid-loaded` que deixou 6 paginas invisiveis
 *   .team-members  a grade de diretoria e conselho
 *   .grid          as grades de logos do tema (grid-5-columns etc.)
 *   .polo-carousel o carrossel de logos, que ja colapsou uma vez
 */
const GRADES = ['.grid-layout', '.team-members', '.grid', '.polo-carousel'];

/*
 * Duas listas, nao uma.
 *
 * O tema chega com defeito de geometria proprio — o `.row` do Bootstrap tem
 * margem negativa e faz a pagina transbordar 30px no mobile e 12px no desktop,
 * medido identico no site original. Bloquear nisso reprovaria as 40 paginas
 * desde o primeiro dia, e um portao que sempre falha nao e portao.
 *
 * Entao: pagina migrada BLOQUEIA, pagina do tema REPORTA. O mesmo criterio do
 * scripts/verifica-sistema.mjs. Conforme a migracao avanca, a lista de
 * pendencias vira lista de falhas sozinha — e o transbordo do `.row` e uma das
 * coisas que o design system existe para consertar, nao para herdar.
 */
const falhas = [];
const pendencias = [];
const registrar = (pagina, vp, o_que, detalhe, migrada) =>
  (migrada ? falhas : pendencias).push({ pagina, vp, o_que, detalhe });

const navegador = await chromium.launch();
let comparacoes = 0;

for (const vp of VIEWPORTS) {
  const ctx = await navegador.newContext({ viewport: { width: vp.width, height: vp.height } });

  for (const caminho of PAGINAS) {
    const page = await ctx.newPage();
    const resp = await page.goto(`${BASE}${caminho}`, { waitUntil: 'load' });
    if (!resp || !resp.ok()) {
      registrar(caminho, vp.nome, 'pagina nao carregou', `HTTP ${resp ? resp.status() : 'sem resposta'}`);
      await page.close();
      continue;
    }

    /*
     * Rola ate o fim e volta. As imagens com loading="lazy" e o IntersectionObserver
     * dos contadores so agem quando entram na viewport — sem isso, metade da
     * pagina e medida antes de existir.
     */
    await page.evaluate(async () => {
      const passo = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += passo) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(350);

    const achados = await page.evaluate((GRADES) => {
      /*
       * A distincao que esta suite inteira depende de acertar:
       *
       *   NAO RENDERIZADO  aba fechada, ancestral com display:none. Pular — nao
       *                    esta na tela e nao deveria estar.
       *   RENDERIZADO COM CAIXA ZERO  esta na arvore de renderizacao e mesmo
       *                    assim nao ocupa area. E o colapso, o defeito.
       *
       * Confundir os dois quebra a suite nas duas direcoes, e ambas ja
       * aconteceram aqui. Filtrar so por `display` proprio acusou 36 "filhos sem
       * tamanho" que eram abas fechadas em /associados. Filtrar tambem pela
       * caixa consertou aquilo e desligou a deteccao de colapso: o teste
       * negativo, com cinco defeitos plantados, passou a achar so dois.
       *
       * `checkVisibility()` responde a primeira pergunta sem responder a
       * segunda — ignora tamanho e olha a arvore de renderizacao. A caixa fica
       * livre para ser o juiz do colapso.
       */
      const renderizado = (el) =>
        typeof el.checkVisibility === 'function'
          ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          : el.offsetParent !== null || getComputedStyle(el).position === 'fixed';

      const visivel = renderizado;

      /*
       * Pagina migrada carrega o bundle do design system; pagina do tema, nao.
       * E o mesmo sinal que o scripts/verifica-sistema.mjs usa, lido aqui em
       * runtime. Serve para separar defeito novo de divida herdada.
       */
      const migrada = !!document.querySelector('link[href*="/_astro/"]');
      const r = [];

      /* 1. Transbordo horizontal ------------------------------------- */
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) {
        // Identifica o culpado, senao a falha e inacionavel.
        let culpado = null;
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0) continue;
          if (b.right > de.clientWidth + 1 && visivel(el)) {
            culpado = `${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0] || '?'} ate ${Math.round(b.right)}px`;
            break;
          }
        }
        r.push(['transbordo horizontal', `scrollWidth ${de.scrollWidth} > ${de.clientWidth}${culpado ? ` — ${culpado}` : ''}`]);
      }

      /* 2. Secao colapsada ------------------------------------------- */
      for (const s of document.querySelectorAll('main section, main > div')) {
        if (!visivel(s)) continue;
        const b = s.getBoundingClientRect();
        if (b.height < 1) {
          r.push(['secao com altura zero', `${s.tagName.toLowerCase()}#${s.id || '(sem id)'}`]);
        }
      }

      /* 3. Imagem que nao carregou ----------------------------------- */
      for (const img of document.querySelectorAll('img')) {
        if (!visivel(img)) continue;
        if (img.complete && img.naturalWidth === 0) {
          r.push(['imagem quebrada', img.getAttribute('src') || '(sem src)']);
        }
      }

      /* 4. Filho de grade sem tamanho -------------------------------- */
      /* 5. Irmaos de grade sobrepostos ------------------------------- */
      for (const sel of GRADES) {
        for (const grade of document.querySelectorAll(sel)) {
          if (!visivel(grade)) continue;
          const filhos = [...grade.children].filter(visivel);
          if (!filhos.length) continue;

          const caixas = filhos.map((f) => f.getBoundingClientRect());

          const zerados = caixas.filter((b) => b.width < 1 || b.height < 1).length;
          if (zerados) {
            r.push(['filho de grade sem tamanho', `${sel} — ${zerados} de ${filhos.length} com caixa zero`]);
          }

          // Sobreposicao. 2px de folga para nao acusar borda encostada.
          let pares = 0;
          for (let i = 0; i < caixas.length && pares < 1; i++) {
            for (let j = i + 1; j < caixas.length; j++) {
              const a = caixas[i], b = caixas[j];
              if (a.width < 1 || b.width < 1) continue;
              const cobre =
                a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
              if (cobre) { pares++; break; }
            }
          }
          if (pares) r.push(['irmaos de grade sobrepostos', `${sel} — ${filhos.length} filhos`]);

          /*
           * Coerencia de colunas: numa tela larga, uma grade com varios filhos
           * tem de ter mais de uma coluna. Uma so significa que o layout
           * colapsou — foi assim que a grade de logos ficou quebrada sem
           * nenhum teste reclamar.
           */
          if (window.innerWidth >= 1025 && filhos.length >= 4) {
            const colunas = new Set(caixas.map((b) => Math.round(b.left))).size;
            if (colunas < 2) r.push(['grade colapsou para 1 coluna', `${sel} — ${filhos.length} filhos`]);
          }
        }
      }

      return { migrada, achados: r };
    }, GRADES);

    for (const [o_que, detalhe] of achados.achados) {
      registrar(caminho, vp.nome, o_que, detalhe, achados.migrada);
    }
    comparacoes += 1;
    await page.close();
  }

  await ctx.close();
  console.log(`varrido: ${vp.nome}`);
}

await navegador.close();

/* ------------------------------------------------------------------ */

console.log(`\n${comparacoes} paginas x viewport verificadas\n`);

const agrupar = (lista) => {
  const m = new Map();
  for (const f of lista) m.set(f.o_que, [...(m.get(f.o_que) || []), f]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

const imprimir = (lista, limite) => {
  for (const [tipo, itens] of agrupar(lista)) {
    console.log(`  ${tipo} — ${itens.length}`);
    for (const f of itens.slice(0, limite)) {
      console.log(`     ${f.vp.padEnd(8)} ${f.pagina.padEnd(38)} ${f.detalhe}`);
    }
    if (itens.length > limite) console.log(`     ... e mais ${itens.length - limite}`);
  }
};

console.log('BLOQUEIAM (paginas ja migradas)');
if (!falhas.length) console.log('  ok — nenhuma caixa zerada, sobreposta, colapsada ou transbordando\n');
else { imprimir(falhas, 12); console.log(''); }

console.log('PENDENTE (dividas do tema; viram bloqueantes quando a pagina migrar)');
if (!pendencias.length) console.log('  nenhuma');
else imprimir(pendencias, process.env.DETALHE ? 999 : 3);

if (falhas.length) {
  console.error(
    `\ngeometria reprovou: ${falhas.length} ocorrencia(s) em ${new Set(falhas.map((f) => f.pagina)).size} pagina(s) migrada(s).`
  );
  process.exit(1);
}
process.exit(0);
