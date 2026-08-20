/**
 * Dados de contato da associacao.
 *
 * Estavam escritos a mao nas tres paginas de contato, identicos nos tres
 * idiomas (so o texto ao redor muda). Ficam aqui porque alimentam tambem o
 * JSON-LD do BaseLayout — endereco e telefone precisam bater com o que a
 * pagina exibe, senao o dado estruturado contradiz o visivel.
 */
export const contato = {
  email: 'contato@resortsbrasil.com.br',

  endereco: {
    logradouro: 'R. Prof. Carlos de Carvalho, 28, sl. 82',
    bairro: 'Itaim Bibi',
    cidade: 'São Paulo',
    uf: 'SP',
    pais: 'BR',
    /** Uma linha, como as paginas exibem. */
    linha: 'R. Prof. Carlos de Carvalho, 28, sl. 82 - Itaim Bibi, São Paulo - SP',
    mapa: 'https://goo.gl/maps/osRdE2bZhqc1hCk78',
  },

  imprensa: {
    agencia: 'Anagrama Comunicação e Eventos.',
    // O original linkava `cristiane@hatsur.com` enquanto exibia este endereco:
    // o clique no icone mandava e-mail para outra pessoa. Vale o exibido.
    email: 'reila@anagrama.com.br',
    telefone: '+55 11 95038-7232',
    telefoneE164: '+5511950387232',
  },

  whatsapp: {
    telefone: '+55 11 95058-0313',
    telefoneE164: '+5511950580313',
    link: 'https://wa.me/5511950580313',
  },
} as const;
