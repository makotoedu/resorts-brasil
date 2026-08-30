/**
 * Invariantes do design system.
 *
 * A ideia: nao basta o sistema existir, o build precisa FALHAR quando alguem sai
 * dele. Convencao documentada e convencao que se perde na primeira urgencia —
 * foi assim que nasceu o ebook.astro com 140 estilos inline.
 *
 * DURANTE A MIGRACAO ELE FOI MEIO PORTAO. Uma checagem so pode abortar se ja for
 * verdadeira, e nenhuma destas era enquanto 40 paginas rodavam sobre o tema:
 * elas contavam a divida numa lista "PENDENTE" e bloqueavam so no que ja tinha
 * migrado, arquivo por arquivo, numa lista MIGRADAS que crescia a cada etapa.
 *
 * A ETAPA 11 APAGOU AQUELA LISTA, e e a mudanca mais importante deste arquivo: o
 * escopo das checagens deixou de ser um conjunto de nomes e passou a ser `src/`
 * inteiro. Nao ha mais "ainda nao migrou" — arquivo novo nasce dentro do escopo
 * sem ninguem lembrar de inscreve-lo, que era exatamente a falha que uma lista
 * manual tem. As tres linhas de PENDENTE viraram uma so, e ela agora diz zero.
 *
 *   node scripts/verifica-sistema.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Todo o codigo do site. Nao ha mais nada fora do escopo. */
const FONTES = ['src'];

/** Onde cor literal e permitida: e o arquivo que existe para declara-la. */
const ARQUIVO_DE_TOKENS = 'src/styles/tokens.css';

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
         * BLOQUEIA EM TUDO desde a Etapa 11. Antes so valia para os arquivos de
         * MIGRADAS: Header e Footer eram componentes do tema e tinham cor
         * literal de proposito, e inclui-los reprovaria o build por uma divida
         * que a etapa deles pagaria. As duas ultimas do projeto sairam com eles.
         */
        falhas.push(
          `${f}:${i + 1}  cor literal — use um token semantico  › ${semComentario.trim().slice(0, 70)}`
        );
      }
    });
  }
}

/* ------------------------------------------------------------------ *
 * 3. Nenhum style= inline
 * ------------------------------------------------------------------ *
 * Eram 549 no comeco do projeto, 420 deles nas tres paginas de ebook. Ate a
 * Etapa 11 a checagem bloqueava so nas paginas ja migradas e CONTAVA o resto,
 * para o numero cair visivelmente a cada etapa. Chegou a zero fora da allowlist,
 * e o contador virou o que ele sempre quis ser: uma afirmacao.
 *
 * ELA SO VIA `style="` ATE A ETAPA 9, e portanto nao via NADA do que importa num
 * arquivo `.astro`: o estilo calculado se escreve `style={...}`, com chaves. O
 * catalogo tinha tres desde a Etapa 0 — as amostras de cor e de tipografia, que
 * so existem porque leem o token do dado — e o portao nunca os contou. Um buraco
 * assim e pior que a ausencia da checagem: da a impressao de que ela cobre.
 *
 * Com as duas formas contadas, a allowlist que o plano previa desde o inicio
 * ("nenhum `style=` inline FORA DE ALLOWLIST") passa a ser necessaria de fato.
 * Ela guarda o NUMERO esperado por arquivo, e nao so o nome: um `style=` novo
 * numa pagina que ja tem excecao continua reprovando.
 */
const ESTILO_INLINE_PERMITIDO = {
  /*
   * O catalogo pinta a amostra de cada token lendo o proprio token. Escrever as
   * cores no CSS derrotaria o que a vitrine existe para mostrar — e cairia na
   * checagem 2, que e a que de fato protege a paleta.
   */
  'src/pages/design.astro': {
    quantos: 3,
    porque: 'amostras de cor e de tipografia, pintadas a partir do token',
  },
  /*
   * A duracao da volta do carrossel depende de quantos logotipos ha na fila.
   * Sem a variavel, o CSS teria o numero fixo e a faixa aceleraria em silencio
   * quando alguem acrescentasse um resort. Ver a nota no proprio componente.
   */
  'src/components/padroes/CarrosselLogos.astro': {
    quantos: 1,
    porque: '--itens, que da a duracao da volta a partir do tamanho da lista',
  },
};

/* ------------------------------------------------------------------ *
 * 3b. `<Titulo tamanho=>` so onde a escala crua e o assunto
 * ------------------------------------------------------------------ *
 * O <Titulo> separa `nivel` (a tag) de `papel` (a aparencia), e o `papel` tem
 * quatro degraus — pagina, secao, bloco, cartao. `tamanho` e o eixo ANTIGO, que
 * aceitava qualquer degrau da escala crua, e foi ele que produziu o defeito que
 * o tests/verify-tipografia.mjs passou a vigiar: `h2` renderizando em cinco
 * tamanhos (18, 25, 34, 50 e 62px) e `h3` em um so.
 *
 * Ele nao foi removido porque duas coisas legitimamente precisam dele:
 *
 *   PaginaEbook.astro  a landing do e-book tem ESCALA propria (hero em 4xl,
 *                      secoes em 2xl) pelo mesmo motivo que tem paleta propria.
 *   design.astro       o catalogo existe para exibir a escala crua inteira lado
 *                      a lado; pedir que ele use `papel` seria pedir que a
 *                      vitrine escondesse a mercadoria.
 *
 * A allowlist guarda o NUMERO por arquivo, como a do `style=` inline e pelo
 * mesmo motivo: um `tamanho` novo num arquivo ja excepcionado continua
 * reprovando.
 */
