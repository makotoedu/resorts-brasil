import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
/*
 * O `z` vem de `astro/zod`, e nao de `astro:content`.
 *
 * O Astro 6 empacota Zod v4 e marcou o reexport antigo como deprecado — usar
 * aquele funciona, mas enche o `astro check` de avisos e um dia sai. Este e o
 * mesmo Zod, pelo caminho que continua valendo.
 */
import { z } from 'astro/zod';
import type { Locale } from './i18n/ui';

/**
 * As colecoes de conteudo: publicacoes e estudos.
 *
 * POR QUE ELAS EXISTEM. Ate aqui, cada publicacao era ~18 linhas de markup
 * repetidas nas tres paginas de idioma — 5 publicacoes x 3 idiomas = 15 blocos
 * escritos a mao, mais 4 estudos x 3 = 12. Sao 27 lugares para errar, e o site
 * ja errou em cinco deles: os dois estudos mais novos foram acrescentados sem
 * traduzir o rotulo do link, entao a pagina inglesa dizia "Leia agora" nos dois
 * primeiros cartoes e "Read now" nos dois ultimos.
 *
 * A regra do projeto continua valendo — o que traduz e o que nao traduz moram em
 * lugares diferentes —, mas aqui os dois convivem no MESMO item: o titulo de uma
 * publicacao traduz, a URL do PDF e a capa nao. E o mesmo caso que
 * src/data/diretoria.ts ja resolveu no `cargo`, e a solucao e a mesma: um campo
 * que aceita string quando nao traduz, e um mapa por idioma quando traduz.
 *
 * O QUE O ZOD GARANTE, e que o markup nao garantia:
 *
 *   campo faltando            -> erro de build, com o nome do campo e do item
 *   idioma faltando no mapa   -> erro de build (o mapa exige os tres)
 *   capa apontando para o nada -> erro de build, mas nao aqui: quem aborta e o
 *                                 scripts/imagens.mjs, que le o HTML gerado e
 *                                 nao acha o arquivo. Repetir a checagem aqui
 *                                 obrigaria a importar o mapa de imagens, e com
 *                                 ele o import.meta.glob que a Etapa 2 mediu em
 *                                 8,5 MB de emissao desnecessaria.
 *
 * O schema e enxuto de proposito. Acrescentar campo depois nao toca pagina
 * nenhuma: quem le a colecao e o src/conteudo.ts, e as paginas leem ele.
 */

/**
 * Texto que pode ou nao traduzir.
 *
 * String simples quando o valor e o mesmo nos tres idiomas — nome proprio
 * ("Radar Resorts Brasil Jul/25"), ou um titulo que a associacao publicou so em
 * portugues. Mapa por idioma quando traduz, e ai os TRES sao obrigatorios: e
 * assim que "esqueci de traduzir" vira erro de build em vez de uma pagina
 * inglesa com meia frase em portugues.
 */
/*
 * O `Record<Locale, ...>` e o que amarra este schema ao src/i18n/ui.ts: TypeScript
 * reprova se faltar um idioma ou sobrar um que nao existe. Um quarto idioma no
 * projeto para de compilar aqui, em vez de gerar paginas com campo vazio.
 */
const porIdioma: Record<Locale, z.ZodString> = {
  'pt-br': z.string(),
  'en-us': z.string(),
  'es-es': z.string(),
};

const traduzivel = z.union([z.string(), z.object(porIdioma)]);

/** O que publicacao e estudo tem em comum. */
const base = {
  /**
   * A ordem de exibicao, do topo para baixo.
   *
   * E um campo e nao a ordem do arquivo porque `getCollection` nao promete
   * devolver as entradas na ordem em que foram lidas — o dado vem de um store,
   * nao do YAML. `src/data/associados.ts` pode dizer "a ordem deste arquivo e a
   * ordem de exibicao"; uma colecao nao pode.
   */
  ordem: z.number().int().positive(),
  titulo: traduzivel,
  /** Caminho publico da capa (`/images/...`), como em todo o resto do projeto. */
  capa: z.string().startsWith('/images/'),
  /** O PDF. Mora no Google Drive, entao e sempre link externo. */
  url: z.url(),
};

const publicacoes = defineCollection({
  loader: file('src/content/publicacoes.yaml'),
  schema: z.object({
    ...base,
    /** A frase sob o titulo. Traduz. */
    resumo: traduzivel,
    /** O ano, no distintivo sobre a capa. So publicacao tem. */
    ano: z.number().int().min(2000).max(2100),
  }),
});

const estudos = defineCollection({
  loader: file('src/content/estudos.yaml'),
  /*
   * Estudo NAO tem resumo nem ano — nao e simplificacao, e o que as paginas
   * mostram. O schema enxuto e o que faz "acrescentar um campo depois" ser uma
   * decisao, e nao a descoberta de que metade dos itens nunca o preencheu.
   */
  schema: z.object(base),
});

export const collections = { publicacoes, estudos };
