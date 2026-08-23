import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n/ui';

/**
 * A camada entre as colecoes e as paginas.
 *
 * As paginas nao chamam `getCollection` nem sabem que um campo pode ser string
 * ou mapa por idioma: elas pedem `publicacoesEm('en-us')` e recebem objetos com
 * strings prontas, ja na ordem de exibicao. Duas consequencias, e as duas sao o
 * ponto da Etapa 4:
 *
 *   acrescentar um campo ao schema nao toca pagina nenhuma — mexe aqui;
 *   a Etapa 7, que troca o markup do tema pelo <CartaoPublicacao>, tambem nao
 *   mexe em dado: o formato que a pagina recebe ja e o formato que o componente
 *   consome.
 *
 * E o mesmo papel que `cargoEm` cumpre em src/data/diretoria.ts, um nivel acima.
 */

/** String simples quando nao traduz; mapa por idioma quando traduz. */
export type Traduzivel = string | Record<Locale, string>;

/**
 * Resolve um campo traduzivel no idioma pedido.
 *
 * Irmao do `cargoEm` do diretoria.ts. Ha dois porque as duas coisas sao
 * diferentes: la o tipo distingue cargo de empresa, aqui distingue titulo
 * traduzido de nome proprio. A forma coincide porque o problema e o mesmo.
 */
export function textoEm(valor: Traduzivel, lang: Locale): string {
  return typeof valor === 'string' ? valor : valor[lang];
}

/** O que uma pagina recebe. Sem uniao de tipos, sem idioma para resolver. */
export interface PublicacaoResolvida {
  id: string;
  titulo: string;
  resumo: string;
  capa: string;
  url: string;
  ano: number;
}

export interface EstudoResolvido {
  id: string;
  titulo: string;
  capa: string;
  url: string;
}

/** `ordem` crescente — ver a nota do campo em src/content.config.ts. */
const porOrdem = <T extends { data: { ordem: number } }>(a: T, b: T) => a.data.ordem - b.data.ordem;

export async function publicacoesEm(lang: Locale): Promise<PublicacaoResolvida[]> {
  const entradas = await getCollection('publicacoes');
  return entradas.sort(porOrdem).map((e: CollectionEntry<'publicacoes'>) => ({
    id: e.id,
    titulo: textoEm(e.data.titulo, lang),
    resumo: textoEm(e.data.resumo, lang),
    capa: e.data.capa,
    url: e.data.url,
    ano: e.data.ano,
  }));
}

/**
 * Uma publicacao pelo id.
 *
 * Existe por causa da pagina de historia, que destaca UMA publicacao — a dos 20
 * anos — fora da lista. Ate a Etapa 5 aquele bloco repetia a capa e a URL do
 * PDF no markup dos tres idiomas, ao lado da mesma capa e da mesma URL na
 * pagina de publicacoes: seis lugares para o mesmo link do Drive.
 *
 * O `throw` nao e zelo: `find` devolveria `undefined` e a pagina sairia com um
 * `<a href="undefined">` e uma capa vazia. Renomear o id no YAML passa a
 * derrubar o build, que e onde esse erro custa menos.
 */
export async function publicacaoEm(id: string, lang: Locale): Promise<PublicacaoResolvida> {
  const encontrada = (await publicacoesEm(lang)).find((p) => p.id === id);
  if (!encontrada) {
    throw new Error(`publicacaoEm: nao existe publicacao com id "${id}" em src/content/publicacoes.yaml.`);
  }
  return encontrada;
}

export async function estudosEm(lang: Locale): Promise<EstudoResolvido[]> {
  const entradas = await getCollection('estudos');
  return entradas.sort(porOrdem).map((e: CollectionEntry<'estudos'>) => ({
    id: e.id,
    titulo: textoEm(e.data.titulo, lang),
    capa: e.data.capa,
    url: e.data.url,
  }));
}
