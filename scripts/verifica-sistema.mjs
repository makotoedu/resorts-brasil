/**
 * Invariantes do design system.
 *
 * A ideia, no mesmo espirito do purge-css.mjs e do check-glifos.mjs: nao basta
 * o sistema existir, o build precisa FALHAR quando alguem sai dele. Convencao
 * documentada e convencao que se perde na primeira urgencia — foi assim que
 * nasceu o ebook.astro com 140 estilos inline.
 *
 * Durante a migracao, uma checagem so pode ABORTAR se ja for verdadeira. As que
 * ainda nao sao (porque dependem de paginas nao migradas) rodam em modo
 * relatorio e viram bloqueantes quando o escopo delas fecha. O estado de cada
 * uma esta na tabela CHECAGENS abaixo — mova para `bloqueia: true` conforme a
 * migracao avanca.
 *
 *   node scripts/verifica-sistema.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Arquivos do sistema novo. O tema em public/css/ esta fora de escopo. */
const FONTES = ['src'];

/** Onde cor literal e permitida: e o arquivo que existe para declara-la. */
const ARQUIVO_DE_TOKENS = 'src/styles/tokens.css';

/**
 * Paginas ja migradas para o design system. Enquanto a lista nao cobrir as 40,
 * as checagens de escopo de pagina so valem para o que esta aqui.
 */
const MIGRADAS = ['src/pages/design.astro'];

const falhas = [];
const avisos = [];

