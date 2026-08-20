export const locales = ['pt-br', 'en-us', 'es-es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt-br';

/** Codigo para o atributo lang do <html> e para hreflang. */
export const htmlLang: Record<Locale, string> = {
  'pt-br': 'pt-br',
  'en-us': 'en',
  'es-es': 'es',
};

/**
 * Codigo para og:locale. A spec do Open Graph pede `idioma_TERRITORIO` com o
 * territorio em maiuscula; derivar de `lang.replace('-','_')` produzia `pt_br`,
 * que o Facebook descarta em silencio.
 */
export const ogLocale: Record<Locale, string> = {
  'pt-br': 'pt_BR',
  'en-us': 'en_US',
  'es-es': 'es_ES',
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

/**
 * Title e description de cada pagina, nos tres idiomas.
 *
 * Ficam aqui pelo mesmo motivo que `routes`: lado a lado, a divergencia entre
 * os idiomas fica visivel. Espalhadas pelas 40 paginas, as 40 descriptions
 * ficaram sendo a mesma frase generica por idioma — o Google descarta e inventa
 * o snippet. O BaseLayout le daqui quando a pagina passa `route`.
 *
 * Description entre 120 e 155 caracteres, escrita a partir do conteudo real da
 * pagina. Title no formato `Assunto - Resorts Brasil`, unico no site.
 */
export const meta: Record<RouteKey, Record<Locale, { title: string; description: string }>> = {
  home: {
    'pt-br': {
      title: 'Resorts Brasil - Associação Brasileira de Resorts',
      description:
        'A Resorts Brasil representa os principais resorts do país e trabalha para transformar o segmento e o turismo nacional. Conheça a associação.',
    },
    'en-us': {
      title: 'Resorts Brasil - Brazilian Association of Resorts',
      description:
        "Resorts Brasil represents the country's leading resorts, working to transform the segment and Brazilian tourism. Get to know the association.",
    },
    'es-es': {
      title: 'Resorts Brasil - Asociación Brasileña de Resorts',
      description:
        'Resorts Brasil representa los principales resorts del país y trabaja para transformar el segmento y el turismo nacional. Conozca la asociación.',
    },
  },
  resortsBrasil: {
    'pt-br': {
      // O original repetia o title da home aqui, nos tres idiomas: duas paginas
      // competindo pelo mesmo termo.
      title: 'Sobre nós - Resorts Brasil',
      description:
        'Representação, relacionamento e resultado: os três eixos de atuação da Resorts Brasil junto ao Governo, ao mercado e aos resorts associados.',
    },
    'en-us': {
      title: 'About us - Resorts Brasil',
      description:
        "Representation, relationship and results: the three pillars of Resorts Brasil's work with government, the market and its member resorts.",
    },
    'es-es': {
      title: 'Sobre nosotros - Resorts Brasil',
      description:
        'Representación, relación y resultado: los tres ejes de actuación de Resorts Brasil ante el Gobierno, el mercado y los resorts asociados.',
    },
  },
  board: {
    'pt-br': {
      title: 'Diretoria - Resorts Brasil',
      description:
        'Conheça a diretoria e o conselho consultivo da Resorts Brasil, eleitos para o biênio 2026-2027, e os executivos que representam o setor.',
    },
    'en-us': {
      title: 'Board - Resorts Brasil',
      description:
        'Meet the board of directors and the advisory council of Resorts Brasil for the 2026-2027 term, and the executives who represent the sector.',
    },
    'es-es': {
      title: 'Directorio - Resorts Brasil',
      description:
        'Conozca el directorio y el consejo consultivo de Resorts Brasil, electos para el bienio 2026-2027, y los ejecutivos que representan al sector.',
    },
  },
  history: {
    'pt-br': {
      title: 'História - Resorts Brasil',
      description:
        'Fundada em dezembro de 2001, a Resorts Brasil nasceu para representar os interesses do setor. Memórias, sustentabilidade e um olhar para o futuro.',
    },
    'en-us': {
      title: 'History - Resorts Brasil',
      description:
        "Founded in December 2001, Resorts Brasil was created to represent the sector's interests. Memories, sustainability and a look to the future.",
    },
    'es-es': {
      title: 'Historia - Resorts Brasil',
      description:
        'Fundada en diciembre de 2001, Resorts Brasil nació para representar los intereses del sector. Memorias, sostenibilidad y una mirada al futuro.',
    },
  },
  associates: {
    'pt-br': {
      title: 'Associados - Resorts Brasil',
      description:
        'Os grandes resorts do país reunidos numa só associação. Conheça os resorts associados por região e o processo de afiliação da Resorts Brasil.',
    },
    'en-us': {
      title: 'Associates - Resorts Brasil',
      description:
        "Brazil's leading resorts gathered in a single association. See the member resorts by region and the Resorts Brasil affiliation process.",
    },
    'es-es': {
      title: 'Asociados - Resorts Brasil',
      description:
        'Los grandes resorts del país reunidos en una sola asociación. Conozca los resorts asociados por región y el proceso de afiliación.',
    },
  },
  joinUs: {
    'pt-br': {
      title: 'Associe-se - Resorts Brasil',
      description:
        'Feiras, rodadas B2B, estudos, advocacy e benchmarking: conheça os benefícios de se associar à Resorts Brasil e como fazer parte.',
    },
    'en-us': {
      title: 'Join us - Resorts Brasil',
      description:
        'Trade fairs, B2B rounds, studies, advocacy and benchmarking: see the benefits of joining Resorts Brasil and how to become a member.',
    },
    'es-es': {
      title: 'Asóciese - Resorts Brasil',
      description:
        'Ferias, rondas B2B, estudios, advocacy y benchmarking: conozca los beneficios de asociarse a Resorts Brasil y cómo formar parte.',
    },
  },
  publications: {
    'pt-br': {
      title: 'Publicações - Resorts Brasil',
      description:
        'Cartilha ESG, Guia do Viajante Responsável, protocolos de higiene e mais: as publicações da Resorts Brasil para o setor de resorts.',
    },
    'en-us': {
      title: 'Publications - Resorts Brasil',
      description:
        'ESG guide, Responsible Traveller Guide, hygiene protocols and more: the publications produced by Resorts Brasil for the resort sector.',
    },
    'es-es': {
      title: 'Publicaciones - Resorts Brasil',
      description:
        'Cartilla ESG, Guía del Viajero Responsable, protocolos de higiene y más: las publicaciones de Resorts Brasil para el sector de resorts.',
    },
  },
  statistics: {
    'pt-br': {
      title: 'Estatísticas e Estudos - Resorts Brasil',
      description:
        'Radar Resorts Brasil, pesquisa de canais de distribuição, reforma tributária e hotelaria em números: os últimos estudos do setor de resorts.',
    },
    'en-us': {
      title: 'Statistics and Studies - Resorts Brasil',
      description:
        'Resorts Brasil Radar, distribution channel research, tax reform and hotel industry figures: the latest studies on the resort sector.',
    },
    'es-es': {
      title: 'Estadísticas y Estudios - Resorts Brasil',
      description:
        'Radar Resorts Brasil, investigación de canales de distribución, reforma tributaria y hotelería en números: los últimos estudios del sector.',
    },
  },
  support: {
    'pt-br': {
      title: 'Apoie o turismo - Resorts Brasil',
      description:
        'Seja parceiro ou mantenedor da Resorts Brasil e ajude a transformar o turismo brasileiro. Conheça as modalidades de apoio e o que cada uma inclui.',
    },
    'en-us': {
      title: 'Support tourism - Resorts Brasil',
      description:
        'Become a partner or supporter of Resorts Brasil and help transform Brazilian tourism. See the support tiers and what each one includes.',
    },
    'es-es': {
      title: 'Apoye al turismo - Resorts Brasil',
      description:
        'Sea socio o mantenedor de Resorts Brasil y ayude a transformar el turismo brasileño. Conozca las modalidades de apoyo y qué incluye cada una.',
    },
  },
  contact: {
    'pt-br': {
      title: 'Fale conosco - Resorts Brasil',
      description:
        'Fale com a Resorts Brasil por e-mail, WhatsApp ou correspondência. Contatos de imprensa e endereço da associação em São Paulo.',
    },
    'en-us': {
      title: 'Contact us - Resorts Brasil',
      description:
        "Get in touch with Resorts Brasil by email, WhatsApp or post. Press contacts and the association's address in São Paulo.",
    },
    'es-es': {
      title: 'Contáctenos - Resorts Brasil',
      description:
        'Hable con Resorts Brasil por correo electrónico, WhatsApp o correspondencia. Contactos de prensa y dirección de la asociación en São Paulo.',
    },
  },
  ebook: {
    'pt-br': {
      title: 'E-book A Gestão da Jornada do Viajante - Resorts Brasil',
      description:
        'E-book da Resorts Brasil com o Centro de Estudos de Marketing da FGV-EAESP sobre o novo contexto, a transformação dos negócios e as soluções digitais.',
    },
    'en-us': {
      title: "E-book Managing the Traveller's Journey - Resorts Brasil",
      description:
        "An e-book by Resorts Brasil and FGV-EAESP's Centre for Marketing Studies on the new context, business transformation and digital solutions in tourism.",
    },
    'es-es': {
      // O original repetia aqui o title em portugues.
      title: 'E-book La Gestión del Viaje del Viajero - Resorts Brasil',
      description:
        'E-book de Resorts Brasil con el Centro de Estudios de Marketing de FGV-EAESP sobre el nuevo contexto, la transformación de los negocios y lo digital.',
    },
  },
  privacy: {
    'pt-br': {
      title: 'Política de privacidade - Resorts Brasil',
      description:
        'Como a Resorts Brasil coleta, armazena e utiliza dados pessoais, em conformidade com a LGPD. Seus direitos e como exercê-los.',
    },
    'en-us': {
      title: 'Privacy policy - Resorts Brasil',
      description:
        "How Resorts Brasil collects, stores and uses personal data in compliance with Brazil's LGPD. Your rights and how to exercise them.",
    },
    'es-es': {
      title: 'Política de privacidad - Resorts Brasil',
      description:
        'Cómo Resorts Brasil recopila, almacena y utiliza datos personales conforme a la LGPD brasileña. Sus derechos y cómo ejercerlos.',
    },
  },
  terms: {
    'pt-br': {
      title: 'Termos de uso - Resorts Brasil',
      description:
        'Termos e condições de uso do site da Resorts Brasil: regras de acesso, propriedade intelectual, responsabilidades e foro.',
    },
    'en-us': {
      title: 'Terms of use - Resorts Brasil',
      description:
        'Terms and conditions of use for the Resorts Brasil website: access rules, intellectual property, liability and jurisdiction.',
    },
    'es-es': {
      title: 'Términos de uso - Resorts Brasil',
      description:
        'Términos y condiciones de uso del sitio de Resorts Brasil: reglas de acceso, propiedad intelectual, responsabilidades y jurisdicción.',
    },
  },
};

export const social = {
  facebook: 'https://www.facebook.com/ResortsBrasil',
  instagram: 'https://www.instagram.com/resorts.brasil/',
  linkedin: 'https://pt.linkedin.com/company/abr-resorts-brasil',
  youtube: 'https://www.youtube.com/channel/UCakNUVaii4VdkoAPS_dWABg',
} as const;

export const ui = {
  'pt-br': {
    skipToContent: 'Pular para o conteúdo',
    backToTop: 'Voltar ao topo',
    openMenu: 'Abrir menu',
    chooseLanguage: 'Escolher idioma',
    socialOn: 'Resorts Brasil no',
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
    regioesAssociados: { sudeste: 'SUDESTE', sul: 'SUL', norte: 'NORTE', nordeste: 'NORDESTE', 'centro-oeste': 'CENTRO-OESTE' },
    cookieRegion: 'Aviso de cookies',
    cookieText: 'Este site utiliza cookies para aprimorar a experiência dos usuários.',
    cookieMore: 'Saiba mais',
    cookieReject: 'Recusar',
    cookieAccept: 'Aceitar',
  },
  'en-us': {
    skipToContent: 'Skip to content',
    backToTop: 'Back to top',
    openMenu: 'Open menu',
    chooseLanguage: 'Choose language',
    socialOn: 'Resorts Brasil on',
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
    regioesAssociados: { sudeste: 'SOUTHEAST', sul: 'SOUTH', norte: 'NORTH', nordeste: 'NORTHEAST', 'centro-oeste': 'MIDWEST' },
    cookieRegion: 'Cookie notice',
    cookieText: 'This website uses cookies to improve user experience.',
    cookieMore: 'Learn more',
    cookieReject: 'Reject',
    cookieAccept: 'Accept',
  },
  'es-es': {
    skipToContent: 'Saltar al contenido',
    backToTop: 'Volver arriba',
    openMenu: 'Abrir menú',
    chooseLanguage: 'Elegir idioma',
    socialOn: 'Resorts Brasil en',
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
    regioesAssociados: { sudeste: 'SURESTE', sul: 'SUR', norte: 'NORTE', nordeste: 'NORESTE', 'centro-oeste': 'CENTRO-OESTE' },
    cookieRegion: 'Aviso de cookies',
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
