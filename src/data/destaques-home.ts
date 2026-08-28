/**
 * Os seis cartoes de destaque da home.
 *
 * Estavam escritos a mao nas tres paginas — seis blocos de doze linhas cada,
 * dezoito copias somando os idiomas —, e a divergencia ja estava la: o rotulo
 * espanhol tratava o leitor por usted num cartao ("Acceda a la cartilla") e por
 * tu no seguinte ("Accede a la guia"), e o titulo ingles do e-book trazia um
 * espaco sobrando no fim.
 *
 * A REGRA DO PROJETO CORTA ESTE BLOCO AO MEIO, como ja cortava a diretoria e as
 * publicacoes: foto, destino e comportamento do link NAO traduzem e ficam aqui;
 * titulo e rotulo traduzem e ficam em `ui.ts`, em `homeHighlights`. As duas
 * metades se encontram pelo `id`, e o <DestaquesHome> aborta o build se um id
 * daqui nao tiver rotulo la — a guarda que a Etapa 8 aprendeu a por sempre que
 * dois arquivos precisam concordar.
 *
 * `rota` e `url` sao exclusivos: `rota` e uma chave de `routes` (o caminho muda
 * com o idioma), `url` e um endereco fixo de outro dominio.
 */
import type { RouteKey } from '../i18n/ui';

export interface DestaqueHome {
  /** Casa com a chave em `ui[lang].homeHighlights`. */
  id: string;
  /** Caminho publico (`/images/...`). Resolvido por src/imagens.ts. */
  imagem: string;
  /** Destino interno, traduzido por idioma. */
  rota?: RouteKey;
  /** Destino externo, igual nos tres idiomas. */
  url?: string;
  /**
   * Abre em outra aba. Vale para os tres links externos e TAMBEM para o e-book,
   * que e pagina deste site — o markup do tema ja o abria assim nos tres
   * idiomas, e a leitura longa e o motivo plausivel. Preservado como estava.
   */
  novaAba?: boolean;
}

export const destaquesHome: DestaqueHome[] = [
  { id: 'apoie', imagem: '/images/hero/pexels-1072842.jpg', rota: 'support' },
  { id: 'associe-se', imagem: '/images/hero/pexels-1437264.jpg', rota: 'joinUs' },
  {
    id: 'turistech',
    imagem: '/images/hero/pexels-450062.jpg',
    url: 'https://www.turistechhub.com.br/',
    novaAba: true,
  },
  {
    id: 'cartilha-esg',
    imagem: '/images/hero/pexels-2246950.jpg',
    url: 'https://drive.google.com/file/d/1DGEOHuJVlPhR7b4iSVQCZDqpviZSeu3c/view',
    novaAba: true,
  },
  {
    id: 'guia-viajante',
    imagem: '/images/hero/pexels-161212.jpg',
    url: 'https://drive.google.com/file/d/1ypL8zoFP8NExwSGdi8tz77XGgYyZy00b/view',
    novaAba: true,
  },
  { id: 'ebook', imagem: '/images/destaques/ebook.png', rota: 'ebook', novaAba: true },
];
