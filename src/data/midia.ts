/**
 * Midia de terceiro referenciada pelas paginas — video e foto hospedada fora.
 *
 * Sao dois fatos que NAO traduzem e que estao escritos tres vezes cada, uma por
 * idioma. Mesmo criterio do `src/data/juridico.ts`, que reuniu as datas de
 * vigencia dos documentos: identificador de video e URL de imagem nao sao texto
 * traduzivel, entao nao vao para o `ui.ts` — e nao podem ficar no markup, porque
 * markup triplicado diverge.
 *
 * O `titulo` de cada video continua no `ui.ts`: aquele traduz.
 */

/** IDs no YouTube. A miniatura local vive em public/images/video/<id>.jpg. */
export const videos = {
  /** Video institucional, em /resorts-brasil nos tres idiomas. */
  institucional: 'LJ_9oUeE4e8',
  /** Apresentacao do e-book, nas tres paginas de ebook. */
  ebook: 'C-_CoEDJu7o',
} as const;

/**
 * A UNICA imagem do site hospedada em outro dominio.
 *
 * Fica em /resorts-brasil, nos tres idiomas, e o hotlink e herdado: no tema ela
 * era `background-image` num `style=` inline com `height: 400px`, o que a
 * deixava sem `srcset`, sem lazy e sem caixa que acompanhasse a largura.
 *
 * A Etapa 8 recebeu a decisao de PRESERVAR o endereco — entao o que muda e so a
 * forma: ela passa pelo <Imagem>, que a entrega como `<img loading="lazy">`
 * dentro de uma caixa com `aspect-ratio`. Continua fora do pipeline de imagens e
 * continua sendo uma requisicao a images.unsplash.com em cada carregamento; ver
 * a nota de URL ABSOLUTA no proprio componente.
 */
export const fotoResortsBrasil =
  'https://images.unsplash.com/photo-1596436889106-be35e843f974?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80';
