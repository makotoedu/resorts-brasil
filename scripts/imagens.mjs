/**
 * Ponte e purga de imagens, depois do build.
 *
 * Duas tarefas, uma varredura só — porque as duas dependem exatamente da mesma
 * pergunta: **quais imagens o site gerado realmente pede?**
 *
 * 1. PONTE. O `astro:assets` só otimiza o que está em `src/`, então o acervo saiu
 *    de `public/images/` para `src/assets/imagens/`. Mas as 40 páginas do tema
 *    pedem `/images/...` por HTTP, em 162 `<img src>` e 42 `background-image`
 *    inline. Sem a ponte, o acervo inteiro quebraria nelas.
 *
 *    Ela copia só o que ainda é pedido, e é de propósito: **cada página migrada
 *    leva junto as imagens que só ela pedia**, então o peso do `dist/` cai a
 *    cada etapa em vez de esperar a Etapa 11. Quando a última migrar, este
 *    script copia zero e some — mesmo mecanismo do `purge-css.mjs`.
 *
 * 2. PURGA. O `src/imagens.ts` resolve caminho público para módulo com um
 *    `import.meta.glob` eager, e é o que permite os 183 caminhos de `src/data/`
 *    continuarem strings. O preço: **o Vite emite todo arquivo importado**, use-se
 *    ou não. Medido na primeira execução: 198 originais em `dist/_astro/`, 8,5 MB
 *    duplicados ao lado da ponte. Aqui eles saem, pelo mesmo critério do CSS —
 *    o que nenhum HTML referencia não vai para produção.
 *
 * E uma guarda que não existia: referência sem arquivo **aborta o build**. Antes,
 * caminho errado atravessava tudo e virava 404 no navegador.
 *
 *   node scripts/imagens.mjs        # já embutido no npm run build
 *   DETALHE=1 node scripts/imagens.mjs
 */
import { readFile, mkdir, copyFile, stat, readdir, unlink } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('..', import.meta.url);
const DIST = fileURLToPath(new URL('dist/', RAIZ));
const ACERVO = fileURLToPath(new URL('src/assets/imagens/', RAIZ));
const PUBLICO = fileURLToPath(new URL('public/', RAIZ));

const EXTENSOES = /\.(?:png|jpe?g|svg|webp|avif|gif)$/i;

/*
 * Pega `src=`, `srcset=`, `url()` de style inline e também a URL absoluta do
 * logotipo no JSON-LD. Por isso o casamento é no texto do arquivo, e não num
 * atributo específico: um seletor de atributo teria deixado o JSON-LD de fora, e
 * o logo sumiria do dado estruturado sem ninguém ver.
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
 * ESTE SCRIPT RODA DEPOIS DO purge-css.mjs, e não antes. Rodando antes, ele lê o
 * `style.css` inteiro do tema — que referencia oito imagens que nunca existiram
 * neste projeto (`expand.png`, `triangle-divider-top.png`, os quatro
 * `overlay-pattern/`…), sobras de um tema comprado. A guarda de referência sem
 * arquivo abortava o build por causa de regras que a purga apaga em seguida.
 * Depois da purga, o CSS lido é o que de fato vai para produção.
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

/** caminho público -> páginas que o pedem */
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
 * 1. Ponte
 * ---------------------------------------------------------------- */

const faltando = [];
let copiados = 0;
let bytesCopiados = 0;
let jaNoPublico = 0;

for (const [caminho, quem] of pedidas) {
  // favicon.png e og-image.png continuam em public/: são referenciados de fora
  // do site (índice, redes sociais) e não passam pelo pipeline.
  try {
    await stat(join(PUBLICO, caminho.slice(1)));
    jaNoPublico += 1;
    continue;
  } catch {
    /* não está em public/ — segue para o acervo */
  }

  const relativo = caminho.replace(/^\/images\//, '');
  try {
    const info = await stat(join(ACERVO, relativo));
    const destino = join(DIST, 'images', relativo);
    await mkdir(dirname(destino), { recursive: true });
    await copyFile(join(ACERVO, relativo), destino);
    copiados += 1;
    bytesCopiados += info.size;
  } catch {
    faltando.push(`${caminho}  pedida por ${quem.length} arquivo(s), ex.: ${quem[0]}`);
  }
}

if (faltando.length) {
  console.error(`\nimagens: abortado, ${faltando.length} referência(s) sem arquivo:`);
  for (const f of faltando) console.error(`  ${f}`);
  console.error(
    `\nO acervo vive em src/assets/imagens/. Se o arquivo existe com outro nome, ` +
      `corrija a referência; se ele não existe mais, tire a referência.`
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
 * O que sobra do acervo, separado em duas coisas que não se confundem:
 *
 *   OTIMIZADA  ninguém pede por /images/ porque alguma página migrada já a usa
 *              pelo pipeline. É o progresso da migração, medido em arquivo.
 *   OCIOSA     ninguém pede, ponto. Nem pelo caminho antigo, nem otimizada.
 *              É peso morto no repositório.
 *
 * A distinção sai do nome: o Astro mantém o basename original no arquivo
 * otimizado (`pexels-1134176.Dy5C9mi__1xxPct.jpg`).
 */
const basesEmUso = new Set([...otimizadasEmUso].map((n) => n.split('.')[0]));

const noAcervo = [];
for (const entrada of await readdir(ACERVO, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile()) continue;
  const caminho = relative(ACERVO, join(entrada.parentPath ?? entrada.path, entrada.name));
  noAcervo.push('/images/' + caminho.replace(/\\/g, '/'));
}

const sobrando = noAcervo.filter((c) => !pedidas.has(c));
const ociosas = sobrando.filter((c) => !basesEmUso.has(c.split('/').pop().replace(EXTENSOES, '')));
const pipeline = sobrando.length - ociosas.length;

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(
  `  imagens       ${copiados} para o tema (${mb(bytesCopiados)})` +
    (jaNoPublico ? `, ${jaNoPublico} de public/` : '') +
    `, ${pipeline} pelo pipeline; ` +
    `${removidos} emitidas sem uso removidas (${mb(bytesRemovidos)})` +
    (ociosas.length ? `; ${ociosas.length} sem nenhuma referência` : '')
);

if (ociosas.length && process.env.DETALHE) {
  console.log('\n  SEM NENHUMA REFERÊNCIA (nem antiga, nem otimizada):');
  for (const c of ociosas) console.log(`    ${c}`);
}
