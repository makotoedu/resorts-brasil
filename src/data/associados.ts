/**
 * Os resorts associados, por regiao e estado.
 *
 * Estavam escritos a mao em tres arquivos (associados, associates, asociados)
 * com ~600 linhas cada. Os dados nao tem variacao por idioma: as tres listas
 * eram identicas, 78 resorts na mesma ordem, com os nomes dos estados tambem em
 * portugues nos tres. O que traduz e o rotulo da aba, que fica em `ui`
 * (src/i18n/ui.ts). Hoje sao 79: o Monthez (SC) entrou em 31/08/2026.
 *
 * A ordem deste arquivo e a ordem de exibicao.
 */

export interface Resort {
  /** Nome exibido, usado como alt do logo e nome acessivel do link. */
  nome: string;
  logo: string;
  url: string;
}

export interface EstadoAssociados {
  /** Sigla, que vira o id da <div> — o markup original ja usava assim. */
  uf: string;
  estado: string;
  resorts: Resort[];
}

export interface RegiaoAssociados {
  /** Id da aba e do painel: sudeste, sul, norte, nordeste, centro-oeste. */
  id: string;
  estados: EstadoAssociados[];
}

export const regioesAssociados: RegiaoAssociados[] = [
  {
    id: 'sudeste',
    estados: [
      {
        uf: 'SP',
        estado: 'São Paulo',
        resorts: [
          { nome: 'Almenat Tapestry Collection by Hilton', logo: '/images/associados/almenat.png', url: 'https://hotelalmenat.com.br/' },
          { nome: 'blue tree thermas de lins resort', logo: '/images/associados/blue-tree-thermas-de-lins-resort.png', url: 'http://bluetreethermasdelins.com.br/' },
          { nome: 'bourbon atibaia', logo: '/images/associados/bourbon-atibaia-resort.png', url: 'https://www.bourbon.com.br/hotel/bourbon-atibaia' },
          { nome: 'casa grande hotel resort', logo: '/images/associados/casa-grande-hotel-resort-spa.png', url: 'https://www.casagrandehotel.com.br/' },
          { nome: 'clara resorts', logo: '/images/associados/clara-resorts.jpg', url: 'https://www.clararesorts.com.br/' },
          { nome: 'clubmed', logo: '/images/associados/clubmed.png', url: 'https://www.clubmed.com.br/r/lake-paradise/y' },
          { nome: 'japy golf resort hotel', logo: '/images/associados/japy-golf-resort-hotel.png', url: 'https://www.japygolfresort.com.br/' },
          { nome: 'cyan resort', logo: '/images/associados/cyan-resort.png', url: 'https://www.reserveatlantica.com.br/hotel/cyan-resort' },
          { nome: 'Hotel Histórico Dona Carolina', logo: '/images/associados/fazenda-dona-carolina.png', url: 'https://www.hotelfazendadonacarolina.com.br/' },
          { nome: 'Resort Fazenda São João', logo: '/images/associados/resort-fazenda-sao-joao.png', url: 'https://hotelfazendasaojoao.com.br/' },
          { nome: 'Grand Hotel Campos do Jordão', logo: '/images/associados/grand-hotel-campos-do-jordao.png', url: 'https://grandehotelsenac.com.br/ghj_hotel/grande-hotel-campos-do-jordao/' },
          { nome: 'Grand Hotel São Pedro', logo: '/images/associados/grand-hotel-sao-pedro.png', url: 'https://grandehotelsenac.com.br/ghp_hotel/grande-hotel-sao-pedro/' },
          { nome: 'Hot Beach Resort', logo: '/images/associados/hot-beach-resort.png', url: 'https://hotbeach.com.br/hot-beach-resort/' },
          { nome: 'Hot Beach Celebration', logo: '/images/associados/hot-beach-celebration.png', url: 'https://hotbeach.com.br/celebration/' },
          { nome: 'Hot Beach Raízes', logo: '/images/associados/hot-beach-raizes.png', url: 'https://hotbeach.com.br/raizes/' },
          { nome: 'Hot Beach Suites Olimpia', logo: '/images/associados/hot-beach-suites.png', url: 'https://hotbeach.com.br/hot-beach-suites/' },
          { nome: 'Hotel JP Ribeirão Preto', logo: '/images/associados/hotel-jp.png', url: 'https://www.nacionalinn.com.br/hoteis/hotel-jp-ribeirao-preto' },
          { nome: 'Mavsa Resort', logo: '/images/associados/mavsa.png', url: 'https://mavsaresort.com/' },
          { nome: 'Novotel Itu', logo: '/images/associados/novotel-itu.png', url: 'https://www.novotelitu.com.br/' },
          { nome: 'Royal Palm Plaza Resort Campinas', logo: '/images/associados/royal-palm-plaza-resort-campinas.png', url: 'https://royalpalm.com.br/' },
          { nome: 'Sofitel Jequitimar Guarujá', logo: '/images/associados/sofitel-jequitimar-guaruja.png', url: 'https://all.accor.com/hotel/6383/index.pt-br.shtml' },
          { nome: 'Tauá Resort Atibaia', logo: '/images/associados/taua-resort-atibaia.png', url: 'https://reservas.tauaresorts.com.br/atibaia' },
          { nome: 'Villa Rossa Hotel', logo: '/images/associados/villa-rossa.png', url: 'https://www.villarossa.com.br/' },
        ],
      },
      {
        uf: 'RJ',
        estado: 'Rio de Janeiro',
        resorts: [
          { nome: 'clubmed', logo: '/images/associados/clubmed.png', url: 'https://www.clubmed.com.br/r/rio-das-pedras/y' },
          { nome: 'le canton', logo: '/images/associados/le-canton.png', url: 'https://lecanton.com.br/' },
        ],
      },
      {
        uf: 'MG',
        estado: 'Minas Gerais',
        resorts: [
          { nome: 'Clara Arte Resort', logo: '/images/associados/clara-arte-resort.png', url: 'https://clararesorts.com.br/clara-arte' },
          { nome: 'Santíssimo Resort', logo: '/images/associados/santissimo-resort.png', url: 'https://santissimoresort.com.br/' },
          { nome: 'tauá resort caete', logo: '/images/associados/taua-resort-caete.png', url: 'https://reservas.tauaresorts.com.br/caete' },
          { nome: 'thermas all inclusive', logo: '/images/associados/thermas-all-inclusive.png', url: 'https://www.nacionalinn.com.br/hoteis/hotel-thermas-resort-walter-world' },
          { nome: 'Vale Suíço Resort', logo: '/images/associados/vale-suico-resort.png', url: 'https://www.valesuico.com.br/' },
        ],
      },
      {
        uf: 'ES',
        estado: 'Espírito Santo',
        resorts: [
          { nome: 'China Park Eco Resort', logo: '/images/associados/china-park-eco-resort.png', url: 'https://chinapark.com.br/' },
        ],
      },
    ],
  },
  {
    id: 'sul',
    estados: [
      {
        uf: 'PR',
        estado: 'Paraná',
        resorts: [
          { nome: 'Blue Tree Daj', logo: '/images/associados/blue-tree-daj.png', url: 'https://www.bluetreedaj.com.br/' },
          { nome: 'Bourbon Foz do Iguaçu', logo: '/images/associados/bourbon-cataratas-do-iguacu-thermas-eco-resort.png', url: 'https://www.bourbon.com.br/hotel/bourbon-cataratas-do-iguacu' },
          { nome: 'Jurema Águas Quentes', logo: '/images/associados/jurema-aguas-quentes.png', url: 'https://juremaaguasquentes.com.br/' },
          { nome: 'Mabu Hotel Curitiba', logo: '/images/associados/mabu-hoteis-resorts.png', url: 'https://www.hoteismabu.com.br/hoteis/mabu-curitiba-business' },
          { nome: 'Recanto Cataratas Thermas Resort', logo: '/images/associados/recanto-cataratas-thermas-resort.png', url: 'https://www.recantocataratasresort.com.br/' },
          { nome: 'Wish Foz do Iguaçu', logo: '/images/associados/wish-foz-do-iguacu.png', url: 'https://www.wishhotels.com.br/wish-foz-do-iguacu' },
        ],
      },
      {
        uf: 'RS',
        estado: 'Rio Grande do Sul',
        resorts: [
          { nome: 'Machadinho Thermas Resort Spa', logo: '/images/associados/machadinho-thermas-resort-spa.png', url: 'https://machadinhothermas.com.br/' },
          { nome: 'Wish Serrano', logo: '/images/associados/wish-serrano.png', url: 'https://www.wishhotels.com.br/wish-serrano' },
        ],
      },
      {
        uf: 'SC',
        estado: 'Santa Catarina',
        resorts: [
          { nome: 'Costão do Santinho', logo: '/images/associados/costao-do-santinho.png', url: 'https://costao.com.br/' },
          { nome: 'Fazzenda park hotel', logo: '/images/associados/fazzenda-park-hotel.png', url: 'https://www.fazzenda.com.br/' },
          { nome: 'Monthez', logo: '/images/associados/monthez.png', url: 'https://monthez.com.br/' },
        ],
      },
    ],
  },
  {
    id: 'norte',
    estados: [
      {
        uf: 'AM',
        estado: 'Manaus',
        resorts: [
          { nome: 'iberostar grand amazon', logo: '/images/associados/iberostar-grand-amazon.png', url: 'https://www.iberostar.com/br/hoteis/manaus/iberostar-grand-amazon/' },
        ],
      },
    ],
  },
  {
    id: 'nordeste',
    estados: [
      {
        uf: 'BA',
        estado: 'Bahia',
        resorts: [
          { nome: 'Resort Arcobaleno', logo: '/images/associados/arcobaleno.png', url: 'https://hotelarcobaleno.com.br/' },
          { nome: 'catussaba resort hotel', logo: '/images/associados/catussaba-resort-hotel.png', url: 'http://www.catussaba.com.br/' },
          { nome: 'cana brava all inclusive resort', logo: '/images/associados/cana-brava-all-inclusive-resort.png', url: 'https://canabravaresort.com.br/' },
          { nome: 'clubmed', logo: '/images/associados/clubmed.png', url: 'https://www.clubmed.com.br/r/trancoso/y' },
          { nome: 'costa do sauipe resorts', logo: '/images/associados/costa-do-sauipe-resorts.png', url: 'https://www.costadosauipe.com.br/' },
          { nome: 'Jardim Atlântico Beach Resort', logo: '/images/associados/jardim-atlantico.png', url: 'https://www.resortjardimatlantico.com.br/' },
          { nome: 'grand palladium imbassai', logo: '/images/associados/grand-palladium-imbassai.png', url: 'https://www.palladiumhotelgroup.com/pt/hoteis/brasil/bahia/grand-palladium-imbassai-resort-spa' },
          { nome: 'iberostar bahia', logo: '/images/associados/iberostar-bahia.png', url: 'https://www.iberostar.com/br/hoteis/praia-do-forte/iberostar-bahia/' },
          { nome: 'iberostar praia do forte', logo: '/images/associados/iberostar-praia-do-forte.png', url: 'https://www.iberostar.com/br/hoteis/praia-do-forte/iberostar-praia-do-forte/' },
          { nome: 'La Torre Resort', logo: '/images/associados/la-torre-resort.png', url: 'https://resortlatorre.com.br/' },
          { nome: 'tivoli bahia ecoresort', logo: '/images/associados/tivoli-bahia-ecoresort.png', url: 'https://www.tivolihotels.com/pt/tivoli-ecoresort-praia-do-forte' },
          { nome: 'Toromba Resort', logo: '/images/associados/toromba.png', url: 'https://tororomba.com.br/' },
          { nome: 'transamerica resort comandatuba', logo: '/images/associados/transamerica-resort-comandatuba.png', url: 'https://www.transamericacomandatuba.com.br/' },
        ],
      },
      {
        uf: 'AL',
        estado: 'Alagoas',
        resorts: [
          { nome: 'Ipioca Beach Residence & Resort', logo: '/images/associados/ipioca-beach.png', url: 'https://ipiocabeachresidence.com.br/' },
          { nome: 'japaratinga louge resort', logo: '/images/associados/japaratinga-louge-resort.png', url: 'https://www.japaratingaresort.com.br/pt' },
          { nome: 'jatiuca hotel resort', logo: '/images/associados/jatiuca-hotel-resort.png', url: 'https://www.hoteljatiuca.com.br/' },
          { nome: 'Maceió Mar All Inclusive Resort', logo: '/images/associados/maceio-mar.png', url: 'https://mmehoteis.com.br/maceio-mar-resort/' },
          { nome: 'salinas maceio resort', logo: '/images/associados/salinas-maceio-resort.png', url: 'https://www.salinas.com.br/pt/maceio/' },
          { nome: 'salinas maragogi resort', logo: '/images/associados/salinas-maragogi-resort.png', url: 'https://www.salinas.com.br/pt/maragogi/' },
          { nome: 'pratagy beach resort', logo: '/images/associados/pratagy-beach-resort.png', url: 'https://www.pratagy.com.br/' },
        ],
      },
      {
        uf: 'PE',
        estado: 'Pernambuco',
        resorts: [
          { nome: 'Armação Resort Porto de Galinhas', logo: '/images/associados/armacao-resort-porto-de-galinhas.png', url: 'https://armacaoresort.com/pt/' },
          { nome: 'Enotel Porto de Galinhas', logo: '/images/associados/enotel-porto-de-galinhas.png', url: 'https://enotelresort.com.br/' },
          { nome: 'Nannai', logo: '/images/associados/nannai.png', url: 'https://www.nannai.com.br/muro-alto/' },
          { nome: 'Samoa Villa Resort', logo: '/images/associados/samoa-villa-resort.png', url: 'https://samoavillaresort.com.br/' },
          { nome: 'Serrambi Resort', logo: '/images/associados/serrambi-resort.png', url: 'https://www.serrambiresort.com/' },
          { nome: 'Summerville All Inclusive Resort', logo: '/images/associados/summerville-all-inclusive-resort.png', url: 'https://www.summervilleresort.com.br/' },
        ],
      },
      {
        uf: 'RN',
        estado: 'Rio Grande do Norte',
        resorts: [
          { nome: 'Ocean Palace', logo: '/images/associados/ocean-palace.png', url: 'https://www.oceanpalace.com.br/' },
          { nome: 'Wish Natal', logo: '/images/associados/wish-natal.png', url: 'https://www.wishhotels.com.br/wish-natal' },
        ],
      },
      {
        uf: 'CE',
        estado: 'Ceará',
        resorts: [
          { nome: 'acqua beach park resort', logo: '/images/associados/acqua-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/acqua' },
          { nome: 'suites beach park resort', logo: '/images/associados/suites-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/suites' },
          { nome: 'wellness beach park resort', logo: '/images/associados/wellness-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/wellness' },
          { nome: 'dom pedro laguna', logo: '/images/associados/dom-pedro-laguna.png', url: 'https://laguna.dompedro.com/pt/' },
        ],
      },
    ],
  },
  {
    id: 'centro-oeste',
    estados: [
      {
        uf: 'GO',
        estado: 'Goiás',
        resorts: [
          { nome: 'rio quente resorts', logo: '/images/associados/rio-quente-resorts.png', url: 'https://www.rioquente.com.br/' },
          { nome: 'tauá resort alexania', logo: '/images/associados/taua-resort-alexania.png', url: 'https://reservas.tauaresorts.com.br/alexania' },
        ],
      },
      {
        uf: 'MT',
        estado: 'Mato Grosso',
        resorts: [
          { nome: 'malai manso resort', logo: '/images/associados/malai-manso-resort.png', url: 'https://www.malaimansoresort.com.br/' },
        ],
      },
      {
        uf: 'MS',
        estado: 'Mato Grosso do Sul',
        resorts: [
          { nome: 'Zagaia Eco Resort', logo: '/images/associados/zagaia-eco-resort.png', url: 'https://zagaia.com.br/' },
        ],
      },
    ],
  },
];

