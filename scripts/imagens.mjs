/**
 * Purga e vigilância de imagens, depois do build.
 *
 * ELE TINHA DUAS TAREFAS E FICOU COM UMA E MEIA. A que saiu na Etapa 11 é a
 * PONTE: o `astro:assets` só otimiza o que está em `src/`, então a Etapa 2 levou
 * o acervo de `public/images/` para `src/assets/imagens/` — mas as 40 páginas do
 * tema continuavam pedindo `/images/...` por HTTP, em 162 `<img src>` e 42
 * `background-image` inline. Este script copiava para `dist/images/` só o que
 * ainda era pedido, e a cada página migrada copiava menos.
 *
 * **Ela nunca chegou a copiar zero.** Quando a última página migrou ainda
 * restavam três referências, e as três estavam em código MIGRADO: as duas
 * miniaturas de vídeo do `<Video>` e o logotipo do JSON-LD. Nenhuma delas era
 * dívida do tema; era o hábito do caminho antigo sobrevivendo à camada que o
 * justificava. As duas primeiras passaram pelo `<Imagem>`, a terceira passou a
 * resolver pelo `src/imagens.ts`, e aí sim a ponte pôde sair.
 *
 * O QUE SOBROU:
 *
 * 1. PURGA. O `src/imagens.ts` resolve caminho público para módulo com um
 *    `import.meta.glob` eager, e é o que permite os 183 caminhos de `src/data/`
 *    continuarem strings. O preço: **o Vite emite todo arquivo importado**, use-se
 *    ou não — 8,5 MB duplicados no `dist/` na primeira medição. Aqui eles saem,
 *    pelo mesmo critério do CSS: o que nenhum HTML referencia não vai para
 *    produção.
 *
 * 2. A GUARDA, que virou o contrário do que era. Era "referência sem arquivo
 *    aborta o build", e agora é a afirmação de uma AUSÊNCIA: nenhuma página pode
 *    voltar a pedir `/images/...` fora dos dois arquivos que moram em `public/`
 *    de propósito. É a mesma classe de vigilância do isolamento de folhas no
 *    verifica-sistema.mjs e da webfont no verify-behaviors.mjs — sem ela, o
 *    primeiro `<img src="/images/...">` escrito à mão voltaria a ser um 404 que
 *    só o navegador vê.
 *
 *   node scripts/imagens.mjs        # já embutido no npm run build
 *   DETALHE=1 node scripts/imagens.mjs
 */
import { readFile, stat, readdir, unlink } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('..', import.meta.url);
const DIST = fileURLToPath(new URL('dist/', RAIZ));
const ACERVO = fileURLToPath(new URL('src/assets/imagens/', RAIZ));
const PUBLICO = fileURLToPath(new URL('public/', RAIZ));

const EXTENSOES = /\.(?:png|jpe?g|svg|webp|avif|gif)$/i;

/*
 * Pega `src=`, `srcset=`, `url()` de style inline e também URL absoluta dentro
 * do JSON-LD. Por isso o casamento é no texto do arquivo, e não num atributo
 * específico: um seletor de atributo teria deixado o dado estruturado de fora.
 *
 * A CLASSE É "TUDO MENOS DELIMITADOR", e não uma lista de caracteres válidos. A
 * primeira versão usava `[A-Za-z0-9._%\-/]+`, que parece cobrir nome de arquivo
 * — e não cobre os deste site: `Patrícia-Azevedo.jpg` e `Paulo-Mélega.jpg`, no
 * ebook, têm acento no NOME DO ARQUIVO. As duas referências não eram vistas,
 * então não eram copiadas e não entravam na lista de faltantes: dois 404 em
 * produção, sem nenhum aviso. Foi o relatório de imagens ociosas que denunciou.
 */
