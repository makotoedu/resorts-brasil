/**
 * Dados de contato da associacao.
 *
 * Estavam escritos a mao nas tres paginas de contato, identicos nos tres
 * idiomas (so o texto ao redor muda). Ficam aqui porque alimentam tambem o
 * JSON-LD do <head> (Cabeca.astro) — endereco e telefone precisam bater com o que a
 * pagina exibe, senao o dado estruturado contradiz o visivel.
 */
/*
 * Os campos do endereco ficam soltos antes do objeto porque as linhas exibidas
 * sao montadas a partir deles: escritas a parte, o CEP existiria duas vezes e
 * poderia divergir de si mesmo.
 */
const logradouro = 'R. Prof. Carlos de Carvalho, 28, sl. 82';
const bairro = 'Itaim Bibi';
const cidade = 'São Paulo';
const uf = 'SP';
/*
 * O CEP vem do proprio link de mapa do site, que resolve para "R. Prof. Carlos
 * de Carvalho, 28 - Itaim Bibi, Sao Paulo - SP, 04531-080". O mesmo destino
 * confirma o "28" contra o "nº 280" dos termos de uso.
 */
const cep = '04531-080';

export const contato = {
  email: 'contato@resortsbrasil.com.br',

  endereco: {
    logradouro,
    bairro,
    cidade,
    uf,
    cep,
    pais: 'BR',
    /**
     * As linhas do `<address>`, na pagina de contato e no rodape. Era uma linha
     * so, corrida, e o CEP nao aparecia em lugar nenhum do site.
     */
    linhas: [logradouro, `${bairro}, ${cidade} - ${uf}`, `CEP ${cep}`],
    mapa: 'https://goo.gl/maps/osRdE2bZhqc1hCk78',
  },

  imprensa: {
    // Sem ponto final: era 'Eventos.', e a pontuacao e de quem exibe.
    agencia: 'Anagrama Comunicação e Eventos',
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
