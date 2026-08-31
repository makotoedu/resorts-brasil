/**
 * O carrossel de logos da home: 71 logos, contra os 79 de /associados.
 *
 * Nem todo associado aparece aqui — seis dos listados em /associados ficam de
 * fora. E uma selecao, nao a lista inteira.
 *
 * OS SEIS SAO A DIFERENCA ENTRE LOGOTIPOS DISTINTOS, e nao entre entradas: o
 * `clubmed.png` aparece tres vezes em associados.ts (SP, RJ e BA), entao as 79
 * entradas de la sao 77 arquivos, e 77 - 71 = 6. Quem quiser conferir a conta
 * depois de acrescentar alguem tem de deduplicar pelo `logo`, nao contar linhas.
 *
 * Antes estava escrita a mao nas tres homes e ja havia divergido: o EN trocava
 * a ordem de dois logos e o PT e o EN ainda traziam o Wyndham Gramado, que
 * **deixou de ser associado** (confirmado pelo cliente em 20/08/2026) e so o ES
 * ja tinha removido. Unificada aqui, sem o Wyndham.
 *
 * O `url` vem de src/data/associados.ts. Quem nao tiver URL renderiza sem
 * <a href>, e nao como link morto: no original os 71 logos eram `<a href="#">`,
 * links que o teclado percorria para lugar nenhum e que o leitor de tela
 * anunciava como "link".
 */
import type { Resort } from './associados';

