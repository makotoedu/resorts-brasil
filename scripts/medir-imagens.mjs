/**
 * Mede tamanho x fidelidade de cada formato, para escolher a qualidade.
 *
 * POR QUE ESTE SCRIPT EXISTE. "AVIF e menor que WebP" e verdade em geral e
 * FALSA do jeito que a gente escreve. Medido neste acervo, com o `quality: 80`
 * que o pipeline usava: o AVIF saiu 50% MAIOR que o WebP em todas as sete
 * larguras do hero (96 KB contra 62 KB em 640w). O motivo e que `quality` nao e
 * uma escala comum entre codecs — 80 no AVIF pede muito mais fidelidade do que
 * 80 no WebP. Comparar os dois no mesmo numero compara duas coisas diferentes.
 *
 * Entao o numero sai daqui, e nao do costume: para cada formato, qual e a
 * qualidade mais baixa cuja diferenca perceptivel contra o ORIGINAL ainda e
 * desprezivel — e quantos bytes ela custa.
 *
 * A metrica e a mesma do tests/verify-icones.mjs (pixelmatch com tolerancia
 * perceptiva), pelo mesmo motivo: e a que responde "da para ver?", que e a
 * pergunta. RMSE responderia "os numeros mudaram?", que nao e.
 *
 *   node scripts/medir-imagens.mjs
 */
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

/* Tres amostras com comportamentos de compressao diferentes de proposito:
 * foto ruidosa (o pior caso), retrato (pele e desfoque) e logo (area chapada). */
const AMOSTRAS = [
  { nome: 'hero (foto, folhagem)', arquivo: 'src/assets/imagens/hero/pexels-1134176.jpg' },
  { nome: 'retrato (autor)', arquivo: 'src/assets/imagens/ebook/autores/Caio-Luiz-de-Carvalho.jpg' },
  { nome: 'logo (chapado, PNG)', arquivo: 'src/assets/imagens/associados/almenat.png' },
];

const LARGURA = 1080;
const QUALIDADES = [40, 50, 60, 70, 80];
const FORMATOS = ['avif', 'webp'];

/** Acima disto a diferenca deixa de ser "so o codec" e vira visivel. */
const LIMIAR_PERCEPTIVO = 0.01;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

for (const amostra of AMOSTRAS) {
  const base = sharp(amostra.arquivo).resize(LARGURA, null, { withoutEnlargement: true });
  /*
   * `flatten` sobre branco, e nao `removeAlpha`. Descartar o canal alfa compara
   * os RGB de pixels TRANSPARENTES, que cada codec preenche como quiser — foi o
   * que fez o logo aparecer com 6% de diferenca em toda qualidade de WebP,
   * numero que nao muda com `quality` justamente porque nao era compressao.
   * Achatar sobre branco compara o que o olho ve, que e a imagem sobre a pagina.
   */
  const referencia = await base
    .clone()
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = referencia.info;

  console.log(`\n${amostra.nome}  —  ${width}x${height}`);
  console.log('  formato  q    tamanho    pixels percebidos diferentes');

  for (const formato of FORMATOS) {
    for (const q of QUALIDADES) {
      const codificada = await base.clone().toFormat(formato, { quality: q }).toBuffer();
      const decodificada = await sharp(codificada)
        .flatten({ background: '#ffffff' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // pixelmatch quer RGBA; o raw acima e RGB.
      const paraRgba = (buf) => {
        const out = Buffer.alloc(width * height * 4);
        for (let i = 0, j = 0; i < buf.length; i += 3, j += 4) {
          out[j] = buf[i];
          out[j + 1] = buf[i + 1];
          out[j + 2] = buf[i + 2];
          out[j + 3] = 255;
        }
        return out;
      };

      const diferentes = pixelmatch(
        paraRgba(referencia.data),
        paraRgba(decodificada.data),
        null,
        width,
        height,
        { threshold: 0.1 }
      );
      const fracao = diferentes / (width * height);
      const marca = fracao > LIMIAR_PERCEPTIVO ? ' <-- visivel' : '';
      console.log(
        `  ${formato.padEnd(8)} ${String(q).padEnd(4)} ${kb(codificada.length).padStart(8)}` +
          `   ${(fracao * 100).toFixed(2)}%${marca}`
      );
    }
  }
}
