/**
 * Hierarquia VISUAL dos titulos -- 41 paginas x viewports.
 *
 * POR QUE ESTE PORTAO EXISTE, e por que ele nao repete o que ja e verificado.
 *
 * O `scripts/verifica-sistema.mjs` ja confere o SUMARIO: um h1, primeiro, sem
 * salto de nivel. Aquilo e o que o leitor de tela percorre, e esta em zero nas
 * 41 paginas. Este arquivo confere a outra metade -- o que o olho percorre --,
 * e ela nao estava verificada por ninguem.
 *
 * O <Titulo> separou `nivel` (a tag) de `tamanho` (a aparencia) para consertar
 * os 39 sumarios quebrados, e consertou. Mas a aparencia ficou sem regra, e a
 * medicao no navegador mostrou o preco: `h2` renderizava em CINCO tamanhos (18,
 * 25, 34, 50 e 62px) e `h3` em UM (18px, nas 45 ocorrencias). Onde os dois se
 * encontravam em 18px, nivel 2 e nivel 3 eram o mesmo objeto visual.
 *
 * DUAS REGRAS, e as duas saem de defeitos medidos.
 *
 *   1. FILHO MENOR QUE O PAI. O "pai" de um titulo e o titulo anterior de nivel
 *      mais alto -- a arvore que o documento desenha, nao a do DOM. Na home, o
 *      h1 do hero media 62px e o h2 seguinte media 62px: os dois primeiros
 *      titulos do site, indistinguiveis por tamanho.
 *
 *   2. O VOCABULARIO E FECHADO. Todo titulo renderiza em um dos quatro degraus
 *      do `papel` -- pagina, secao, bloco, cartao. A doenca original foi a
 *      proliferacao (h2 em cinco tamanhos), e e ela que esta regra impede de
 *      voltar: um `tamanho` solto, uma classe de utilitaria a mais ou um
 *      `font-size` num `<style>` de pagina aparecem aqui como um numero que nao
 *      pertence a escala.
 *
 * Nenhuma das duas e salto de nivel, entao o checador de sumario passa as duas.
 *
 * UMA REGRA QUE FOI TENTADA E DESCARTADA, e vale registrar por que: "irmaos do
 * mesmo nivel medem igual". Ela achou de fato o defeito que originou este
 * arquivo -- o CTA de /publicacoes em 25px sobre cartoes de 18px --, e depois
 * de corrigido continuou acusando 63 ocorrencias que NAO sao defeito. A causa e
 * do HTML, nao do site: grade de cartao e secao moram no mesmo h2 quando nao ha
 * titulo de secao acima, e exigir que uma grade de cartoes tenha o tamanho da
 * secao seguinte seria pedir que o desenho obedecesse a uma limitacao do
 * formato. Um portao que sempre falha nao e portao.
 *
 * ESCOPO: so o `<main>`. O cabecalho e o rodape tem titulos proprios (as listas
 * do rodape), e eles nao fazem parte da arvore de leitura da pagina -- medi-los
 * junto acusaria o rodape de ser filho da ultima secao do conteudo. A
 * acessibilidade do sumario completo continua com o verifica-sistema.
 *
 * NAO MEDE peso, cor nem espacamento. Mede tamanho, que e o eixo em que a
 * hierarquia falhou.
 *
 * ELE NASCEU CONTADOR E VIROU BLOQUEIO NA MESMA SESSAO. Na primeira execucao
 * eram 33 ocorrencias em 27 paginas; a conversao de `tamanho` para `papel`, a
 * troca do h2 de 62px da home para `secao`, o h1 de /diretoria para `pagina` e
 * as duas secoes do e-book de 3xl para 2xl levaram a zero. Se ele voltar a
 * falhar em massa numa mudanca grande, o caminho e o da geometria na Etapa 0.5:
 * contar ate zerar em vez de afrouxar a regra.
 *
 *   node tests/verify-tipografia.mjs
 *   PAGES=/index.html VIEWPORTS=desktop node tests/verify-tipografia.mjs
 *   DETALHE=1 node tests/verify-tipografia.mjs
 */
import { chromium } from 'playwright';
import { paginasSelecionadas, viewportsSelecionados, CATALOGO } from './paginas.mjs';

const BASE = process.env.BASE || 'http://localhost:4330';
/*
 * O CATALOGO FICA DE FORA, e a excecao e legitima: o /design existe para exibir
 * a escala crua inteira lado a lado, entao ele TEM h4 de 62px ao lado de h4 de
 * 18px de proposito. Incluir aquilo seria pedir que a vitrine obedecesse a
 * regra que ela existe para demonstrar.
 */
const PAGINAS = paginasSelecionadas();
const VIEWPORTS = viewportsSelecionados();

