export const locales = ['pt-br', 'en-us', 'es-es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt-br';

/** Codigo para o atributo lang do <html> e para hreflang. */
export const htmlLang: Record<Locale, string> = {
  'pt-br': 'pt-br',
  'en-us': 'en',
  'es-es': 'es',
};

/** Rotulo curto exibido no seletor de idioma do cabecalho. */
export const localeBadge: Record<Locale, string> = {
  'pt-br': 'BR',
  'en-us': 'EN',
  'es-es': 'ES',
};

/**
 * Slug de cada pagina nos tres idiomas. Fonte unica de verdade: alimenta a
 * navegacao, o rodape, o seletor de idioma e as tags hreflang. Os slugs sao
 * traduzidos, entao nao podem ser derivados automaticamente.
 *
 * As URLs sao sem extensao porque o vercel.json usa cleanUrls.
 */
export const routes = {
  home: { 'pt-br': '/', 'en-us': '/en-us/home', 'es-es': '/es-es/inicio' },
  resortsBrasil: {
    'pt-br': '/resorts-brasil',
    'en-us': '/en-us/resorts-brasil',
    'es-es': '/es-es/resorts-brasil',
  },
  board: { 'pt-br': '/diretoria', 'en-us': '/en-us/board', 'es-es': '/es-es/directorio' },
  history: { 'pt-br': '/historia', 'en-us': '/en-us/history', 'es-es': '/es-es/historia' },
  associates: {
    'pt-br': '/associados',
    'en-us': '/en-us/associates',
    'es-es': '/es-es/asociados',
  },
  joinUs: { 'pt-br': '/associe-se', 'en-us': '/en-us/join-us', 'es-es': '/es-es/asociese' },
  publications: {
    'pt-br': '/publicacoes',
    'en-us': '/en-us/publications',
    'es-es': '/es-es/publicaciones',
  },
  statistics: {
    'pt-br': '/estatisticas-e-estudos',
    'en-us': '/en-us/statistics-and-studies',
    'es-es': '/es-es/estadisticas-y-estudios',
  },
  support: { 'pt-br': '/apoie', 'en-us': '/en-us/support-tourism', 'es-es': '/es-es/apoye' },
  contact: {
    'pt-br': '/fale-conosco',
    'en-us': '/en-us/contact-us',
    'es-es': '/es-es/contactenos',
  },
  ebook: { 'pt-br': '/ebook', 'en-us': '/en-us/ebook', 'es-es': '/es-es/ebook' },
  privacy: {
    'pt-br': '/politica-de-privacidade',
    'en-us': '/en-us/privacy-policy',
    'es-es': '/es-es/politica-de-privacidad',
  },
  terms: {
    'pt-br': '/termos-de-uso',
    'en-us': '/en-us/terms-of-use',
    'es-es': '/es-es/terminos-de-uso',
  },
} as const;

export type RouteKey = keyof typeof routes;

export const social = {
  facebook: 'https://www.facebook.com/ResortsBrasil',
  instagram: 'https://www.instagram.com/resorts.brasil/',
  linkedin: 'https://pt.linkedin.com/company/abr-resorts-brasil',
  youtube: 'https://www.youtube.com/channel/UCakNUVaii4VdkoAPS_dWABg',
} as const;

export const ui = {
  'pt-br': {
    topbarEbook: 'Conheça nosso e-book',
    topbarJoin: 'Seja um associado',
    navHome: 'Início',
    navAbout: 'Sobre nós',
    navResortsBrasil: 'Resorts Brasil',
    navBoard: 'Diretoria',
    navHistory: 'História',
    navAssociates: 'Associados',
    navAssociatesList: 'Resorts Associados',
    navJoinUs: 'Associe-se',
    navInformation: 'Informação',
    navPublications: 'Publicações',
    navStatistics: 'Estatísticas e Estudos',
    navSupport: 'Apoie o turismo',
    navContact: 'Fale conosco',
    langOther: { 'en-us': 'Inglês (EN)', 'es-es': 'Espanhol (ES)' },
    footerNavigation: 'Navegação',
    footerAbout: 'Sobre nós',
    footerPrivacy: 'Política de privacidade',
    footerTerms: 'Termos de uso',
    footerInstitutional: 'Institucional',
    footerInformation: 'Informação',
    footerStatistics: 'Estatísticas e Estudos',
    footerSocial: 'Redes Sociais',
    copyright: 'Resorts Brasil - Todos os direitos reservados. by',
    cookieText: 'Este site utiliza cookies para aprimorar a experiência dos usuários.',
    cookieMore: 'Saiba mais',
    cookieReject: 'Recusar',
    cookieAccept: 'Aceitar',
  },
  'en-us': {
    topbarEbook: 'Meet our e-book',
    topbarJoin: 'Becoming an associate',
    navHome: 'Home',
    navAbout: 'About Us',
    navResortsBrasil: 'Resorts Brasil',
    navBoard: 'Board',
    navHistory: 'History',
    navAssociates: 'Associates',
    navAssociatesList: 'Associated Resorts',
    navJoinUs: 'Join Us',
    navInformation: 'Information',
    navPublications: 'Publications',
    navStatistics: 'Statistics and Studies',
    navSupport: 'Support Tourism',
    navContact: 'Contact us',
    langOther: { 'pt-br': 'Portuguese (BR)', 'es-es': 'Spanish (ES)' },
    footerNavigation: 'Navigation',
    footerAbout: 'About us',
    footerPrivacy: 'Privacy policy',
    footerTerms: 'Terms of use',
    footerInstitutional: 'Institutional',
    footerInformation: 'Information',
    footerStatistics: 'Statistics and Studies',
    footerSocial: 'Social Media',
    copyright: 'Resorts Brasil - All rights reserved. by',
    cookieText: 'This website uses cookies to improve user experience.',
    cookieMore: 'Learn more',
    cookieReject: 'Reject',
    cookieAccept: 'Accept',
  },
  'es-es': {
    topbarEbook: 'Conozca nuestro e-book',
    topbarJoin: 'Sea un asociado',
    navHome: 'Inicio',
    navAbout: 'Sobre nosotros',
    navResortsBrasil: 'Resorts Brasil',
    navBoard: 'Directorio',
    navHistory: 'Historia',
    navAssociates: 'Asociados',
    navAssociatesList: 'Resorts Asociados',
    navJoinUs: 'Asóciese',
    navInformation: 'Información',
    navPublications: 'Publicaciones',
    navStatistics: 'Estadísticas y Estudios',
    navSupport: 'Apoye al turismo',
    navContact: 'Contáctenos',
    langOther: { 'pt-br': 'Portugués (BR)', 'en-us': 'Inglés (EN)' },
    footerNavigation: 'Navegación',
    footerAbout: 'Sobre nosotros',
    footerPrivacy: 'Política de privacidad',
    footerTerms: 'Términos de uso',
    footerInstitutional: 'Institucional',
    footerInformation: 'Información',
    footerStatistics: 'Estadísticas y estudios',
    footerSocial: 'Redes sociales',
    copyright: 'Resorts Brasil - Todos los derechos reservados. by',
    cookieText: 'Este sitio utiliza cookies para perfeccionar la experiencia de los usuarios.',
    cookieMore: 'Ver más',
    cookieReject: 'Rechazar',
    cookieAccept: 'Aceptar',
  },
} as const;

/** URL de uma pagina no idioma pedido. */
export function url(key: RouteKey, lang: Locale): string {
  return routes[key][lang];
}

/** Traducoes de uma pagina, para montar as tags hreflang. */
export function alternates(key: RouteKey) {
  return locales.map((lang) => ({ lang, href: routes[key][lang] }));
}
