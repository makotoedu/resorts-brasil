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
 * poderia divergir de si mesmo. A sala fica separada da rua porque o rodape
 * mostra a rua sem ela.
 */
const rua = 'R. Prof. Carlos de Carvalho, 28';
const complemento = 'sl. 82';
const logradouro = `${rua}, ${complemento}`;
const bairro = 'Itaim Bibi';
const cidade = 'São Paulo';
const uf = 'SP';
/*
 * O CEP vem do proprio link de mapa do site, que resolve para "R. Prof. Carlos
 * de Carvalho, 28 - Itaim Bibi, Sao Paulo - SP, 04531-080". O mesmo destino
 * confirma o "28" contra o "nº 280" dos termos de uso.
 */
const cep = '04531-080';
// Espaco inseparavel em volta do hifen: na coluna de 165px do rodape o "SP"
// descia sozinho para a linha seguinte. Agora quem desce e "Sao Paulo - SP".
const regiao = `${bairro}, ${cidade} - ${uf}`;

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
     * As linhas do `<address>` da pagina de contato. Era uma linha so, corrida,
     * e o CEP nao aparecia em lugar nenhum do site.
     */
    linhas: [logradouro, regiao, `CEP ${cep}`],
    /**
     * O endereco do rodape diz ONDE fica, e nao para onde mandar carta: sem a
     * sala e sem o CEP. O completo continua na pagina de contato, que e o
     * endereco de correspondencia, e no JSON-LD.
     */
    linhasCurtas: [rua, regiao],
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