const COLETAR = () => {
  const raiz = document.querySelector('main');
  if (!raiz) return { escala: [], titulos: [] };

  /*
   * A escala sai do CSS, nao de numeros escritos aqui. Quatro sondas com as
   * classes dos quatro `papel`, medidas e removidas -- assim um ajuste no
   * tokens.css nao deixa este portao desatualizado sem avisar, que e o modo de
   * falhar que o projeto ja documentou em outros lugares.
   *
   * QUATRO elementos, e nao um reciclado: trocar a classe de uma sonda so e ler
   * `getComputedStyle` em seguida devolveu o mesmo valor nas quatro leituras --
   * 40/40/40/40, que e o `text-3xl` repetido. Com um elemento por classe, cada
   * um tem estilo proprio e nao ha recalculo para esperar.
   */
  const sondas = ['text-3xl', 'text-xl', 'text-lg', 'text-md'].map((classe) => {
    const el = document.createElement('div');
    el.className = classe;
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.textContent = 'M';
    document.body.appendChild(el);
    return el;
  });
  const escala = sondas.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize)));
  for (const el of sondas) el.remove();

  const titulos = [...raiz.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map((el) => ({
      nivel: Number(el.tagName[1]),
      px: Math.round(parseFloat(getComputedStyle(el).fontSize)),
      texto: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 44),
    }));

  return { escala, titulos };
};

const falhas = [];
let paginasVistas = 0;

const navegador = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  await ctx.addCookies([{ name: 'rb_consent', value: 'v1|a:0,p:0', url: BASE }]);

  for (const caminho of PAGINAS) {
    const page = await ctx.newPage();
    const resposta = await page.goto(BASE + caminho, { waitUntil: 'networkidle' });
    if (!resposta || !resposta.ok()) {
      console.error(`  ${caminho} ${vp.nome}: HTTP ${resposta ? resposta.status() : 'sem resposta'}`);
      await page.close();
      continue;
    }
    const { escala, titulos } = await page.evaluate(COLETAR);
    await page.close();
    paginasVistas += 1;
    if (!titulos.length) continue;

    /*
     * O e-book tem escala propria, declarada, pelo mesmo motivo que tem paleta
     * propria: e a unica pagina do site com desenho proprio. Ele obedece a
     * regra 1 como todas as outras -- so nao usa o vocabulario das outras.
     */
    const ebook = /ebook\.html$/.test(caminho);

    /*
     * O pai de cada titulo: o anterior mais proximo com nivel MENOR. E a mesma
     * arvore que o sumario desenha, montada por varredura em vez de aninhamento
     * -- headings sao irmaos no DOM, a hierarquia deles e de ordem.
     */
    const pais = titulos.map((t, i) => {
      for (let j = i - 1; j >= 0; j--) if (titulos[j].nivel < t.nivel) return j;
      return -1;
    });

    /* Regra 1 -------------------------------------------------------- */
    titulos.forEach((t, i) => {
      const p = pais[i];
      if (p < 0) return;
      if (t.px >= titulos[p].px) {
        falhas.push({
          regra: 'filho nao e menor que o pai',
          pagina: caminho,
          vp: vp.nome,
          detalhe:
            `h${t.nivel} de ${t.px}px sob h${titulos[p].nivel} de ${titulos[p].px}px ` +
            `-- "${t.texto}" sob "${titulos[p].texto}"`,
        });
      }
    });

    /* Regra 2 -------------------------------------------------------- */
    if (!ebook) {
      const fora = [...new Set(titulos.filter((t) => !escala.includes(t.px)).map((t) => t.px))];
      for (const px of fora) {
        const exemplo = titulos.find((t) => t.px === px);
        falhas.push({
          regra: 'tamanho fora da escala do `papel`',
          pagina: caminho,
          vp: vp.nome,
          detalhe:
            `h${exemplo.nivel} em ${px}px, e a escala e ${escala.join('/')}px ` +
            `-- "${exemplo.texto}"`,
        });
      }
    }
  }

  await ctx.close();
  console.log(`varrido: ${vp.nome}`);
}

await navegador.close();

/* ------------------------------------------------------------------ */

console.log(`\n${paginasVistas} paginas x viewport verificadas\n`);

if (!falhas.length) {
  console.log('  ok -- nenhum titulo alcanca o que o contem, e todos estao na escala');
  process.exit(0);
}

const porRegra = new Map();
for (const f of falhas) {
  if (!porRegra.has(f.regra)) porRegra.set(f.regra, []);
  porRegra.get(f.regra).push(f);
}

const limite = process.env.DETALHE ? 999 : 10;
for (const [regra, itens] of [...porRegra.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${regra} -- ${itens.length}`);
  for (const f of itens.slice(0, limite)) {
    console.log(`     ${f.vp.padEnd(8)} ${f.pagina.padEnd(34)} ${f.detalhe}`);
  }
  if (itens.length > limite) console.log(`     ... e mais ${itens.length - limite} (DETALHE=1)`);
}

console.error(
  `\ntipografia reprovou: ${falhas.length} ocorrencia(s) em ${new Set(falhas.map((f) => f.pagina)).size} pagina(s).`
);
process.exit(1);