const REF_ANTIGA = /\/images\/[^"'\s)\\<>]+\.(?:png|jpe?g|svg|webp|avif|gif)/gi;
const REF_ASTRO = /\/_astro\/[^"'\s)\\<>]+\.(?:png|jpe?g|svg|webp|avif|gif)/gi;

/**
 * Onde uma referência pode aparecer: HTML, e também o CSS e o JS gerados.
 *
 * ATÉ A ETAPA 11 ESTE SCRIPT PRECISAVA RODAR DEPOIS DO purge-css.mjs. Rodando
 * antes, ele lia o `style.css` inteiro do tema — que referencia oito imagens que
 * nunca existiram neste projeto (`expand.png`, `triangle-divider-top.png`, os
 * quatro `overlay-pattern/`…), sobras de um tema comprado — e a guarda abortava
 * o build por causa de regras que a purga apagava em seguida. Com o tema
 * removido não há mais CSS de terceiro em `dist/`, e a ordem deixou de importar;
 * a nota fica porque o mecanismo — guarda que lê o artefato lendo TAMBÉM o que
 * outra etapa ainda vai apagar — é geral.
 */
const ARQUIVOS_QUE_REFERENCIAM = ['**/*.html', '**/*.css', '**/*.js'];

const documentos = [];
for (const padrao of ARQUIVOS_QUE_REFERENCIAM) {
  for await (const p of glob(padrao, { cwd: DIST })) documentos.push(p);
}

const paginas = documentos.filter((d) => d.endsWith('.html'));
if (paginas.length === 0) {
  throw new Error(
    'imagens: abortado, nenhum HTML em dist/. Rode "astro build" antes, ' +
      'e rode este script a partir da raiz do projeto.'
  );
}

/** caminho público -> arquivos gerados que o pedem */
const pedidas = new Map();
/** nomes de arquivo em /_astro/ que alguma página referencia */
const otimizadasEmUso = new Set();

for (const doc of documentos) {
  const texto = await readFile(join(DIST, doc), 'utf8');
  for (const achado of texto.match(REF_ANTIGA) ?? []) {
    if (!pedidas.has(achado)) pedidas.set(achado, []);
    pedidas.get(achado).push(doc);
  }
  for (const achado of texto.match(REF_ASTRO) ?? []) {
    otimizadasEmUso.add(achado.split('/').pop());
  }
}

/* ---------------------------------------------------------------- *
 * 1. Nenhum caminho `/images/` fora dos dois arquivos de public/
 * ---------------------------------------------------------------- *
 * `favicon.png` e `og-image.png` continuam em `public/` porque são pedidos DE
 * FORA do site — pela barra do navegador e pelo scraper de rede social —, e um
 * endereço com hash não serve para isso. Todo o resto do acervo vive em
 * `src/assets/imagens/` e chega à página pelo `<Imagem>`.
 *
 * Qualquer outro `/images/...` no HTML gerado é um 404 esperando o visitante:
 * não existe mais nada em `dist/images/` além do que o Astro copia de `public/`.
 */
const foraDoPipeline = [];
let dePublico = 0;

for (const [caminho, quem] of pedidas) {
  try {
    await stat(join(PUBLICO, caminho.slice(1)));
    dePublico += 1;
  } catch {
    foraDoPipeline.push(`${caminho}  em ${quem.length} arquivo(s), ex.: ${quem[0]}`);
  }
}

if (foraDoPipeline.length) {
  console.error(
    `\nimagens: abortado, ${foraDoPipeline.length} referência(s) a /images/ que não existem em public/:`
  );
  for (const f of foraDoPipeline) console.error(`  ${f}`);
  console.error(
    `\nO acervo vive em src/assets/imagens/ e chega à página pelo <Imagem src="/images/...">,\n` +
      `que resolve o caminho para o arquivo otimizado em /_astro/. Escrito direto num\n` +
      `<img src>, o mesmo caminho vira 404: só favicon.png e og-image.png são servidos\n` +
      `crus, porque são referenciados de fora do site.`
  );
  process.exit(1);
}

/* ---------------------------------------------------------------- *
 * 2. Purga do que o Vite emitiu e ninguém usa
 * ---------------------------------------------------------------- */

let removidos = 0;
let bytesRemovidos = 0;

for (const entrada of await readdir(join(DIST, '_astro'), { withFileTypes: true })) {
  if (!entrada.isFile() || !EXTENSOES.test(entrada.name)) continue;
  if (otimizadasEmUso.has(entrada.name)) continue;
  const alvo = join(DIST, '_astro', entrada.name);
  bytesRemovidos += (await stat(alvo)).size;
  await unlink(alvo);
  removidos += 1;
}

/* ---------------------------------------------------------------- *
 * 3. Relatório
 * ---------------------------------------------------------------- *
 * O que do acervo ninguém pede — nem pelo pipeline, nem de jeito nenhum. É peso
 * morto no repositório, e a distinção sai do nome: o Astro mantém o basename
 * original no arquivo otimizado (`pexels-1134176.Dy5C9mi__1xxPct.jpg`).
 *
 * ATÉ A ETAPA 11 ESTA CONTA TINHA TRÊS CATEGORIAS — pedida pelo tema, otimizada
 * pelo pipeline, ociosa —, e a do meio era o progresso da migração medido em
 * arquivo. Com uma camada só sobraram duas, e o número que importa é o segundo.
 */
const basesEmUso = new Set([...otimizadasEmUso].map((n) => n.split('.')[0]));

const noAcervo = [];
for (const entrada of await readdir(ACERVO, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile()) continue;
  const caminho = relative(ACERVO, join(entrada.parentPath ?? entrada.path, entrada.name));
  noAcervo.push('/images/' + caminho.replace(/\\/g, '/'));
}

const ociosas = noAcervo.filter(
  (c) => !basesEmUso.has(c.split('/').pop().replace(EXTENSOES, ''))
);
const pelasPaginas = noAcervo.length - ociosas.length;

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(
  `  imagens       ${pelasPaginas} pelo pipeline, ${dePublico} cruas de public/; ` +
    `${removidos} emitidas sem uso removidas (${mb(bytesRemovidos)})` +
    (ociosas.length ? `; ${ociosas.length} sem nenhuma referência` : '')
);

if (ociosas.length && process.env.DETALHE) {
  console.log('\n  SEM NENHUMA REFERÊNCIA:');
  for (const c of ociosas) console.log(`    ${c}`);
}