const TAMANHO_DE_TITULO_PERMITIDO = {
  'src/components/PaginaEbook.astro': {
    quantos: 11,
    porque: 'a landing do e-book tem escala propria, como tem paleta propria',
  },
  'src/pages/design.astro': {
    quantos: 25,
    porque: 'o catalogo demonstra a escala crua inteira',
  },
};

async function tamanhoDeTituloRestrito(fontes) {
  let total = 0;
  for (const f of fontes) {
    if (!f.endsWith('.astro')) continue;
    const texto = await readFile(join(RAIZ, f), 'utf8');
    /* O comentario que EXPLICA o `tamanho` nao pode reprovar o commit que o
       removeu — ver a nota do linhasSemComentario. */
    const semComentario = linhasSemComentario(texto).join('\n');
    const quantos = [...semComentario.matchAll(/<Titulo\b[^>]*\stamanho="/gs)].length;
    const permitido = TAMANHO_DE_TITULO_PERMITIDO[f];
    total += quantos - (permitido ? Math.min(quantos, permitido.quantos) : 0);

    if (!permitido) {
      if (quantos) {
        falhas.push(
          `${f}  ${quantos} <Titulo tamanho=> fora da allowlist — use \`papel\` ` +
            `(pagina/secao/bloco/cartao)`
        );
      }
    } else if (quantos > permitido.quantos) {
      falhas.push(
        `${f}  ${quantos} <Titulo tamanho=>, e a allowlist permite ${permitido.quantos} ` +
          `(${permitido.porque})`
      );
    } else if (quantos < permitido.quantos) {
      avisos.push(
        `${f}  a allowlist reserva ${permitido.quantos} <Titulo tamanho=> e o arquivo tem ` +
          `${quantos} — baixe o numero em TAMANHO_DE_TITULO_PERMITIDO`
      );
    }
  }
  return total;
}

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
      (n, linha) => n + [...linha.matchAll(/\sstyle=["{]/g)].length,
      0
    );
    const permitido = ESTILO_INLINE_PERMITIDO[f];
    total += quantos - (permitido ? Math.min(quantos, permitido.quantos) : 0);

    if (!permitido) {
      if (quantos) falhas.push(`${f}  ${quantos} style= inline fora da allowlist`);
    } else if (quantos > permitido.quantos) {
      falhas.push(
        `${f}  ${quantos} style= inline, e a allowlist permite ${permitido.quantos} ` +
          `(${permitido.porque})`
      );
    } else if (quantos < permitido.quantos) {
      /* A excecao saiu do arquivo e ficou na lista. Nao quebra nada hoje, e por
         isso mesmo some se ninguem avisar. */
      avisos.push(
        `${f}  a allowlist reserva ${permitido.quantos} style= inline e o arquivo tem ${quantos} — ` +
          `tire a entrada de ESTILO_INLINE_PERMITIDO`
      );
    }
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * 4. Hierarquia de headings — MEDIDA NO dist/
 * ------------------------------------------------------------------ *
 * Um h1, primeiro, sem salto de nivel. A auditoria encontrou 39 das 40 paginas
 * reprovadas — so a 404 passava —, e por isso a checagem passou a maior parte da
 * migracao contando em vez de bloquear. Hoje bloqueia nas 41. O componente
 * <Titulo> separa nivel semantico de tamanho visual, que e a causa raiz: enquanto
 * a tag carregar o estilo, alguem escolhe `<h1>` porque queria o tamanho.
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

  for (const { caminho, html } of paginasDoDist) {
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

    if (problemas.length) falhas.push(`dist/${caminho}  ${problemas.join('; ')}`);
  }
  return paginasDoDist.length;
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
 * 6. Toda pagina tem a folha do sistema, e nenhuma tem a do tema
 * ------------------------------------------------------------------ *
 * A invariante que custou mais caro para descobrir. Instalar o Tailwind e
 * importar a folha no layout do tema fez 22 das 40 paginas divergirem do site
 * original — o Preflight vaza para onde o tema nao declara a mesma propriedade
 * (border-style none->solid em ~2200 elementos, display inline->block em
 * img/svg, max-width none->100%, list-style-type circle->none), e a varredura
 * automatica do Tailwind ainda gerava utilitarias que colidiam com nomes de
 * classe do proprio tema (.container, .border, .table, .card, .row).
 *
 * A solucao foi isolamento por AUSENCIA, e a checagem afirmava isso no artefato
 * em vez de na intencao: pagina do tema nao podia ter bundle do Astro, pagina
 * migrada nao podia ter CSS do tema.
 *
 * COM O TEMA REMOVIDO ELA FICOU MAIS SIMPLES E MAIS DURA. Um lado virou
 * incondicional — toda pagina precisa da folha do sistema — e o outro virou uma
 * afirmacao de ausencia: nenhuma pagina pode carregar `/css/`, que nao existe
 * mais. Vigiar o que ja nao existe parece redundante e nao e; e a mesma classe
 * do "nenhuma pagina baixa webfont de icone" no verify-behaviors.mjs. O que ela
 * pega e a volta: um `<link>` copiado de um exemplo antigo, uma folha global
 * reintroduzida "so para uma landing page". Sem a guarda, isso passa em silencio
 * — e a primeira vez que passou custou 22 paginas.
 *
 * Roda so quando existe dist/. Nao vale a pena buildar para conferir.
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
    /*
     * SO DENTRO DE UM href=, e nao em qualquer lugar do documento.
     *
     * A versao anterior procurava a string solta, e reprovou o /design assim que
     * o catalogo passou a EXPLICAR por que existe um <Video> proprio: aquele
     * texto citava a folha do tema dentro de um `<code>`, e a checagem leu a
     * mencao como se fosse uma folha carregada.
     *
     * E a terceira das QUATRO vezes que um portao deste projeto confundiu
     * documentacao com markup — headings na Etapa 5, `style=` na Etapa 6, esta
     * na 8, e a purga na 11, que vinha rodando contra aquele mesmo `<code>` e
     * ninguem tinha achado. As tres primeiras se resolveram do mesmo jeito:
     * olhar o artefato pelo que ele FAZ, e nao pelo que ele contem. Aqui, o que
     * faz uma folha ser carregada e o atributo.
     *
     * A regra vale mesmo agora que nao ha folha de `/css/` para carregar: e
     * exatamente quando a mencao vira mais provavel que o carregamento.
     */
    const href = (padrao) => new RegExp(`<link[^>]+href="[^"]*${padrao}"`, 'i').test(html);
    const temTema = href('/css/[^"]+\\.css');
    const temSistema = href('/_astro/[^"]+\\.css');
    paginas.push({ caminho, html, temTema, temSistema });
  }
  return paginas;
}

function folhasNoBuild(paginas) {
  if (!paginas) return null;

  for (const { caminho, temTema, temSistema } of paginas) {
    if (temTema) {
      falhas.push(
        `dist/${caminho}  carrega uma folha de /css/ — aquela pasta era o tema Inspiro e foi ` +
          `removida na Etapa 11. Folha global fora do grafo de modulos volta a vazar entre paginas.`
      );
    }
    if (!temSistema) {
      falhas.push(
        `dist/${caminho}  sem a folha do design system — a pagina precisa usar o LayoutSistema`
      );
    }
  }
  return paginas.length;
}

/* ------------------------------------------------------------------ */

const fontes = await arquivos(FONTES[0], ['.astro', '.css', '.ts', '.js']);

await semApply(fontes);
await semCorLiteral(fontes);
const estilosInline = await semEstiloInline(fontes);
const tamanhosSoltos = await tamanhoDeTituloRestrito(fontes);
const componentes = await catalogoCobrePrimitivos(fontes);

const paginasDoDist = await lerDist();
const comFolha = folhasNoBuild(paginasDoDist);
const comHeadings = await hierarquiaHeadings(paginasDoDist);

console.log(`verifica-sistema: ${fontes.length} arquivos em src/\n`);

console.log('BLOQUEIAM O BUILD');
if (falhas.length === 0) {
  console.log(`  ok — nenhuma violacao (${componentes} componentes, todos no catalogo)\n`);
} else {
  for (const f of falhas) console.log(`  FALHA  ${f}`);
  console.log('');
}

/*
 * O QUE JA ESTA GARANTIDO, e nao o que falta.
 *
 * Ate a Etapa 11 este bloco se chamava PENDENTE e listava a divida do tema — o
 * numero caia a cada etapa e virava bloqueante sozinho quando chegava a zero.
 * Chegou. Trocar a lista pelo resumo do que o portao cobre e o que impede a
 * proxima pessoa de ler zero como "esta checagem nao roda".
 */
const semDist = 'dist/ ausente — nao verificado';
console.log('COBERTURA');
console.log(`  style= inline fora da allowlist .. ${estilosInline}`);
console.log(`  <Titulo tamanho=> fora da lista .. ${tamanhosSoltos}`);
console.log(`  cor literal fora de tokens.css ... ${avisos.length}`);
console.log(`  paginas com heading conferido .... ${comHeadings ?? semDist}`);
console.log(`  paginas com a folha do sistema ... ${comFolha ?? semDist}`);

if (avisos.length && process.env.DETALHE) {
  console.log('\nDETALHE');
  for (const a of avisos) console.log(`  ${a}`);
}

if (falhas.length) {
  console.error(`\nverifica-sistema abortou: ${falhas.length} violacao(oes).`);
  process.exit(1);
}
