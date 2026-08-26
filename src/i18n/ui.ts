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
    /* Nome do <nav> para leitor de tela. O cabecalho do tema nao tinha nenhum. */
    navLabel: 'Menu principal',
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
    cookieText:
      'Usamos cookies para manter o site funcionando e, com a sua autorização, para medir o uso das páginas e apoiar nossas campanhas.',
    cookieMore: 'Saiba mais',
    cookieAcceptAll: 'Aceitar todos',
    cookieRejectAll: 'Rejeitar todos',
    cookieCustomize: 'Personalizar',
    cookieSave: 'Salvar preferências',
    cookiePrefsTitle: 'Preferências de cookies',
    cookieCatNecessary: 'Necessários',
    cookieCatNecessaryDesc:
      'Mantêm o site funcionando e guardam a sua escolha de cookies. Não podem ser desligados.',
    cookieCatAnalytics: 'Desempenho e análise',
    cookieCatAnalyticsDesc:
      'Mostram quais páginas são mais visitadas e como o site é usado, para que possamos melhorá-lo.',
    cookieCatAds: 'Publicidade',
    cookieCatAdsDesc:
      'Permitem medir e direcionar nossas campanhas nos serviços do Google. Sem eles você continua vendo anúncios, só não personalizados por nós.',
    cookieAlwaysOn: 'Sempre ativos',
    cookieManage: 'Preferências de cookies',
    cookieClose: 'Fechar',
    /*
     * O rotulo do link de publicacoes e estudos.
     *
     * Estava escrito 27 vezes no markup, e por isso estava errado em quatro
     * delas: os dois estudos acrescentados por ultimo levaram "Leia agora" para
     * dentro das paginas inglesa e espanhola, ao lado de dois cartoes que ja
     * diziam "Read now" e "Lea ahora". Aqui e um so.
     */
    leiaAgora: 'Leia agora',

    /*
     * Copy das paginas migradas na Etapa 5.
     *
     * Estava no markup dos tres arquivos de cada pagina, e e a mesma razao de
     * sempre: texto triplicado diverge. A pagina de contato ja tinha divergido —
     * o telefone do WhatsApp aparecia como "+55 11 95058-0313" em PT/ES e
     * "+55 (11) 95058-0313" em EN, e a frase do canal era outra em ingles. Agora
     * o numero vem de src/data/contato.ts e a frase vem daqui.
     */
    historyTitle: 'História',
    historyLead:
      'A ideia da criação de uma entidade que representasse os interesses do setor começou no ano de 2000 e tomou forma durante o Festival de Turismo de Gramado.',
    historyIntro:
      'Em dezembro de 2001, oficialmente, a Resorts Brasil foi fundada, fruto da iniciativa de 12 empresas do setor.',
    historyBookBadge: '20 ANOS',
    historyBookTitle: 'Memórias, sustentabilidade e um olhar para o futuro',

    contactTitle: 'Como você prefere falar com a gente?',
    contactEmailTitle: 'E-mail',
    contactEmailText: 'Tem alguma dúvida? Podemos te ajudar pelo nosso canal de e-mail.',
    contactAddressTitle: 'Endereço',
    contactAddressText: 'Nosso endereço para correspondências é:',
    contactPressTitle: 'Imprensa',
    contactWhatsappTitle: 'WhatsApp',
    contactWhatsappText: 'Converse com nossa equipe via WhatsApp.',

    boardTitle: 'Diretoria da Resorts Brasil',
    boardCouncilTitle: 'Conselho Consultivo',
    /* Só o rótulo traduz; o intervalo de anos vive em src/data/diretoria.ts. */
    boardTermLabel: 'Biênio',

    /*
     * Etapa 6 — os dois documentos jurídicos.
     *
     * Só o título e o rótulo da data ficam aqui. O CORPO dos documentos não:
     * são ~1.500 e ~4.000 palavras por idioma, e texto dessa natureza é o
     * conteúdo da página, não um rótulo reaproveitado por várias. A regra do
     * projeto continua sendo a de sempre — o que se repete entre páginas mora
     * aqui; o que existe uma vez mora onde é lido.
     *
     * O rótulo era DOIS em português: "Atualizada em" nos termos e "Última
     * atualização:" na política. Mesma informação, duas frases, porque foram
     * escritas em momentos diferentes por pessoas diferentes.
     */
    termsTitle: 'Termos e condições de uso do site',
    privacyTitle: 'Política de Privacidade',
    legalUpdated: 'Última atualização em',

    videoPlay: 'Assistir ao vídeo',
    videoInstitucional: 'Vídeo institucional da Resorts Brasil',
    videoEbook: 'Vídeo de apresentação do e-book',
    cookiePolicyTitle: 'Como utilizamos os cookies',
    cookiePolicyIntro:
      'Cookies são pequenos arquivos que um site grava no seu navegador. Alguns são indispensáveis para o site funcionar; os demais só são gravados se você autorizar. Nada de análise ou de publicidade é carregado antes da sua escolha.',
    cookiePolicyManage:
      'Para rever ou mudar sua escolha a qualquer momento, use o botão «Preferências de cookies» no rodapé de qualquer página. A decisão fica registrada por 180 dias, e depois disso perguntamos de novo.',
    cookiePolicyCategories: 'Usamos três categorias de cookies:',
    cookieColName: 'Nome',
    cookieColProvider: 'Fornecedor',
    cookieColDuration: 'Validade',
    cookieColPurpose: 'Finalidade',
    cookieDays: 'dias',
    cookieNoneYet: 'Hoje este site não grava nenhum cookie próprio desta categoria.',
    cookieAdsNote:
      'Quando você autoriza esta categoria, os recursos de publicidade do Google Analytics passam a enviar dados da sua navegação aos serviços de publicidade do Google (google.com e doubleclick.net), que podem gravar cookies nos domínios deles.',
    cookiePurposes: {
      rb_consent:
        'Guarda quais categorias de cookies você autorizou, para não perguntarmos de novo a cada página.',
      _ga: 'Distingue visitantes, para o Google Analytics contar quantas pessoas diferentes acessam o site.',
      _ga_2S6ZPL4J2P: 'Mantém o estado da sessão de análise da propriedade do Google Analytics deste site.',
    } as Record<string, string>,
  },
  'en-us': {
    skipToContent: 'Skip to content',
    backToTop: 'Back to top',
    openMenu: 'Open menu',
    navLabel: 'Main menu',
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
    cookieText:
      'We use cookies to keep this site working and, with your permission, to measure how the pages are used and support our campaigns.',
    cookieMore: 'Learn more',
    cookieAcceptAll: 'Accept all',
    cookieRejectAll: 'Reject all',
    cookieCustomize: 'Customize',
    cookieSave: 'Save preferences',
    cookiePrefsTitle: 'Cookie preferences',
    cookieCatNecessary: 'Necessary',
    cookieCatNecessaryDesc:
      'Keep the site working and store your cookie choice. These cannot be turned off.',
    cookieCatAnalytics: 'Performance and analytics',
    cookieCatAnalyticsDesc:
      'Show which pages are visited most and how the site is used, so that we can improve it.',
    cookieCatAds: 'Advertising',
    cookieCatAdsDesc:
      'Let us measure and target our campaigns on Google services. Without them you still see ads, just not ones personalized by us.',
    cookieAlwaysOn: 'Always on',
    cookieManage: 'Cookie preferences',
    cookieClose: 'Close',
    leiaAgora: 'Read now',

    historyTitle: 'History',
    historyLead:
      'The idea of creating an entity to represent the interests of the industry in 2000 was shaped during the Gramado Tourism Festival.',
    historyIntro:
      'In December 2001, Resorts Brasil was officially founded as a result of the initiative of 12 companies in the sector.',
    historyBookBadge: '20 YEARS',
    historyBookTitle: 'Memories, sustainability and a look to the future',

    contactTitle: 'How would you like to contact us?',
    contactEmailTitle: 'Email',
    contactEmailText: 'Questions? We can help you via email.',
    contactAddressTitle: 'Address',
    contactAddressText: 'Our mailing address:',
    contactPressTitle: 'Press',
    contactWhatsappTitle: 'WhatsApp',
    contactWhatsappText: 'Needing help? Contact our virtual assistant.',

    boardTitle: 'Management of Resorts Brasil',
    boardCouncilTitle: 'Consulting Board',
    boardTermLabel: 'Biennium',

    termsTitle: 'Terms and conditions of use of the website',
    privacyTitle: 'Privacy Policy',
    legalUpdated: 'Last updated',

    videoPlay: 'Watch the video',
    videoInstitucional: 'Resorts Brasil institutional video',
    videoEbook: 'E-book presentation video',
    cookiePolicyTitle: 'How we use cookies',
    cookiePolicyIntro:
      'Cookies are small files that a website stores in your browser. Some are essential for the site to work; the rest are only stored if you allow them. No analytics or advertising is loaded before you choose.',
    cookiePolicyManage:
      'To review or change your choice at any time, use the "Cookie preferences" button in the footer of any page. Your decision is kept for 180 days, after which we ask again.',
    cookiePolicyCategories: 'We use three categories of cookies:',
    cookieColName: 'Name',
    cookieColProvider: 'Provider',
    cookieColDuration: 'Duration',
    cookieColPurpose: 'Purpose',
    cookieDays: 'days',
    cookieNoneYet: 'This site currently stores no first-party cookie in this category.',
    cookieAdsNote:
      'When you allow this category, the advertising features of Google Analytics begin sending your browsing data to Google advertising services (google.com and doubleclick.net), which may store cookies on their own domains.',
    cookiePurposes: {
      rb_consent: 'Stores which cookie categories you allowed, so that we do not ask again on every page.',
      _ga: 'Distinguishes visitors, so that Google Analytics can count how many different people visit the site.',
      _ga_2S6ZPL4J2P: 'Keeps the analytics session state for this site’s Google Analytics property.',
    } as Record<string, string>,
  },
  'es-es': {
    skipToContent: 'Saltar al contenido',
    backToTop: 'Volver arriba',
    openMenu: 'Abrir menú',
    navLabel: 'Menú principal',
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
    cookieText:
      'Usamos cookies para que el sitio funcione y, con su autorización, para medir el uso de las páginas y apoyar nuestras campañas.',
    cookieMore: 'Ver más',
    cookieAcceptAll: 'Aceptar todas',
    cookieRejectAll: 'Rechazar todas',
    cookieCustomize: 'Personalizar',
    cookieSave: 'Guardar preferencias',
    cookiePrefsTitle: 'Preferencias de cookies',
    cookieCatNecessary: 'Necesarias',
    cookieCatNecessaryDesc:
      'Mantienen el sitio en funcionamiento y guardan su elección de cookies. No se pueden desactivar.',
    cookieCatAnalytics: 'Rendimiento y análisis',
    cookieCatAnalyticsDesc:
      'Muestran qué páginas se visitan más y cómo se usa el sitio, para que podamos mejorarlo.',
    cookieCatAds: 'Publicidad',
    cookieCatAdsDesc:
      'Permiten medir y dirigir nuestras campañas en los servicios de Google. Sin ellas usted sigue viendo anuncios, solo que no personalizados por nosotros.',
    cookieAlwaysOn: 'Siempre activas',
    cookieManage: 'Preferencias de cookies',
    cookieClose: 'Cerrar',
    leiaAgora: 'Lea ahora',

    historyTitle: 'Historia',
    historyLead:
      'La idea de la creación de una entidad que representase los intereses del sector empezó en el año 2000 y fue tomando forma durante el Festival de Turismo de Gramado.',
    historyIntro:
      'En diciembre de 2001, oficialmente, Resorts Brasil fue fundada, fruto de la iniciativa de 12 empresas del sector.',
    historyBookBadge: '20 AÑOS',
    /*
     * A pagina de publicacoes traz este mesmo titulo em espanhol com dois erros
     * — "marida" no lugar de "mirada" e um "Y" maiusculo no meio da frase — e
     * ele esta preservado la de proposito (ver docs/decisoes.md, "Etapa 4").
     * Aqui vale o que a pagina de historia sempre exibiu, que e a forma
     * correta. As duas so vao poder ser conciliadas na Etapa 7, que e quando a
     * pagina de publicacoes migra; ate la, o titulo desta faixa e copy DESTA
     * pagina e nao o campo da colecao — o que vem da colecao aqui e o PDF e a
     * capa, que nao tem como divergir.
     */
    historyBookTitle: 'Memorias, sustentabilidad y una mirada hacia el futuro',

    contactTitle: '¿Cómo prefieres hablar con nosotros?',
    contactEmailTitle: 'E-mail',
    contactEmailText:
      '¿Tienes alguna duda? Podemos ayudarte a través de nuestro canal de correo electrónico.',
    contactAddressTitle: 'Dirección',
    contactAddressText: 'Nuestra dirección de correo es:',
    contactPressTitle: 'Prensa',
    contactWhatsappTitle: 'WhatsApp',
    contactWhatsappText: 'Contacta con nuestro equipo por WhatsApp.',

    boardTitle: 'Directorio de Resorts Brasil',
    boardCouncilTitle: 'Consejo Consultivo',
    boardTermLabel: 'Bienio',

    termsTitle: 'Términos y condiciones de uso del sitio',
    privacyTitle: 'Política de Privacidad',
    legalUpdated: 'Última actualización el',

    videoPlay: 'Ver el vídeo',
    videoInstitucional: 'Vídeo institucional de Resorts Brasil',
    videoEbook: 'Vídeo de presentación del e-book',
    cookiePolicyTitle: 'Cómo utilizamos las cookies',
    cookiePolicyIntro:
      'Las cookies son pequeños archivos que un sitio guarda en su navegador. Algunas son indispensables para que el sitio funcione; las demás solo se guardan si usted lo autoriza. Nada de análisis ni de publicidad se carga antes de su elección.',
    cookiePolicyManage:
      'Para revisar o cambiar su elección en cualquier momento, use el botón «Preferencias de cookies» en el pie de cualquier página. La decisión queda registrada por 180 días, y después volvemos a preguntar.',
    cookiePolicyCategories: 'Usamos tres categorías de cookies:',
    cookieColName: 'Nombre',
    cookieColProvider: 'Proveedor',
    cookieColDuration: 'Validez',
    cookieColPurpose: 'Finalidad',
    cookieDays: 'días',
    cookieNoneYet: 'Hoy este sitio no guarda ninguna cookie propia de esta categoría.',
    cookieAdsNote:
      'Cuando usted autoriza esta categoría, las funciones de publicidad de Google Analytics pasan a enviar los datos de su navegación a los servicios de publicidad de Google (google.com y doubleclick.net), que pueden guardar cookies en sus propios dominios.',
    cookiePurposes: {
      rb_consent:
        'Guarda qué categorías de cookies usted autorizó, para no volver a preguntar en cada página.',
      _ga: 'Distingue a los visitantes, para que Google Analytics pueda contar cuántas personas diferentes acceden al sitio.',
      _ga_2S6ZPL4J2P: 'Mantiene el estado de la sesión de análisis de la propiedad de Google Analytics de este sitio.',
    } as Record<string, string>,
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
