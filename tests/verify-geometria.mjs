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
 * conteudo transbordando na horizontal e texto vazando da propria caixa (esta
 * ultima entrou na Etapa 5, depois de um defeito que passou pelas outras cinco).
 * NAO mede altura de pagina — decisao do
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
import { paginasSelecionadas, viewportsSelecionados, CATALOGO } from './paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
/* O catalogo entra na varredura completa; com PAGES= a escolha e de quem roda. */
const PAGINAS = process.env.PAGES ? paginasSelecionadas() : [...paginasSelecionadas(), CATALOGO];
const VIEWPORTS = viewportsSelecionados();

/**
 * Contêineres cujos filhos formam uma grade. Sao os que ja quebraram neste
 * projeto ou que quebrariam sem aviso:
 *
 *   .grade         a <Grade> do design system, nas 41 paginas
 *   .trilho        a fila do <CarrosselLogos>, na home
 *
 * O `.grade` ENTROU NA ETAPA 7, e a ausencia dele era um buraco: desde a Etapa 1
 * o design system tem grade propria, e por seis etapas esta varredura so olhou
 * as do tema. Se uma container query fosse escrita errada, a checagem de colunas
 * abaixo — a que teria pego a grade de logos quebrada — nao veria.
 *
 * `.team-members` e `.grid` SAIRAM NA ETAPA 11, com o tema. Ficar vigiando um
 * seletor que nao existe mais nao e inocente: e exatamente a forma do
 * `.polo-carousel` abaixo — uma linha que da a impressao de cobrir e nao cobre.
 *
 * O `.grid-layout` saiu na mesma etapa, e por ter deixado de existir: era o
 * masonry posicionado em JavaScript, onde nasceu o bug do `.grid-loaded` que
 * deixou seis paginas invisiveis. As duas ultimas paginas que o usavam migraram.
 *
 * `.polo-carousel` SAIU NA ETAPA 9, E NUNCA CASOU COM NADA. A celula do carrossel
 * do tema chama-se `.polo-carousel-item`, e um seletor de classe casa o nome
 * inteiro: `.polo-carousel` nao encontrava um elemento sequer, em nenhuma das 41
 * paginas, desde o dia em que foi escrito. Enquanto isso o carrossel que ele
 * dizia vigiar estava INVISIVEL em producao — `opacity: 0` mais
 * `visibility: hidden`, esperando uma classe que o flickity punha. Um seletor que
 * nao casa nada nao falha: ele passa, e passa em silencio.
 *
 * E a razao de `.trilho` entrar no lugar. A checagem de colunas abaixo nao serve
 * para uma fila horizontal, mas as outras cinco servem — e a primeira delas, a de
 * caixa zerada, e exatamente a que teria visto o carrossel do tema.
 */
const GRADES = ['.grade', '.trilho'];

/*
 * UMA LISTA SO, DESDE A ETAPA 11. Eram duas, e vale registrar por que.
 *
 * O tema chegava com defeito de geometria proprio — o `.row` do Bootstrap tem
 * margem negativa e fazia a pagina transbordar 30px no mobile e 12px no desktop,
 * medido identico no site original. Bloquear nisso reprovaria as 40 paginas
 * desde o primeiro dia, e um portao que sempre falha nao e portao. Entao pagina
 * migrada BLOQUEAVA e pagina do tema REPORTAVA, e a lista de pendencias virava
 * lista de falhas sozinha conforme cada uma migrava: 72 na Etapa 0.5, 53 na 6,
 * 33 na 8, 3 na 9, zero na 10.
 *
 * Chegou a zero e a segunda lista perdeu a razao de existir. Toda ocorrencia
 * agora reprova.
 */
const falhas = [];
const registrar = (pagina, vp, o_que, detalhe) => falhas.push({ pagina, vp, o_que, detalhe });

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

      /* 6. Texto vazando da propria caixa ----------------------------- */
      /*
       * A checagem que faltava, e ela nasceu de um defeito real que passou por
       * todos os portoes: na pagina de contato em 390px, os e-mails saiam da
       * coluna e passavam por cima do texto da coluna vizinha.
       *
       * Nenhuma das cinco checagens acima podia ver aquilo. Nao ha caixa zerada,
       * nao ha grade colapsada, e a sobreposicao de irmaos compara CAIXAS — as
       * caixas estavam certas; quem vazava era o conteudo. O transbordo
       * horizontal tambem nao pega, porque o texto vazou dentro do container,
       * sem empurrar a pagina.
       *
       * O criterio e o proprio elemento: `scrollWidth` maior que `clientWidth`
       * quer dizer que ha conteudo fora da caixa na horizontal. A folga de 2px
       * absorve arredondamento de sub-pixel.
       *
       * TRES EXCLUSOES, e a terceira so apareceu quando a checagem rodou:
       *
       *   rolagem propria   um `<pre>`, uma tabela larga ou um carrossel
       *                     transbordam de proposito, e `overflow-x: auto` e a
       *                     declaracao de que aquilo e intencional;
       *   `white-space`     `pre` e `nowrap` pedem para nao quebrar;
       *   FILHO FORA DO FLUXO  um `<li>` de menu com submenu `position:
       *                     absolute` "vaza" pelos 230px do submenu enquanto o
       *                     item mede 118 — e o popup existe justamente para
       *                     sair da caixa. Reprovou o catalogo na primeira
       *                     execucao. Elemento posicionado e uma afirmacao
       *                     explicita de que ele nao mora ali dentro.
       */
      const temFilhoForaDoFluxo = (el) =>
        [...el.querySelectorAll('*')].some((f) => {
          const p = getComputedStyle(f).position;
          return p === 'absolute' || p === 'fixed';
        });

      for (const el of document.querySelectorAll('main p, main li, main h1, main h2, main h3, main h4, main h5, main h6, main span, main td, main th')) {
        if (!visivel(el)) continue;
        if (el.scrollWidth <= el.clientWidth + 2) continue;
        const estilo = getComputedStyle(el);
        if (estilo.overflowX !== 'visible' || estilo.whiteSpace === 'pre' || estilo.whiteSpace === 'nowrap') continue;
        if (temFilhoForaDoFluxo(el)) continue;
        const texto = (el.textContent || '').trim().slice(0, 40);
        r.push([
          'texto vazando da caixa',
          `${el.tagName.toLowerCase()} — ${el.scrollWidth}px de conteudo em ${el.clientWidth}px: "${texto}"`,
        ]);
        break; // um por pagina basta para acionar; o resto e ruido
      }

      return r;
    }, GRADES);

    for (const [o_que, detalhe] of achados) registrar(caminho, vp.nome, o_que, detalhe);
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

const limite = process.env.DETALHE ? 999 : 12;
for (const [tipo, itens] of agrupar(falhas)) {
  console.log(`  ${tipo} — ${itens.length}`);
  for (const f of itens.slice(0, limite)) {
    console.log(`     ${f.vp.padEnd(8)} ${f.pagina.padEnd(38)} ${f.detalhe}`);
  }
  if (itens.length > limite) console.log(`     ... e mais ${itens.length - limite}`);
}

if (!falhas.length) {
  console.log('  ok — nenhuma caixa zerada, sobreposta, colapsada ou transbordando');
} else {
  console.error(
    `\ngeometria reprovou: ${falhas.length} ocorrencia(s) em ${new Set(falhas.map((f) => f.pagina)).size} pagina(s).`
  );
  process.exit(1);
}
process.exit(0);
