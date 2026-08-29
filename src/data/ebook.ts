/**
 * O e-book "A Gestao da Jornada do Viajante" — a publicacao, nao a pagina.
 *
 * Endereco de download, video, ilustracoes e o INDICE: tres secoes com os 24
 * capitulos e quem assina cada um. Estava tudo no markup, identico nas tres
 * paginas de idioma.
 *
 * NADA AQUI TRADUZ, E ISSO E UM ACHADO, NAO UMA ESCOLHA. As tres paginas do
 * ebook sao byte a byte identicas fora o `lang=` do <html>: o conteudo esta em
 * portugues nas tres. Titulo de capitulo de uma publicacao em portugues nao
 * traduz mesmo — e o precedente do `publicacoes.yaml`, "titulo publicado so em
 * portugues" —, mas o resto da pagina tambem nao esta traduzido, e isso e
 * dividia herdada. Ver docs/decisoes.md, "Etapa 10".
 *
 * O tipo ja aceita as duas formas (`string | Record<Locale, string>`), como o
 * `cargo` da diretoria: quando a traducao existir, e uma edicao de campo, nao
 * uma mudanca de estrutura.
 */
import type { Locale } from '../i18n/ui';

/** String quando nao traduz; Record por idioma quando traduz. */
export type Traduzivel = string | Record<Locale, string>;

/** Resolve um campo traduzivel no idioma pedido. */
export function textoEm(texto: Traduzivel, lang: Locale): string {
  return typeof texto === 'string' ? texto : texto[lang];
}

/** Onde o PDF mora. O mesmo link nas tres paginas e nos tres botoes. */
export const downloadEbook =
  'https://drive.google.com/file/d/1xrhzqxzn4P5vkLH-q1PKkk9ljiDS-Tjc/view';

/** O video de apresentacao, no YouTube. O titulo acessivel vem do `ui.ts`. */
export const videoEbook = 'C-_CoEDJu7o';

/**
 * As imagens da pagina. Caminhos publicos (`/images/...`), resolvidos por
 * src/imagens.ts — a mesma convencao dos outros arquivos de `src/data/`.
 */
export const imagensEbook = {
  /** A foto de fundo do topo. */
  fundo: '/images/ebook/background.jpg',
  /** A ilustracao ao lado do titulo. */
  ilustracao: '/images/ebook/viajante.png',
  /** A capa, ao lado da chamada de acao. */
  capa: '/images/ebook/capa.png',
  /** A foto de fundo da secao de video. */
  fundoVideo: '/images/ebook/background-2.jpg',
  /** A textura das duas faixas de credito. */
  textura: '/images/ebook/div.png',
  /** Os dois logotipos, num arquivo so. */
  logos: '/images/ebook/fgv-resortsbrasil.png',
  /** A medalha acima de "Prefacio" e "Autores". */
  medalha: '/images/ebook/icon-award.png',
} as const;

export interface Capitulo {
  titulo: Traduzivel;
  /** Quem assina. No markup vinham colados por " & " numa string so. */
  autores: string[];
}

export interface SecaoEbook {
  /** O numero da secao, exibido como "Secao N: ...". */
  numero: number;
  nome: Traduzivel;
  capitulos: Capitulo[];
}

/**
 * O INDICE, e ele NAO bate com a galeria de autores.
 *
 * Nao ha guarda cruzada entre este arquivo e o `autores-ebook.ts`, e a ausencia
 * e deliberada — ao contrario do <DestaquesHome> e do <BlocoEixo>, que abortam
 * o build quando os dois lados divergem. Aqui os dois lados JA divergem, no
 * conteudo original, e uma guarda so conseguiria reprovar o build de uma pagina
 * que esta no ar ha anos:
 *
 *   - "Carolina Sass" assina um capitulo aqui; a galeria tem "Carolina Haro";
 *   - "Clarissa Santiago" assina um capitulo e nao tem cartao nenhum;
 *   - "Marcelo Picka Van Roey" tem cartao ("Reflexao Final") e nao assina
 *     capitulo nenhum;
 *   - seis capitulos tem titulo diferente nos dois lugares — "Qualidade de
 *     gestao como fator de competitividade..." aqui e "Praticas de gestao como
 *     fonte de desempenho superior" nos cartoes.
 *
 * Sao duas listas mantidas separadamente desde sempre. Reconcilia-las e decidir
 * qual das duas versoes e a certa, e isso e do editor, nao da migracao. Ficam
 * como estao, e a divergencia esta registrada em docs/decisoes.md.
 */
