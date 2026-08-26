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
 *
 * Os componentes do sistema novo entram junto: eles nao sao pagina, mas estao
 * dentro do escopo desde o primeiro commit — cor literal ou `style=` inline num
 * primitivo contamina toda pagina que o usar.
 */
const MIGRADAS = [
  'src/pages/design.astro',
  /* Etapa 5 — as quatro paginas pequenas, nos tres idiomas. */
  'src/pages/404.astro',
  'src/pages/historia.astro',
  'src/pages/fale-conosco.astro',
  'src/pages/diretoria.astro',
  'src/pages/en-us/history.astro',
  'src/pages/en-us/contact-us.astro',
  'src/pages/en-us/board.astro',
  'src/pages/es-es/historia.astro',
  'src/pages/es-es/contactenos.astro',
  'src/pages/es-es/directorio.astro',
  /* Etapa 6 — os dois documentos juridicos, nos tres idiomas. */
  'src/pages/termos-de-uso.astro',
  'src/pages/politica-de-privacidade.astro',
  'src/pages/en-us/terms-of-use.astro',
  'src/pages/en-us/privacy-policy.astro',
  'src/pages/es-es/terminos-de-uso.astro',
  'src/pages/es-es/politica-de-privacidad.astro',
  /* A secao de cookies passou a emitir markup do sistema junto com elas. */
  'src/components/SecaoCookies.astro',
  /* O layout do sistema e o <head> compartilhado. */
  'src/layouts/LayoutSistema.astro',
  'src/layouts/Cabeca.astro',
  'src/components/primitivos/Titulo.astro',
  'src/components/primitivos/Texto.astro',
  'src/components/primitivos/Botao.astro',
  'src/components/primitivos/Icone.astro',
  'src/components/primitivos/Imagem.astro',
  'src/components/layout/Secao.astro',
  'src/components/layout/Container.astro',
  'src/components/layout/Grade.astro',
  'src/components/padroes/CartaoMembro.astro',
  'src/components/padroes/ChamadaAcao.astro',
  'src/components/padroes/CaixaIcone.astro',
  'src/components/padroes/CartaoPublicacao.astro',
  'src/components/padroes/LinkAcao.astro',
  'src/components/padroes/ListaIcones.astro',
  'src/components/padroes/Hero.astro',
  'src/components/padroes/FaixaDestaque.astro',
  'src/components/padroes/Contador.astro',
  'src/components/padroes/Abas.astro',
  'src/components/padroes/Prosa.astro',
  'src/components/padroes/Tabela.astro',
  'src/components/cromo/Cabecalho.astro',
  'src/components/cromo/Rodape.astro',
  'src/components/cromo/FaixaCookies.astro',
  'src/components/cromo/IconesSociais.astro',
  'src/components/cromo/VoltarAoTopo.astro',
];

/** Onde vivem os componentes do sistema novo, e o catalogo que os documenta. */
const DIRETORIOS_DE_COMPONENTE = [
  'src/components/primitivos',
  'src/components/layout',
  'src/components/padroes',
  /*
   * `cromo/` e a quarta camada, e ela nasceu na Etapa 5 porque ate ali nao havia
   * onde por cabecalho e rodape. Nao sao primitivos (nao compoem nada), nao sao
   * layout (nao sao ortogonais) e nao sao padroes (aparecem uma vez por pagina,
   * sempre nos mesmos lugares) — sao o que embrulha toda pagina. O portao do
   * catalogo vale para eles como vale para os outros tres.
   */
  'src/components/cromo',
];
const CATALOGO = 'src/pages/design.astro';

const falhas = [];
const avisos = [];

/**
 * As linhas do arquivo com os COMENTARIOS apagados, preservando a numeracao.
 *
 * ESTA FUNCAO EXISTE POR UM ERRO QUE JA ACONTECEU DUAS VEZES, e nas duas o
 * sintoma foi o mesmo: o portao reprovou o build por causa da DOCUMENTACAO.
 *
 *   Etapa 5  o checador de headings acusava as duas primeiras paginas migradas
 *            porque os comentarios delas citam `<h1 class="text-md h2">` para
 *            explicar o que foi corrigido;
 *   Etapa 6  o checador de `style=` acusou as duas paginas juridicas porque o
 *            comentario cita `<ul style="color: #525E75;">`, que e exatamente o
 *            markup que aquele commit REMOVEU.
 *
 * Um projeto que documenta o defeito ao lado da correcao vai citar markup em
 * comentario o tempo todo. Quem precisa saber a diferenca e a checagem, e nao
 * quem escreve — a alternativa e pedir que ninguem descreva o que consertou.
 *
 * Trata as tres formas: bloco `/* *\/` (que atravessa linhas), linha `//` e
 * comentario HTML `<!-- -->` (que tambem atravessa linhas).
 */