/** Total de resorts listados na pagina de associados. */
export const totalAssociados = regioesAssociados.reduce(
  (n, r) => n + r.estados.reduce((m, e) => m + e.resorts.length, 0),
  0
);

/**
 * Os cinco indicadores do topo da pagina de associados.
 *
 * OS TRES IDIOMAS DIZIAM NUMEROS DIFERENTES: 83 resorts em portugues, 80 em
 * ingles e em espanhol, e a lista acima tinha 78 logotipos. Tres numeros para o
 * mesmo fato, cada um escrito a mao no markup do seu arquivo — a forma exata da
 * divergencia que este projeto ja viu no rotulo "Leia agora" e na lista de
 * parceiros. O cliente confirmou 83 como o valor correto; os 79 da lista sao os
 * associados com logotipo publicado.
 *
 * ENTAO O `ate` NAO SEGUE O TAMANHO DA LISTA, e isso e de proposito: a lista
 * cresce quando um logotipo e publicado, o indicador so muda quando o cliente
 * confirmar outro numero. O Monthez entrou em 31/08/2026 e os 83 ficaram.
 *
 * Ficam aqui, e nao no `ui.ts`, porque numero nao traduz. E a mesma divisao do
 * `cargo` da diretoria e da data de vigencia dos documentos juridicos: o dado
 * fica em `src/data/`, o rotulo fica no `ui.ts`, e a pagina junta os dois pelo
 * `id`. Acrescentar um indicador e acrescentar um item aqui MAIS um rotulo nos
 * tres idiomas — e o Record<Locale, …> do ui.ts nao deixa esquecer nenhum.
 *
 * `sufixo: true` marca os que exibem a unidade "mil" — que traduz, e por isso
 * nao esta escrita aqui.
 */
export interface IndicadorAssociados {
  /** Casa com a chave em `ui[lang].associatesStats`. */
  id: string;
  ate: number;
  /** O rotulo leva a unidade traduzida ("mil", "thousand"). */
  sufixo?: boolean;
}

export const indicadoresAssociados: IndicadorAssociados[] = [
  { id: 'resorts', ate: 83 },
  { id: 'quartos', ate: 21, sufixo: true },
  { id: 'empregos', ate: 20, sufixo: true },
  { id: 'estados', ate: 16 },
  { id: 'regioes', ate: 5 },
];
