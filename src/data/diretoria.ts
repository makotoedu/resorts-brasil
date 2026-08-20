/**
 * Diretoria e Conselho Consultivo.
 *
 * Estavam escritos a mao nos tres arquivos de pagina, ~350 linhas cada, com
 * dados identicos. Nome, foto e LinkedIn nao mudam entre idiomas.
 *
 * O `cargo` muda ou nao, conforme o que ele e — e essa e a distincao que o tipo
 * registra:
 *
 * - **Diretoria**: sao cargos de verdade ("Vice-Presidente de Operacoes") e
 *   traduzem. Vem como Record por idioma.
 * - **Conselho Consultivo**: o campo traz a EMPRESA do conselheiro ("Grupo
 *   Aviva", "Costao do Santinho Resort"). Nome proprio nao se traduz, entao
 *   continua string simples.
 *
 * Tratar os dois como a mesma coisa foi o que deixou a pagina inteira em
 * portugues nos tres idiomas por anos.
 */
import type { Locale } from '../i18n/ui';

/** String simples quando nao traduz; Record por idioma quando traduz. */
export type Cargo = string | Record<Locale, string>;

export interface Membro {
  nome: string;
  cargo: Cargo;
  foto: string;
  /** Ausente para quem nao tem perfil publico. */
  linkedin?: string;
}

/** Resolve o cargo no idioma pedido. */
export function cargoEm(cargo: Cargo, lang: Locale): string {
  return typeof cargo === 'string' ? cargo : cargo[lang];
}

/*
 * Sobre o genero nos cargos: o espanhol marca o que o portugues marca, e nada
 * alem disso. "Vice-Presidente Administrativo-Financeira" ja vinha no feminino
 * no original, entao o espanhol acompanha; "Vice-Presidente de Inteligencia
 * Humana" e invariavel em portugues e segue invariavel em espanhol. O ingles
 * nao flexiona. A regra e espelhar a fonte, nao inferir.
 */

/** A diretoria do bienio. */
export const diretoria: Membro[] = [
  {
    nome: 'Thiago Borges',
    cargo: {
      'pt-br': 'Presidente do Conselho',
      'en-us': 'Chair of the Board',
      'es-es': 'Presidente del Consejo',
    },
    foto: '/images/diretoria/thiago-borges.png',
    linkedin: 'https://www.linkedin.com/in/thiago-borges-2163169a/',
  },
  {
    nome: 'Antonio Dias',
    cargo: {
      'pt-br': 'Vice-Presidente de Relações Institucionais',
      'en-us': 'Vice President of Institutional Relations',
      'es-es': 'Vicepresidente de Relaciones Institucionales',
    },
    foto: '/images/diretoria/antonio-dias.png',
    linkedin: 'https://www.linkedin.com/in/antonio-dias-a4169687/',
  },
  {
    nome: 'Felipe Castro',
    cargo: {
      'pt-br': 'Vice-Presidente de Operações',
      'en-us': 'Vice President of Operations',
      'es-es': 'Vicepresidente de Operaciones',
    },
    foto: '/images/diretoria/felipe-castro.png',
    linkedin: 'https://www.linkedin.com/in/felipe-castro-b541bbb5/',
  },
  {
    nome: 'Flávia Buiati',
    cargo: {
      'pt-br': 'Vice-Presidente Administrativo-Financeira',
      'en-us': 'Vice President of Administration and Finance',
      'es-es': 'Vicepresidenta Administrativo-Financiera',
    },
    foto: '/images/diretoria/flavia-buiati.png',
    linkedin: 'https://www.linkedin.com/in/flavia-buiati/',
  },
  {
    nome: 'Laini Melo',
    cargo: {
      'pt-br': 'Vice-Presidente de Inteligência Humana',
      'en-us': 'Vice President of Human Intelligence',
      'es-es': 'Vicepresidente de Inteligencia Humana',
    },
    foto: '/images/diretoria/laini-melo.png',
    linkedin: 'https://www.linkedin.com/in/laini-melo-461245101/',
  },
  {
    nome: 'Rodrigo Vaz',
    cargo: {
      'pt-br': 'Vice-Presidente Comercial',
      'en-us': 'Vice President of Sales',
      'es-es': 'Vicepresidente Comercial',
    },
    foto: '/images/diretoria/rodrigo-vaz.png',
    linkedin: 'https://br.linkedin.com/in/rodrigo-vaz-539b5569',
  },
];

/** O conselho consultivo do bienio. */
export const conselhoConsultivo: Membro[] = [
  { nome: 'Alessandro Cunha', cargo: 'Grupo Aviva', foto: '/images/conselho/alessandro-cunha.png', linkedin: 'https://www.linkedin.com/in/alessandro-cunha-16-02/' },
  { nome: 'Annie Morrissey', cargo: 'Bourbon Hospitalidade', foto: '/images/conselho/annie-morrissey.png', linkedin: 'https://www.linkedin.com/in/annie-s-morrissey/' },
  { nome: 'Carlos Jacobina', cargo: 'WTC Events Center e Sheraton São Paulo', foto: '/images/conselho/carlos-jacobina.png', linkedin: 'https://www.linkedin.com/in/carlos-jacobina-b0362b4b/' },
  { nome: 'Daniela Rocco', cargo: 'Costão do Santinho Resort', foto: '/images/conselho/daniela-rocco.png', linkedin: 'https://www.linkedin.com/in/daniela-rocco-6097b623/' },
  { nome: 'Flávio Monteiro', cargo: 'Transamérica Resort Comandatuba', foto: '/images/conselho/flavio-monteiro.png', linkedin: 'https://www.linkedin.com/in/fl%C3%A1vio-monteiro-a95ba855/' },
  { nome: 'Lizete Ribeiro', cargo: 'Grupo Tauá', foto: '/images/conselho/lizete-ribeiro.png', linkedin: 'https://www.linkedin.com/in/lizete-ribeiro-76146097/' },
  { nome: 'Marcelo Picka Van Roey', cargo: 'Grande Hotel Campos do Jordão & Grande Hotel São Pedro', foto: '/images/conselho/marcelo-picka-van-roey.png', linkedin: 'https://www.linkedin.com/in/marcelo-picka-van-roey-84870919/' },
  { nome: 'Maria Helena Santana', cargo: 'Tivoli Eco Resort Praia do Forte', foto: '/images/conselho/maria-helena-santana.png', linkedin: 'https://www.linkedin.com/in/maria-helena-santana-87700735/' },
  { nome: 'Rafael Espírito Santo', cargo: 'Cana Brava All Inclusive Resort', foto: '/images/conselho/rafael-espirito-santo.png' },
  { nome: 'Sérgio Gomes Pinto de Souza', cargo: 'Casa Grande Hotel Resort & SPA', foto: '/images/conselho/sergio-gomes-pinto-de-souza.png', linkedin: 'https://www.linkedin.com/in/s%C3%A9rgio-souza-63808a47/' },
];

/** Bienio exibido sob os dois titulos. */
export const bienio = '2026-2027';