async function arquivos(dir, ext) {
  const saida = [];
  for (const entrada of await readdir(join(RAIZ, dir), { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile()) continue;
    const caminho = relative(RAIZ, join(entrada.parentPath ?? entrada.path, entrada.name)).replace(/\\/g, '/');
    if (ext.some((e) => caminho.endsWith(e))) saida.push(caminho);
  }
  return saida;
}

/* ------------------------------------------------------------------ *
 * 1. Nenhum @apply
 * ------------------------------------------------------------------ *
 * Junta o pior dos dois mundos: utilitarias escondidas dentro de CSS, sem a
 * rastreabilidade de nenhum dos dois. A propria Tailwind desaconselha. Quando
 * precisar de CSS de verdade, escreva CSS de verdade em <style> com escopo.
 */
async function semApply(fontes) {
  for (const f of fontes) {
    const texto = await readFile(join(RAIZ, f), 'utf8');
    const linhas = texto.split('\n');
    linhas.forEach((linha, i) => {
      if (/@apply\b/.test(linha)) falhas.push(`${f}:${i + 1}  @apply — escreva CSS de verdade`);
    });
  }
}

/* ------------------------------------------------------------------ *
 * 2. Nenhuma cor literal fora do tokens.css
 * ------------------------------------------------------------------ *
 * E como a paleta volta a ter 196 cores. Cobre hex, rgb()/rgba() e as classes
 * arbitrarias do Tailwind com cor embutida (bg-[#0c71c3]).
 */
async function semCorLiteral(fontes) {
  const HEX = /#[0-9a-fA-F]{3,8}\b/;
  const RGB = /\brgba?\(\s*\d/;
  for (const f of fontes) {
    if (f === ARQUIVO_DE_TOKENS) continue;
    const texto = await readFile(join(RAIZ, f), 'utf8');
    texto.split('\n').forEach((linha, i) => {
      // Comentario nao pinta nada — e neste projeto os comentarios citam os
      // valores medidos de proposito.
      const semComentario = linha.replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*/, '').replace(/\/\/.*/, '');
      if (HEX.test(semComentario) || RGB.test(semComentario)) {
        /*
         * So bloqueia no que ja migrou. Header e Footer ainda sao componentes
         * do tema e tem cor literal de proposito — inclui-los aqui reprovaria o
         * build por uma divida que a etapa deles vai pagar. Acrescente o
         * arquivo em MIGRADAS quando ele passar para o sistema novo.
         */
        const alvo = MIGRADAS.includes(f) || f.startsWith('src/styles/');
        const msg = `${f}:${i + 1}  cor literal — use um token semantico  › ${semComentario.trim().slice(0, 70)}`;
        (alvo ? falhas : avisos).push(msg);
      }
    });
  }
}

/* ------------------------------------------------------------------ *
 * 3. Nenhum style= inline
 * ------------------------------------------------------------------ *
 * 549 no site hoje, 420 deles nas tres paginas de ebook. A checagem so bloqueia
 * nas paginas ja migradas; nas demais conta, para o numero cair visivelmente a
 * cada etapa.
 */
async function semEstiloInline(fontes) {
  let total = 0;
  for (const f of fontes) {
    if (!f.endsWith('.astro')) continue;
    const texto = await readFile(join(RAIZ, f), 'utf8');
    const achados = [...texto.matchAll(/\sstyle="/g)];
    total += achados.length;
    if (achados.length && MIGRADAS.includes(f)) {
      falhas.push(`${f}  ${achados.length} style= inline em pagina migrada`);
    }
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * 4. Hierarquia de headings
 * ------------------------------------------------------------------ *
 * Um h1, primeiro, sem salto de nivel. Hoje 39 das 40 paginas reprovam — e por
 * isso a checagem ainda nao bloqueia fora das migradas. O componente <Titulo>
 * separa nivel semantico de tamanho visual, que e a causa raiz.
 */
async function hierarquiaHeadings(fontes) {
  const reprovadas = [];
  for (const f of fontes) {
    if (!f.startsWith('src/pages/') || !f.endsWith('.astro')) continue;
    const texto = await readFile(join(RAIZ, f), 'utf8');
    const niveis = [...texto.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    if (!niveis.length) continue;

    const problemas = [];
    const qtdH1 = niveis.filter((n) => n === 1).length;
    if (qtdH1 === 0) problemas.push('sem h1');
    if (qtdH1 > 1) problemas.push(`${qtdH1} h1`);
    if (qtdH1 && niveis.indexOf(1) !== 0) problemas.push(`h${niveis[0]} antes do h1`);
    for (let i = 1; i < niveis.length; i++) {
      if (niveis[i] > niveis[i - 1] + 1) {
        problemas.push(`salto h${niveis[i - 1]}→h${niveis[i]}`);
        break;
      }
    }

    if (problemas.length) {
      const msg = `${f}  ${problemas.join('; ')}`;
      if (MIGRADAS.includes(f)) falhas.push(msg);
      else reprovadas.push(msg);
    }
  }
  return reprovadas;
}

/* ------------------------------------------------------------------ *
 * 5. Isolamento das duas camadas no HTML gerado
 * ------------------------------------------------------------------ *
 * A invariante que custou mais caro para descobrir. Instalar o Tailwind e
 * importar a folha no BaseLayout fez 22 das 40 paginas divergirem do site
 * original — o Preflight vaza para onde o tema nao declara a mesma propriedade
 * (border-style none->solid em ~2200 elementos, display inline->block em
 * img/svg, max-width none->100%, list-style-type circle->none), e a varredura
 * automatica do Tailwind ainda gera utilitarias que colidem com nomes de classe
 * do proprio tema (.container, .border, .table, .card, .row).
 *
 * A solucao foi isolamento por AUSENCIA: a folha entra pelo frontmatter da
 * pagina migrada, nunca pelo layout. Esta checagem afirma isso no artefato, e
 * nao na intencao — pagina do tema nao pode ter bundle do Astro, pagina migrada
 * nao pode ter CSS do tema.
 *
 * Roda so quando existe dist/. Nao vale a pena buildar para conferir.
 */
async function isolamentoNoBuild() {
  let paginas;
  try {
    paginas = (await readdir(join(RAIZ, 'dist'), { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.html'))
      .map((e) => relative(join(RAIZ, 'dist'), join(e.parentPath ?? e.path, e.name)).replace(/\\/g, '/'));
  } catch {
    return null; // sem dist/, nada a conferir
  }

  let migradas = 0;
  for (const p of paginas) {
    const html = await readFile(join(RAIZ, 'dist', p), 'utf8');
    const temTema = /\/css\/(plugins|style|ajustes)\.css/.test(html);
    const temSistema = /\/_astro\/[^"']+\.css/.test(html);

    if (temTema && temSistema) {
      falhas.push(
        `dist/${p}  carrega o CSS do tema E o bundle do design system — ` +
          `o Preflight vaza para o tema. A folha vai no frontmatter da pagina, nao no layout.`
      );
    }
    if (!temTema && !temSistema) {
      falhas.push(`dist/${p}  sem nenhuma folha de estilo`);
    }
    if (temSistema) migradas += 1;
  }
  return { total: paginas.length, migradas };
}

/* ------------------------------------------------------------------ */

const fontes = await arquivos(FONTES[0], ['.astro', '.css', '.ts', '.js']);

await semApply(fontes);
await semCorLiteral(fontes);
const estilosInline = await semEstiloInline(fontes);
const headingsReprovados = await hierarquiaHeadings(fontes);
const isolamento = await isolamentoNoBuild();

console.log(`verifica-sistema: ${fontes.length} arquivos em src/\n`);

console.log('BLOQUEIAM O BUILD');
if (falhas.length === 0) {
  console.log('  ok — nenhuma violacao no escopo ja migrado\n');
} else {
  for (const f of falhas) console.log(`  FALHA  ${f}`);
  console.log('');
}

console.log('PENDENTE (vira bloqueante conforme a migracao avanca)');
console.log(`  style= inline no projeto ......... ${estilosInline}`);
console.log(`  paginas com heading irregular .... ${headingsReprovados.length}`);
console.log(`  cor literal fora de tokens.css ... ${avisos.length}`);
console.log(
  `  paginas migradas ................. ${
    isolamento ? `${isolamento.migradas} de ${isolamento.total} (medido em dist/)` : `${MIGRADAS.length} de 41 (dist/ ausente)`
  }`
);

if (process.env.DETALHE) {
  console.log('\nDETALHE');
  for (const a of [...headingsReprovados, ...avisos]) console.log(`  ${a}`);
}

if (falhas.length) {
  console.error(`\nverifica-sistema abortou: ${falhas.length} violacao(oes) no escopo ja migrado.`);
  process.exit(1);
}
