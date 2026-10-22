/**
 * Apara a margem transparente dos logotipos de parceiro.
 *
 * O TAMANHO DE CADA LOGOTIPO SAI DA PROPORCAO DO ARQUIVO. A <ParedeLogos> da a
 * cada marca a mesma AREA, e nao a mesma largura: uma marca larga fica mais
 * baixa, uma quadrada fica mais estreita, e as duas pesam o mesmo na fileira.
 * Para isso ela le largura e altura do arquivo — e uma margem transparente
 * mente a proporcao sem erro nenhum.
 *
 * Era o caso de todos. O acervo chegou em telas de 400x300 com a marca
 * encaixada pela largura ou pela altura, e a tinta ocupava de 10% da tela
 * (Talge, 390x122) a 75% (STR, 300x300). Desenhados na mesma celula, o STR e o
 * R1 dominavam a faixa e o Talge, o ESG Pulse e a Mark Up quase sumiam — uma
 * diferenca de area de 1,9 vez entre duas marcas que estavam ali pelo mesmo
 * motivo.
 *
 * A borda e o primeiro pixel com alfa a partir de 8. Abaixo disso e o resto do
 * anti-aliasing, que nao se ve e nao conta como tinta.
 *
 *   node scripts/aparar-logos.mjs             # apara no lugar
 *   node scripts/aparar-logos.mjs --verificar # so confere; sai com 1 se sobrar margem
 *
 * O `verifica-sistema.mjs` faz a mesma conferencia no build, entao um logotipo
 * novo com margem reprova ali e aponta para este script.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
export const DIRETORIO_DE_LOGOS = 'src/assets/imagens/parceiros';
const ALFA_MINIMO = 8;

/** A caixa da tinta: o menor retangulo que contem todo pixel com alfa visivel. */
export async function caixaDaTinta(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < ALFA_MINIMO) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return {
    largura: info.width,
    altura: info.height,
    tinta: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 },
  };
}

/** Os logotipos com margem, com o tamanho de antes e o da tinta. */
export async function logosComMargem() {
  const nomes = (await readdir(join(RAIZ, DIRETORIO_DE_LOGOS))).filter((f) => f.endsWith('.png'));
  const comMargem = [];
  for (const nome of nomes) {
    const caminho = join(RAIZ, DIRETORIO_DE_LOGOS, nome);
    const buffer = await readFile(caminho);
    const { largura, altura, tinta } = await caixaDaTinta(buffer);
    if (tinta.width !== largura || tinta.height !== altura) {
      comMargem.push({ nome, caminho, buffer, largura, altura, tinta });
    }
  }
  return comMargem;
}

/* O verifica-sistema.mjs importa as duas funcoes acima; aparar so quando chamado. */
const executadoDireto =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (executadoDireto) {
  const verificar = process.argv.includes('--verificar');
  const comMargem = await logosComMargem();

  for (const l of comMargem) {
    const de = `${l.largura}x${l.altura}`;
    const para = `${l.tinta.width}x${l.tinta.height}`;
    if (verificar) {
      console.log(`  ${l.nome.padEnd(34)} ${de} com tinta em ${para}`);
      continue;
    }
    /* PNG sem perda: o pipeline do <Imagem> e quem recomprime, em AVIF e WebP. */
    const aparado = await sharp(l.buffer).extract(l.tinta).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(l.caminho, aparado);
    console.log(`  ${l.nome.padEnd(34)} ${de} -> ${para}`);
  }

  if (verificar && comMargem.length) {
    console.log(`\n${comMargem.length} logotipo(s) com margem transparente — rode node scripts/aparar-logos.mjs`);
    process.exit(1);
  }
  console.log(comMargem.length ? `\n${comMargem.length} aparado(s).` : 'Nenhum logotipo com margem.');
}