export const carrosselHome: (Omit<Resort, 'url'> & { url?: string })[] = [
  { nome: 'acqua beach park resort', logo: '/images/associados/acqua-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/acqua' },
  { nome: 'Almenat Tapestry Collection by Hilton', logo: '/images/associados/almenat.png', url: 'https://hotelalmenat.com.br/' },
  { nome: 'Resort Arcobaleno', logo: '/images/associados/arcobaleno.png', url: 'https://hotelarcobaleno.com.br/' },
  { nome: 'Armação Resort Porto de Galinhas', logo: '/images/associados/armacao-resort-porto-de-galinhas.png', url: 'https://armacaoresort.com/pt/' },
  { nome: 'Blue Tree Daj', logo: '/images/associados/blue-tree-daj.png', url: 'https://www.bluetreedaj.com.br/' },
  { nome: 'blue tree thermas de lins resort', logo: '/images/associados/blue-tree-thermas-de-lins-resort.png', url: 'http://bluetreethermasdelins.com.br/' },
  { nome: 'bourbon atibaia', logo: '/images/associados/bourbon-atibaia-resort.png', url: 'https://www.bourbon.com.br/hotel/bourbon-atibaia' },
  { nome: 'Bourbon Foz do Iguaçu', logo: '/images/associados/bourbon-cataratas-do-iguacu-thermas-eco-resort.png', url: 'https://www.bourbon.com.br/hotel/bourbon-cataratas-do-iguacu' },
  { nome: 'cana brava all inclusive resort', logo: '/images/associados/cana-brava-all-inclusive-resort.png', url: 'https://canabravaresort.com.br/' },
  { nome: 'casa grande hotel resort', logo: '/images/associados/casa-grande-hotel-resort-spa.png', url: 'https://www.casagrandehotel.com.br/' },
  { nome: 'catussaba resort hotel', logo: '/images/associados/catussaba-resort-hotel.png', url: 'http://www.catussaba.com.br/' },
  { nome: 'Hot Beach Celebration', logo: '/images/associados/hot-beach-celebration.png', url: 'https://hotbeach.com.br/celebration/' },
  { nome: 'clara resorts', logo: '/images/associados/clara-resorts.jpg', url: 'https://www.clararesorts.com.br/' },
  { nome: 'clubmed', logo: '/images/associados/clubmed.png', url: 'https://www.clubmed.com.br/r/trancoso/y' },
  { nome: 'costa do sauipe resorts', logo: '/images/associados/costa-do-sauipe-resorts.png', url: 'https://www.costadosauipe.com.br/' },
  { nome: 'Costão do Santinho', logo: '/images/associados/costao-do-santinho.png', url: 'https://costao.com.br/' },
  { nome: 'cyan resort', logo: '/images/associados/cyan-resort.png', url: 'https://www.reserveatlantica.com.br/hotel/cyan-resort' },
  { nome: 'dom pedro laguna', logo: '/images/associados/dom-pedro-laguna.png', url: 'https://laguna.dompedro.com/pt/' },
  { nome: 'Enotel Porto de Galinhas', logo: '/images/associados/enotel-porto-de-galinhas.png', url: 'https://enotelresort.com.br/' },
  { nome: 'Hotel Histórico Dona Carolina', logo: '/images/associados/fazenda-dona-carolina.png', url: 'https://www.hotelfazendadonacarolina.com.br/' },
  { nome: 'Fazzenda park hotel', logo: '/images/associados/fazzenda-park-hotel.png', url: 'https://www.fazzenda.com.br/' },
  { nome: 'Grand Hotel Campos do Jordão', logo: '/images/associados/grand-hotel-campos-do-jordao.png', url: 'https://grandehotelsenac.com.br/ghj_hotel/grande-hotel-campos-do-jordao/' },
  { nome: 'Grand Hotel São Pedro', logo: '/images/associados/grand-hotel-sao-pedro.png', url: 'https://grandehotelsenac.com.br/ghp_hotel/grande-hotel-sao-pedro/' },
  { nome: 'grand palladium imbassai', logo: '/images/associados/grand-palladium-imbassai.png', url: 'https://www.palladiumhotelgroup.com/pt/hoteis/brasil/bahia/grand-palladium-imbassai-resort-spa' },
  { nome: 'Hotel JP Ribeirão Preto', logo: '/images/associados/hotel-jp.png', url: 'https://www.nacionalinn.com.br/hoteis/hotel-jp-ribeirao-preto' },
  { nome: 'Hot Beach Resort', logo: '/images/associados/hot-beach-resort.png', url: 'https://hotbeach.com.br/hot-beach-resort/' },
  { nome: 'Hot Beach Suites Olimpia', logo: '/images/associados/hot-beach-suites.png', url: 'https://hotbeach.com.br/hot-beach-suites/' },
  { nome: 'iberostar bahia', logo: '/images/associados/iberostar-bahia.png', url: 'https://www.iberostar.com/br/hoteis/praia-do-forte/iberostar-bahia/' },
  { nome: 'iberostar grand amazon', logo: '/images/associados/iberostar-grand-amazon.png', url: 'https://www.iberostar.com/br/hoteis/manaus/iberostar-grand-amazon/' },
  { nome: 'iberostar praia do forte', logo: '/images/associados/iberostar-praia-do-forte.png', url: 'https://www.iberostar.com/br/hoteis/praia-do-forte/iberostar-praia-do-forte/' },
  { nome: 'Ipioca Beach Residence & Resort', logo: '/images/associados/ipioca-beach.png', url: 'https://ipiocabeachresidence.com.br/' },
  { nome: 'japaratinga louge resort', logo: '/images/associados/japaratinga-louge-resort.png', url: 'https://www.japaratingaresort.com.br/pt' },
  { nome: 'japy golf resort hotel', logo: '/images/associados/japy-golf-resort-hotel.png', url: 'https://www.japygolfresort.com.br/' },
  { nome: 'Jardim Atlântico Beach Resort', logo: '/images/associados/jardim-atlantico.png', url: 'https://www.resortjardimatlantico.com.br/' },
  { nome: 'jatiuca hotel resort', logo: '/images/associados/jatiuca-hotel-resort.png', url: 'https://www.hoteljatiuca.com.br/' },
  { nome: 'Jurema Águas Quentes', logo: '/images/associados/jurema-aguas-quentes.png', url: 'https://juremaaguasquentes.com.br/' },
  { nome: 'La Torre Resort', logo: '/images/associados/la-torre-resort.png', url: 'https://resortlatorre.com.br/' },
  { nome: 'le canton', logo: '/images/associados/le-canton.png', url: 'https://lecanton.com.br/' },
  { nome: 'Mabu Hotel Curitiba', logo: '/images/associados/mabu-hoteis-resorts.png', url: 'https://www.hoteismabu.com.br/hoteis/mabu-curitiba-business' },
  { nome: 'Maceió Mar All Inclusive Resort', logo: '/images/associados/maceio-mar.png', url: 'https://mmehoteis.com.br/maceio-mar-resort/' },
  { nome: 'malai manso resort', logo: '/images/associados/malai-manso-resort.png', url: 'https://www.malaimansoresort.com.br/' },
  { nome: 'Mavsa Resort', logo: '/images/associados/mavsa.png', url: 'https://mavsaresort.com/' },
  { nome: 'Monthez', logo: '/images/associados/monthez.png', url: 'https://monthez.com.br/' },
  { nome: 'Nannai', logo: '/images/associados/nannai.png', url: 'https://www.nannai.com.br/muro-alto/' },
  { nome: 'Novotel Itu', logo: '/images/associados/novotel-itu.png', url: 'https://www.novotelitu.com.br/' },
  { nome: 'Ocean Palace', logo: '/images/associados/ocean-palace.png', url: 'https://www.oceanpalace.com.br/' },
  { nome: 'pratagy beach resort', logo: '/images/associados/pratagy-beach-resort.png', url: 'https://www.pratagy.com.br/' },
  { nome: 'Recanto Cataratas Thermas Resort', logo: '/images/associados/recanto-cataratas-thermas-resort.png', url: 'https://www.recantocataratasresort.com.br/' },
  { nome: 'Resort Fazenda São João', logo: '/images/associados/resort-fazenda-sao-joao.png', url: 'https://hotelfazendasaojoao.com.br/' },
  { nome: 'rio quente resorts', logo: '/images/associados/rio-quente-resorts.png', url: 'https://www.rioquente.com.br/' },
  { nome: 'Royal Palm Plaza Resort Campinas', logo: '/images/associados/royal-palm-plaza-resort-campinas.png', url: 'https://royalpalm.com.br/' },
  { nome: 'salinas maceio resort', logo: '/images/associados/salinas-maceio-resort.png', url: 'https://www.salinas.com.br/pt/maceio/' },
  { nome: 'salinas maragogi resort', logo: '/images/associados/salinas-maragogi-resort.png', url: 'https://www.salinas.com.br/pt/maragogi/' },
  { nome: 'Santíssimo Resort', logo: '/images/associados/santissimo-resort.png', url: 'https://santissimoresort.com.br/' },
  { nome: 'Serrambi Resort', logo: '/images/associados/serrambi-resort.png', url: 'https://www.serrambiresort.com/' },
  { nome: 'Sofitel Jequitimar Guarujá', logo: '/images/associados/sofitel-jequitimar-guaruja.png', url: 'https://all.accor.com/hotel/6383/index.pt-br.shtml' },
  { nome: 'suites beach park resort', logo: '/images/associados/suites-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/suites' },
  { nome: 'Summerville All Inclusive Resort', logo: '/images/associados/summerville-all-inclusive-resort.png', url: 'https://www.summervilleresort.com.br/' },
  { nome: 'thermas all inclusive', logo: '/images/associados/thermas-all-inclusive.png', url: 'https://www.nacionalinn.com.br/hoteis/hotel-thermas-resort-walter-world' },
  { nome: 'tauá resort alexania', logo: '/images/associados/taua-resort-alexania.png', url: 'https://reservas.tauaresorts.com.br/alexania' },
  { nome: 'Tauá Resort Atibaia', logo: '/images/associados/taua-resort-atibaia.png', url: 'https://reservas.tauaresorts.com.br/atibaia' },
  { nome: 'tauá resort caete', logo: '/images/associados/taua-resort-caete.png', url: 'https://reservas.tauaresorts.com.br/caete' },
  { nome: 'Hot Beach Raízes', logo: '/images/associados/hot-beach-raizes.png', url: 'https://hotbeach.com.br/raizes/' },
  { nome: 'tivoli bahia ecoresort', logo: '/images/associados/tivoli-bahia-ecoresort.png', url: 'https://www.tivolihotels.com/pt/tivoli-ecoresort-praia-do-forte' },
  { nome: 'transamerica resort comandatuba', logo: '/images/associados/transamerica-resort-comandatuba.png', url: 'https://www.transamericacomandatuba.com.br/' },
  { nome: 'Vale Suíço Resort', logo: '/images/associados/vale-suico-resort.png', url: 'https://www.valesuico.com.br/' },
  { nome: 'Villa Rossa Hotel', logo: '/images/associados/villa-rossa.png', url: 'https://www.villarossa.com.br/' },
  { nome: 'wellness beach park resort', logo: '/images/associados/wellness-beach-park-resort.png', url: 'https://www.beachpark.com.br/resorts/wellness' },
  { nome: 'Wish Foz do Iguaçu', logo: '/images/associados/wish-foz-do-iguacu.png', url: 'https://www.wishhotels.com.br/wish-foz-do-iguacu' },
  { nome: 'Wish Natal', logo: '/images/associados/wish-natal.png', url: 'https://www.wishhotels.com.br/wish-natal' },
  { nome: 'Wish Serrano', logo: '/images/associados/wish-serrano.png', url: 'https://www.wishhotels.com.br/wish-serrano' },
];
