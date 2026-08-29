import type { ImageMetadata } from 'astro';

/**
 * O mapa de imagens do site, indexado pelo caminho publico antigo.
 *
 * POR QUE ELE EXISTE. O `astro:assets` so otimiza o que e importado como
 * modulo, e importar exige conhecer o caminho em tempo de compilacao. Mas os
 * caminhos deste site sao DADO, nao codigo: 183 deles moram em `src/data/`
 * (`logo: '/images/associados/almenat.png'`), e outros tantos em markup.
 * Trocar cada string por um `import` significaria reescrever os arquivos de
 * dados — exatamente o que a regra "dado nao e markup" do CLAUDE.md existe para
 * impedir.
 *
 * Com este mapa, `/images/associados/almenat.png` continua sendo a chave em
 * todo lugar, e o `<Imagem>` resolve para o modulo otimizado. Os arquivos de
 * dados nao mudaram uma linha na migracao para o pipeline.
 *
 * A CHAVE E O CAMINHO ANTIGO, e continua sendo depois que o tema saiu. Enquanto
 * as duas camadas conviviam, era o que as fazia falar a mesma lingua: as paginas
 * do tema pediam `/images/...` por HTTP e a ponte do scripts/imagens.mjs
 * atendia. Hoje o motivo e outro e mais simples — e a forma que os 183 caminhos
 * de `src/data/` ja tinham, e trocar todos por outra convencao seria uma
 * varredura sem ganho nenhum.
 *
 * O caminho so tem sentido AQUI DENTRO. Escrito num `<img src>` a mao ele vira
 * 404: `dist/images/` guarda favicon e og-image, e nada mais. O
 * scripts/imagens.mjs aborta o build se algum aparecer.
 */
const modulos = import.meta.glob<{ default: ImageMetadata }>(
  './assets/imagens/**/*.{jpg,jpeg,png,svg,webp,avif}',
  { eager: true }
);

/** `./assets/imagens/hero/x.jpg` -> `/images/hero/x.jpg` */
const chave = (caminho: string) => caminho.replace('./assets/imagens/', '/images/');

export const imagens: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modulos).map(([caminho, modulo]) => [chave(caminho), modulo.default])
);

/**
 * Resolve um caminho publico para a imagem importada.
 *
 * Erro aqui **aborta o build**, e e o ponto: hoje um caminho errado passa
 * despercebido — o navegador pede, recebe 404 e mostra o icone de imagem
 * quebrada. So a varredura de geometria pega, e so depois de gerar o site.
 * Com o mapa, o erro sai no build, com o nome do arquivo e os vizinhos que
 * existem de fato.
 */
export function imagem(caminho: string): ImageMetadata {
  const achada = imagens[caminho];
  if (achada) return achada;

  const pasta = caminho.slice(0, caminho.lastIndexOf('/') + 1);
  const vizinhas = Object.keys(imagens)
    .filter((c) => c.startsWith(pasta))
    .slice(0, 5);

  throw new Error(
    `imagem nao encontrada: ${caminho}\n` +
      `Ela precisa existir em src/assets/imagens/ (public/images/ so guarda favicon e og-image).\n` +
      (vizinhas.length
        ? `Na mesma pasta existem:\n${vizinhas.map((v) => `  ${v}`).join('\n')}`
        : `A pasta ${pasta} nao tem nenhuma imagem.`)
  );
}