function linhasSemComentario(texto) {
  let emBloco = false;
  let emHtml = false;
  return texto.split('\n').map((linha) => {
    let saida = '';
    let resto = linha;
    while (resto.length) {
      if (emBloco) {
        const fim = resto.indexOf('*/');
        if (fim === -1) return saida;
        resto = resto.slice(fim + 2);
        emBloco = false;
        continue;
      }
      if (emHtml) {
        const fim = resto.indexOf('-->');
        if (fim === -1) return saida;
        resto = resto.slice(fim + 3);
        emHtml = false;
        continue;
      }
      /* O que vier primeiro: bloco, HTML ou fim de linha. */
      const candidatos = [
        [resto.indexOf('/*'), 'bloco'],
        [resto.indexOf('<!--'), 'html'],
        [resto.indexOf('//'), 'linha'],
      ].filter(([i]) => i !== -1);
      if (!candidatos.length) return saida + resto;
      const [posicao, tipo] = candidatos.reduce((a, b) => (a[0] <= b[0] ? a : b));
      saida += resto.slice(0, posicao);
      if (tipo === 'linha') return saida;
      resto = resto.slice(posicao + (tipo === 'bloco' ? 2 : 4));
      if (tipo === 'bloco') emBloco = true;
      else emHtml = true;
    }
    return saida;
  });
}

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
    linhasSemComentario(texto).forEach((linha, i) => {
      /*
       * Comentario nao pinta nada — disso cuida o `linhasSemComentario` — e
       * `<code>` tambem nao: o catalogo cita os valores medidos como TEXTO, que
       * e metade do que ele existe para fazer.
       */
      const semComentario = linha.replace(/<code>.*?<\/code>/g, '');
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
    /*
     * Sem comentario: a nota que EXPLICA o `style=` removido nao pode reprovar o
     * commit que o removeu. Ver a nota do linhasSemComentario.
     */
    const quantos = linhasSemComentario(texto).reduce(
      (n, linha) => n + [...linha.matchAll(/\sstyle="/g)].length,
      0
    );
    total += quantos;
    if (quantos && MIGRADAS.includes(f)) {
      falhas.push(`${f}  ${quantos} style= inline em pagina migrada`);
    }
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * 4. Hierarquia de headings — MEDIDA NO dist/
 * ------------------------------------------------------------------ *
 * Um h1, primeiro, sem salto de nivel. Hoje 39 das 40 paginas reprovam — e por
 * isso a checagem ainda nao bloqueia fora das migradas. O componente <Titulo>
 * separa nivel semantico de tamanho visual, que e a causa raiz.
 *
 * ELA LIA O FONTE, E ISSO PAROU DE FUNCIONAR NA ETAPA 5 — nos dois sentidos, e
 * os dois sao instrutivos:
 *
 *   FALSO NEGATIVO  pagina migrada nao tem `<h1>` no fonte, tem
 *                   `<Titulo nivel={1}>`. A checagem simplesmente nao via
 *                   heading nenhum e dava a pagina por boa. Pior: como o cromo
 *                   tambem emite headings (os titulos das listas do rodape), o
 *                   sumario real da pagina nunca esteve no arquivo dela.
 *   FALSO POSITIVO  as duas primeiras paginas migradas REPROVARAM por causa dos
 *                   COMENTARIOS: o texto que documenta a correcao cita
 *                   `<h1 class="text-md h2">` e `<h3>`, e o regex nao distingue
 *                   documentacao de markup.
 *
 * A resposta e a mesma que o projeto ja deu para o CSS e para as cores: medir no
 * artefato em vez de ler a intencao. O sumario de uma pagina e o que esta no
 * HTML gerado, incluindo cabecalho e rodape — que e o que um leitor de tela
 * percorre.
 *
 * Sem `dist/` a checagem nao roda. Nao ha aproximacao possivel a partir do
 * fonte, e uma aproximacao que erra nos dois sentidos e pior do que a ausencia.
 */
function headingsDoHtml(html) {
  /* Comentario nao e markup, e `<script>`/`<style>` podem conter qualquer
     coisa. Fora os tres, o que sobra e o documento. */
  const limpo = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return [...limpo.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
}

async function hierarquiaHeadings(paginasDoDist) {
  if (!paginasDoDist) return null;

  const reprovadas = [];
  for (const { caminho, html, migrada } of paginasDoDist) {
    const niveis = headingsDoHtml(html);
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
      const msg = `dist/${caminho}  ${problemas.join('; ')}`;
      if (migrada) falhas.push(msg);
      else reprovadas.push(msg);
    }
  }
  return reprovadas;
}

/* ------------------------------------------------------------------ *
 * 5. Todo componente do sistema esta no catalogo
 * ------------------------------------------------------------------ *
 * "Catalogo escrito depois nunca e escrito" e uma frase do plano, e frase nao
 * segura ninguem na proxima urgencia — foi assim que nasceu o ebook.astro com
 * 140 estilos inline. Esta checagem transforma a regra em portao: componente
 * que existe em src/components/primitivos ou src/components/layout e nao e
 * importado pelo /design reprova o build.
 *
 * Ela nao verifica se TODAS as variantes estao demonstradas — isso nenhum
 * script decide. Verifica a unica parte que da para verificar, que e a que
 * costuma faltar: o componente inteiro.
 */
async function catalogoCobrePrimitivos(fontes) {
  const catalogo = await readFile(join(RAIZ, CATALOGO), 'utf8');
  const componentes = fontes.filter(
    (f) => DIRETORIOS_DE_COMPONENTE.some((d) => f.startsWith(`${d}/`)) && f.endsWith('.astro')
  );
  for (const c of componentes) {
    // O import cita o caminho, entao basta procurar o final dele.
    const trecho = c.replace('src/', '../');
    if (!catalogo.includes(trecho)) {
      falhas.push(`${c}  nao aparece no catalogo (${CATALOGO}) — componente sem vitrine`);
    }
  }
  return componentes.length;
}

/* ------------------------------------------------------------------ *
 * 6. Isolamento das duas camadas no HTML gerado
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
/**
 * Le o dist/ uma vez e marca cada pagina como do tema ou migrada.
 *
 * `migrada` sai do ARTEFATO — carrega bundle do Astro e nao carrega o CSS do
 * tema —, e nao da lista MIGRADAS acima. E a mesma disciplina do resto do
 * arquivo: a lista diz a intencao, o `dist/` diz o que foi entregue. Uma pagina
 * que alguem esqueceu de acrescentar a lista nao escapa das checagens por isso.
 */
async function lerDist() {
  let caminhos;
  try {
    caminhos = (await readdir(join(RAIZ, 'dist'), { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.html'))
      .map((e) => relative(join(RAIZ, 'dist'), join(e.parentPath ?? e.path, e.name)).replace(/\\/g, '/'));
  } catch {
    return null; // sem dist/, nada a conferir
  }

  const paginas = [];
  for (const caminho of caminhos) {
    const html = await readFile(join(RAIZ, 'dist', caminho), 'utf8');
    const temTema = /\/css\/(plugins|style|ajustes)\.css/.test(html);
    const temSistema = /\/_astro\/[^"']+\.css/.test(html);
    paginas.push({ caminho, html, temTema, temSistema, migrada: temSistema && !temTema });
  }
  return paginas;
}

function isolamentoNoBuild(paginas) {
  if (!paginas) return null;

  let migradas = 0;
  for (const { caminho, temTema, temSistema } of paginas) {
    if (temTema && temSistema) {
      falhas.push(
        `dist/${caminho}  carrega o CSS do tema E o bundle do design system — ` +
          `o Preflight vaza para o tema. Pagina migrada usa o LayoutSistema, pagina do tema usa o BaseLayout.`
      );
    }
    if (!temTema && !temSistema) {
      falhas.push(`dist/${caminho}  sem nenhuma folha de estilo`);
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
const componentes = await catalogoCobrePrimitivos(fontes);

const paginasDoDist = await lerDist();
const isolamento = isolamentoNoBuild(paginasDoDist);
const headingsReprovados = await hierarquiaHeadings(paginasDoDist);

console.log(`verifica-sistema: ${fontes.length} arquivos em src/\n`);

console.log('BLOQUEIAM O BUILD');
if (falhas.length === 0) {
  console.log(`  ok — nenhuma violacao no escopo ja migrado (${componentes} componentes, todos no catalogo)\n`);
} else {
  for (const f of falhas) console.log(`  FALHA  ${f}`);
  console.log('');
}

console.log('PENDENTE (vira bloqueante conforme a migracao avanca)');
console.log(`  style= inline no projeto ......... ${estilosInline}`);
console.log(
  `  paginas com heading irregular .... ${
    headingsReprovados ? headingsReprovados.length : 'dist/ ausente — nao verificado'
  }`
);
console.log(`  cor literal fora de tokens.css ... ${avisos.length}`);
console.log(
  `  paginas migradas ................. ${
    isolamento ? `${isolamento.migradas} de ${isolamento.total} (medido em dist/)` : `${MIGRADAS.length} de 41 (dist/ ausente)`
  }`
);

if (process.env.DETALHE) {
  console.log('\nDETALHE');
  for (const a of [...(headingsReprovados ?? []), ...avisos]) console.log(`  ${a}`);
}

if (falhas.length) {
  console.error(`\nverifica-sistema abortou: ${falhas.length} violacao(oes) no escopo ja migrado.`);
  process.exit(1);
}
