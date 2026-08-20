/**
 * Mantenedores, parceiros e descontos — as faixas de logos que se repetiam em
 * 12 paginas, escritas a mao em cada uma.
 *
 * O numero de colunas da grade muda por pagina (5 nas paginas institucionais,
 * 6 em associe-se), entao e prop do componente, nao dado.
 *
 * O cabecalho de cada faixa ("Mantenedores:", "Parceiros:") continua escrito na
 * pagina: o texto muda por idioma e as colunas do Bootstrap ao redor mudam por
 * pagina. O componente cobre so o <ul>, que e a parte identica.
 *
 * A versao inglesa de associe-se listava 10 parceiros, dois a mais (talge e
 * villa-camarao) que a portuguesa e a espanhola — e os dois ja constavam da
 * faixa de mantenedores da mesma pagina. O cliente confirmou em 20/08/2026 que
 * a lista correta e a portuguesa; a inglesa passou a usar esta.
 */

export interface LogoParceiro {
  nome: string;
  logo: string;
  /** Ausente para quem nao tem site: vira imagem sem link, nao link morto. */
  url?: string;
}

/** Os 7 mantenedores. */
export const mantenedores: LogoParceiro[] = [
  { nome: 'Equipotel', logo: '/images/parceiros/equipotel.png', url: 'https://www.equipotel.com.br/' },
  { nome: 'Harus', logo: '/images/parceiros/harus.png', url: 'https://harus.ind.br/' },
  { nome: 'Nestle Professional', logo: '/images/parceiros/nestle-professional.png', url: 'https://www.nestleprofessional.com.br/' },
  { nome: 'Rentv', logo: '/images/parceiros/rentv.png', url: 'https://rentv.com.br/' },
  { nome: 'R1 Audio Visual', logo: '/images/parceiros/r1-grupo.png', url: 'https://www.r1audiovisual.com.br/' },
  { nome: 'Talge', logo: '/images/parceiros/talge.png', url: 'https://talge.com.br/' },
  { nome: 'Villa Camarão', logo: '/images/parceiros/villa-camarao.png', url: 'https://www.villacamarao.com.br/' },
];

/** Os 8 parceiros. */
export const parceiros: LogoParceiro[] = [
  { nome: 'Amigos do bem', logo: '/images/parceiros/amigos-do-bem.png', url: 'https://www.amigosdobem.org/' },
  { nome: 'senac', logo: '/images/parceiros/senac.png', url: 'https://www.sp.senac.br/' },
  { nome: 'fgv cemd', logo: '/images/parceiros/fgv-cemd.png', url: 'https://eaesp.fgv.br/centros/fgvcemd' },
  { nome: 'JLL', logo: '/images/parceiros/jll.png', url: 'https://www.jll.com.br/' },
  { nome: 'STR', logo: '/images/parceiros/str.png', url: 'https://str.com/pt-br' },
  { nome: 'Arbache Consulting', logo: '/images/parceiros/arbache-consulting.png' },
  { nome: 'GKS', logo: '/images/parceiros/gks.png', url: 'https://gks.com.br/' },
  { nome: 'ESG Pulse', logo: '/images/parceiros/esg-pulse.png', url: 'https://esgpulse.com.br/' },
];

/** Os 4 logos da faixa de descontos, so em associe-se. */
export const descontos: LogoParceiro[] = [
  { nome: 'Escola Para Resultados', logo: '/images/parceiros/escola-para-resultados.png', url: 'https://escolapararesultados.com.br/' },
  { nome: 'hsmai brasil', logo: '/images/parceiros/hsmai-brasil.png', url: 'http://hsmaibrasil.org/' },
  { nome: 'Senac SP', logo: '/images/parceiros/senac.png', url: 'https://www.sp.senac.br/' },
  { nome: 'Mark Up Consultoria', logo: '/images/parceiros/markup-consultoria.png', url: 'https://www.markupconsult.com.br/' },
];