export const secoesEbook: SecaoEbook[] = [
  {
    numero: 1,
    nome: 'Contexto',
    capitulos: [
      {
        titulo: 'O Turismo sob a luz da transformação digital após a pandemia',
        autores: ['Roland de Bonadona'],
      },
      {
        titulo: 'Turistech: a oportunidade da inovação aberta no turismo',
        autores: ['Eduardo Lorea'],
      },
      {
        titulo: 'Desenvolvimento Sustentável e as Sete Revoluções da Sustentabilidade',
        autores: ['Cláudia Pantuffi', 'Dafne Morais'],
      },
      {
        titulo: 'Um novo olhar para a gestão',
        autores: ['Tricia Neves'],
      },
      {
        titulo:
          'Vale a pena correr para chegar atrasado? Considerações sobre educação e formação profissional em turismo',
        autores: ['Mariana Aldrigui'],
      },
      {
        titulo:
          'Qualidade de gestão como fator de competitividade das empresas e fortalecimento do Destino Brasil',
        autores: ['Ana Biselli Aidar', 'Luiz Artur Ledur Brito', 'Mar Vila'],
      },
    ],
  },
  {
    numero: 2,
    nome: 'Elementos Fundamentais',
    capitulos: [
      {
        titulo: 'Transformação digital na jornada do consumidor de turismo',
        autores: ['Patrícia Boaventura', 'Lilian Carvalho', 'Eliane Brito'],
      },
      {
        titulo: 'Os novos comportamentos dos viajantes brasileiros',
        autores: ['Carolina Sass'],
      },
      {
        titulo: 'Tendências em infraestrutura e serviços hoteleiros no cenário futuro',
        autores: ['Juliana Carbonari', 'Pedro Freire', 'Ricardo Mader'],
      },
      {
        titulo: 'Desafios da Operação Hoteleira da era da hospitalidade digital',
        autores: ['Paulo Mélega'],
      },
      {
        titulo: 'Novos produtos para novos comportamentos de consumo em Gastronomia',
        autores: ['Marcelo Traldi'],
      },
      {
        titulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em Viagens e Turismo',
        autores: [
          'Alberto Guerrini',
          'Eduardo Leone',
          'Lucie Chmelikova',
          'Masao Ukon',
          'Leandro Paez',
        ],
      },
      {
        titulo:
          'O passado e o futuro da distribuição Hoteleira estratégica: a história e o impacto na otimização de receitas',
        autores: ['Gabriela Otto'],
      },
      {
        titulo: 'O papel do Marketing Digital neste novo contexto',
        autores: ['Lilian Carvalho', 'Felipe Bogéa'],
      },
    ],
  },
  {
    numero: 3,
    nome: 'Reflexões e Soluções',
    capitulos: [
      {
        titulo:
          'Escuta ativa por meio do Social Listening e Social Analytics: conceitos e exemplo de aplicação em negócios do setor de Turismo',
        autores: ['Patricia Azevedo', 'Beatriz Salles'],
      },
      {
        titulo:
          'Compreendendo os resultados das ações junto ao viajante por meio dos indicadores adequados',
        autores: ['Erich Casagrande'],
      },
      {
        titulo: 'A Cultura de Compartilhamento de Dados',
        autores: ['Patricia Boo', 'Steve Hood'],
      },
      {
        titulo: 'O novo jeito de fazer Revenue Management',
        autores: ['Daniel Feitosa', 'Mário Mouraz'],
      },
      {
        titulo: 'Hotelaria e golpes no Instagram: Como mitigar os riscos',
        autores: ['Alessandro Barreto'],
      },
      {
        titulo: 'Os meios de pagamento como aliados na jornada dos clientes',
        autores: ['Fillipi Nobre'],
      },
      {
        titulo:
          'Do tradicional ao versátil — Como inovar na hotelaria: Swan Generation: um marco evolutivo do ramo hoteleiro brasileiro',
        autores: ['Gabriela Schwan Poltronieri'],
      },
      {
        titulo: 'A experiência do viajante digital na era da assistência',
        autores: ['Clarissa Santiago'],
      },
      {
        titulo: 'Tendências da reputação on-line: Por que as avaliações ainda são importantes?',
        autores: ['Maria Ulrich', 'Michele Martins'],
      },
      {
        titulo: 'O futuro do seu negócio depende de quem está hospedado nele',
        autores: ['Daniela Biedzicki'],
      },
    ],
  },
];

export interface BlocoEstrutura {
  titulo: Traduzivel;
  texto: Traduzivel;
}

/** Os tres blocos que explicam como o e-book esta organizado. */
export const estruturaEbook: BlocoEstrutura[] = [
  {
    titulo: 'Contexto',
    texto:
      'Capítulos que provocam reflexões sobre transformações no contexto do turismo brasileiro, geradas principalmente pela tecnologia e pela pandemia da Covid-19.',
  },
  {
    titulo: 'Elementos Fundamentais',
    texto:
      'Capítulos que mostram as novas tendências de consumo e comportamento no setor e dão insights de como adaptar práticas e negócios ao contexto atual.',
  },
  {
    titulo: 'Reflexões e Soluções',
    texto:
      'Capítulos que trazem soluções concretas para “A Gestão da Jornada do Viajante” dentro do contexto atual, além de cases e exemplos do setor de Turismo.',
  },
];
