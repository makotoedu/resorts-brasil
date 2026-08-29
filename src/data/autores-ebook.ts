/**
 * Os 41 cartoes de autor do e-book — o prefacio e os 40 da galeria.
 *
 * ERAM 700 DAS 1.086 LINHAS DE CADA PAGINA, e 129 dos 140 `style=` inline: cada
 * cartao repetia `style="background-color: #0c101b"` no bloco e
 * `style="color: #0c71c3"` no capitulo. Multiplicado por tres idiomas, sao 2.100
 * linhas de markup para 41 registros.
 *
 * SAO 41, E NAO 43. O numero do plano veio de contar no markup, e e o mesmo erro
 * de metodo que ja transformou 7 publicacoes em 5 e duas cores em decisoes que
 * nao existiam. A contagem real esta na medicao: `medir-ebook.mjs` conta 40
 * itens na grade de autores, mais o cartao unico do prefacio.
 *
 * O QUE NAO TRADUZ, e por isso mora aqui: nome, foto, LinkedIn — e tambem o
 * `cargo` e o `capitulo`, que no site de hoje estao em portugues nos tres
 * idiomas. O tipo aceita as duas formas, como o `cargo` da diretoria; ver a nota
 * do src/data/ebook.ts sobre a traducao que nao existe.
 *
 * `linkedin` AUSENTE nao e esquecimento. Sete cartoes traziam `href="#"` no
 * original — um link focavel que nao vai a lugar nenhum. O <CartaoMembro> ja
 * trata a ausencia desde a Etapa 3: mantem o simbolo, apagado, e sem link.
 */
import type { Traduzivel } from './ebook';

export interface AutorEbook {
  nome: string;
  /** O capitulo que a pessoa assina. E o `<span>` azul do cartao. */
  capitulo: Traduzivel;
  /** Cargo e instituicao. */
  cargo: Traduzivel;
  /** Caminho publico (`/images/...`). Resolvido por src/imagens.ts. */
  foto: string;
  /** Ausente para quem trazia `href="#"` no original. */
  linkedin?: string;
}

/** O prefacio tem cartao proprio, centralizado e sozinho na fileira. */
export const prefacioEbook: AutorEbook = {
  nome: 'Caio Luiz de Carvalho',
  capitulo: 'Prefácio',
  cargo: 'Professor da EAESP-FGV e Diretor executivo do canal Arte1 (Bandeirantes)',
  foto: '/images/ebook/autores/Caio-Luiz-de-Carvalho.jpg',
  linkedin: 'https://www.linkedin.com/in/caio-luiz-de-carvalho-9b227aa/',
};

/** Os 40 da galeria, na ordem em que o site sempre os mostrou. */
export const autoresEbook: AutorEbook[] = [
  {
    nome: 'Roland de Bonadona',
    capitulo: 'O Turismo sob a luz da transformação digital após a pandemia',
    cargo: 'Diretor do Bonadona Hospitality Consulting',
    foto: '/images/ebook/autores/Roland-de-Bonadona.jpg',
    linkedin: 'https://www.linkedin.com/in/roland-bonadona-8b950619/',
  },
  {
    nome: 'Eduardo Lorea',
    capitulo: 'Turistech: a oportunidade da inovação aberta no turismo',
    cargo: 'Diretor do Wakalua Brasil',
    foto: '/images/ebook/autores/Eduardo-Lorea.jpg',
    linkedin: 'https://www.linkedin.com/in/eduardolorea/',
  },
  {
    nome: 'Claudia Pantuffi',
    capitulo:
      'Desenvolvimento Sustentável e as Sete Revoluções da Sustentabilidade: um olhar para o setor de Turismo',
    cargo: 'Professora no Centro Universitário Senac',
    foto: '/images/ebook/autores/Claudia-Pantuffi.jpg',
    linkedin: 'https://www.linkedin.com/in/claudia-martins-pantuffi-5aba652a/',
  },
  {
    nome: 'Dafne Morais',
    capitulo:
      'Desenvolvimento Sustentável e as Sete Revoluções da Sustentabilidade: um olhar para o setor de Turismo',
    cargo: 'Professora no Centro Universitário FEI',
    foto: '/images/ebook/autores/Dafne-Oliveira.jpg',
    linkedin: 'https://www.linkedin.com/in/dafnemorais/',
  },
  {
    nome: 'Tricia Neves',
    capitulo: 'Um novo olhar para a gestão',
    cargo: 'Co-fundadora e sócia da Mapie',
    foto: '/images/ebook/autores/Tricia-Neves.jpg',
    linkedin: 'https://www.linkedin.com/in/triciagneves/',
  },
  {
    nome: 'Mariana Aldrigui',
    capitulo:
      'Vale a pena correr para chegar atrasado? Considerações sobre educação e formação profissional em turismo',
    cargo: 'Professora na USP',
    foto: '/images/ebook/autores/Mariana-Aldrigui.jpg',
    linkedin: 'https://www.linkedin.com/in/mariana-aldrigui/',
  },
  {
    nome: 'Ana Biselli Aidar',
    capitulo: 'Práticas de gestão como fonte de desempenho superior',
    cargo: 'Presidente Executiva da Resorts Brasil',
    foto: '/images/ebook/autores/Ana-Bielli-Aidar.jpg',
    linkedin: 'https://www.linkedin.com/in/ana-biselli-aidar-72aa3a11/',
  },
  {
    nome: 'Luiz Artur Ledur Brito',
    capitulo: 'Práticas de gestão como fonte de desempenho superior',
    cargo: 'Professor do departamento de Operações da FGV – EAESP',
    foto: '/images/ebook/autores/Luiz-Artur-Ledur-Britto.jpg',
  },
  {
    nome: 'Marcelo Traldi Fonseca',
    capitulo: 'Novos comportamentos para novos consumidores em Gastronomia',
    cargo: 'Professor e pesquisador do Centro Universitário Senac',
    foto: '/images/ebook/autores/Marcelo-Traldi.jpg',
    linkedin: 'https://www.linkedin.com/in/marcelo-traldi-b7210224/',
  },
  {
    nome: 'Mar Vila',
    capitulo: 'Práticas de gestão como fonte de desempenho superior',
    cargo: 'Diretora do Departamento de Economia, Finanças e Contabilidade da Esade',
    foto: '/images/ebook/autores/MarVila.jpg',
    linkedin: 'https://www.linkedin.com/in/mar-vila-1ab8627/',
  },
  {
    nome: 'Eliane Brito',
    capitulo: 'Transformação digital na jornada do consumidor de turismo',
    cargo: 'Coordenadora do CEMD FGV EAESP',
    foto: '/images/ebook/autores/Eliane-Brito.jpg',
  },
  {
    nome: 'Juliana Carbonari',
    capitulo: 'Tendências em infraestrutura e serviços hoteleiros no cenário futuro',
    cargo: 'Vice-Presidente da JLL’s Hotels & Hospitality Group',
    foto: '/images/ebook/autores/Juliana-Carbonari.jpg',
    linkedin: 'https://www.linkedin.com/in/juliana-carbonari-80550123/',
  },
  {
    nome: 'Alberto Guerrini',
    capitulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em viagens e turismo',
    cargo: 'Diretor Executivo e Sócio do BCG Milão',
    foto: '/images/ebook/autores/Alberto-Guerrini.jpg',
    linkedin: 'https://www.linkedin.com/in/alberto-guerrini-20743b/',
  },
  {
    nome: 'Lucie Chmelikova',
    capitulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em viagens e turismo',
    cargo: 'Expert Sênior do BCG Milão',
    foto: '/images/ebook/autores/Lucie.jpg',
    linkedin: 'https://www.linkedin.com/in/lucie-chmelikova/',
  },
  {
    nome: 'Patrícia Boaventura',
    capitulo: 'Transformação digital na jornada do consumidor de turismo',
    cargo: 'Gerente Administrativa e professora da FGV – EAESP',
    foto: '/images/ebook/autores/Patricia-Boaventura.jpg',
  },
  {
    nome: 'Pedro Freire',
    capitulo: 'Tendências em infraestrutura e serviços hoteleiros no cenário futuro',
    cargo: 'Diretor, Valuation and Advisory Services na JLL’s Hotels & Hospitality Group',
    foto: '/images/ebook/autores/Pedro-Freire.jpg',
    linkedin: 'https://www.linkedin.com/in/pedro-freire-a566219/',
  },
  {
    nome: 'Ricardo Mader',
    capitulo: 'Tendências em infraestrutura e serviços hoteleiros no cenário futuro',
    cargo: 'Managing Director da JLL’s Hotels & Hospitality Group',
    foto: '/images/ebook/autores/Ricardo-Mader-Rodrigues.jpg',
  },
  {
    nome: 'Masao Ukon',
    capitulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em viagens e turismo',
    cargo: 'Sócio Sênior e Diretor do BCG São Paulo',
    foto: '/images/ebook/autores/Masao-Ukon.jpg',
    linkedin: 'https://www.linkedin.com/in/masao-u-685b7/',
  },
  {
    nome: 'Lilian Carvalho',
    capitulo:
      'O papel do Marketing Digital no novo contexto do setor de Turismo | Transformação digital na jornada do consumidor de turismo',
    cargo: 'Coordenadora do CEMD FGV',
    foto: '/images/ebook/autores/Lilian-Carvalho.jpg',
  },
  {
    nome: 'Carolina Haro',
    capitulo: 'Os novos comportamentos dos viajantes brasileiros',
    cargo: 'Fundadora e sócia-diretora da Mapie',
    foto: '/images/ebook/autores/Carol-Haro.jpg',
    linkedin: 'https://www.linkedin.com/in/carolinaharo/',
  },
  {
    nome: 'Paulo Mélega',
    capitulo: 'Desafios da Operação Hoteleira na era da hospitalidade digital',
    cargo: 'Vice-presidente de Operações da Atrio Hotel Management',
    foto: '/images/ebook/autores/Paulo-Mélega.jpg',
    linkedin: 'https://www.linkedin.com/in/paulo-m%C3%A9lega-30aa3218/',
  },
  {
    nome: 'Eduardo Leone',
    capitulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em viagens e turismo',
    cargo: 'Sócio e Diretor do BCG São Paulo',
    foto: '/images/ebook/autores/Eduardo-Leone.jpg',
    linkedin: 'https://www.linkedin.com/in/eduardo-leone/',
  },
  {
    nome: 'Gabriela Otto',
    capitulo:
      'O passado e o futuro da distribuição Hoteleira estratégica: a história e o impacto na otimização de receitas',
    cargo: 'CEO da GO Consultoria e Presidenta da HSMAI Brasil',
    foto: '/images/ebook/autores/Gabriela-Otto.jpg',
    linkedin: 'https://www.linkedin.com/in/gabrielaotto/',
  },
  {
    nome: 'Patricia Azevedo',
    capitulo:
      'Escuta ativa por meio do Social Listening e Social Analytics: conceitos e exemplo de aplicação em negócios do setor de Turismo',
    cargo: 'Marketing Insights na Stilingue',
    foto: '/images/ebook/autores/Patrícia-Azevedo.jpg',
    linkedin: 'https://www.linkedin.com/in/patiazevedo/',
  },
  {
    nome: 'Steve Hood',
    capitulo: 'A Cultura de Compartilhamento de Dados',
    cargo: 'Vice-presidente Sênior de Pesquisa da STR',
    foto: '/images/ebook/autores/Steve-Hood.jpg',
    linkedin: 'https://www.linkedin.com/in/steve-hood-3a6a2315/',
  },
  {
    nome: 'Leandro Paez',
    capitulo: 'Gestão biônica de receitas (Pricing & Revenue Management) em viagens e turismo',
    cargo: 'Sócio do BCG São Paulo',
    foto: '/images/ebook/autores/Leandro-Paez.jpg',
    linkedin: 'https://www.linkedin.com/in/leandro-paez-19806611/',
  },
  {
    nome: 'Felipe Bogéa',
    capitulo: 'O papel do Marketing Digital no novo contexto do setor de Turismo',
    cargo: 'Sócio da F2F Digital',
    foto: '/images/ebook/autores/Felipe-Bogea.jpg',
    linkedin: 'https://www.linkedin.com/in/felipe-bog%C3%A9a/',
  },
  {
    nome: 'Beatriz Salles',
    capitulo:
      'Escuta ativa por meio do Social Listening e Social Analytics: conceitos e exemplo de aplicação em negócios do setor de Turismo',
    cargo: 'Marketing Insights na Stilingue',
    foto: '/images/ebook/autores/Beatriz-Salles.jpg',
    linkedin: 'https://www.linkedin.com/in/beatriz-silveira-salles-biologia/',
  },
  {
    nome: 'Mario Mouraz',
    capitulo: 'O novo jeito de fazer Revenue Management',
    cargo: 'CEO Climber-RMS',
    foto: '/images/ebook/autores/Mario-Mouraz.jpg',
    linkedin: 'https://www.linkedin.com/in/mariomouraz/',
  },
  {
    nome: 'Fillipi Nobre',
    capitulo: 'Os meios de pagamento como aliados na jornada dos clientes',
    cargo: 'Superintendente de Desenvolvimento de Negócios',
    foto: '/images/ebook/autores/Fillipi-Nobre.jpg',
    linkedin: 'https://www.linkedin.com/in/finobre/',
  },
  {
    nome: 'Augusto Rocha',
    capitulo: 'O futuro do seu negócio depende de quem está hospedado nele',
    cargo: 'Vice-presidente de Vendas e Marketing na Pmweb',
    foto: '/images/ebook/autores/Augusto-Rocha.jpg',
    linkedin: 'https://www.linkedin.com/in/gutorocha/',
  },
  {
    nome: 'Erich Casagrande',
    capitulo:
      'Compreendendo os resultados das ações junto ao viajante por meio dos indicadores adequados',
    cargo: 'Marketing Manager Lead Brasil na Semrush',
    foto: '/images/ebook/autores/Erich-Casagrande.jpg',
    linkedin: 'https://www.linkedin.com/in/erichcasagrande/',
  },
  {
    nome: 'Daniel Feitosa',
    capitulo: 'O novo jeito de fazer Revenue Management',
    cargo: 'Revenue Management Specialist na Climber-RMS',
    foto: '/images/ebook/autores/Daniel-Feitosa.jpg',
    linkedin: 'https://www.linkedin.com/in/feitosadaniel/',
  },
  {
    nome: 'Gabriela Schwan',
    capitulo:
      'Do tradicional ao versátil – Como inovar na hotelaria: Swan Generation: um marco evolutivo do ramo hoteleiro brasileiro',
    cargo: 'CEO da rede Swan Hotéis Brasilo e CEO e fundadora da Swan Portugal Collection',
    foto: '/images/ebook/autores/Gabriela-Schwan.jpg',
    linkedin: 'https://www.linkedin.com/in/gabriela-schwan-poltronieri-b7518311/',
  },
  {
    nome: 'Daniela Biedzicki',
    capitulo: 'O futuro do seu negócio depende de quem está hospedado nele',
    cargo: 'Analista de Marketing na Pmweb',
    foto: '/images/ebook/autores/Daniela-Biedzicki.jpg',
    linkedin: 'https://www.linkedin.com/in/daniela-biedzicki-38088414a/',
  },
  {
    nome: 'Alessandro Barreto',
    capitulo: 'Hotelaria e Golpes no Instagram: Como mitigar os riscos',
    cargo: 'Delegado de Polícia Civil',
    foto: '/images/ebook/autores/Alessandro-Barreto.jpg',
    linkedin: 'https://www.linkedin.com/in/delbarreto19/',
  },
  {
    nome: 'Michele Martins',
    capitulo: 'Qual é a aparência da nova realidade para operações em hotéis?',
    cargo: 'Pesquisadora e consultora independente',
    foto: '/images/ebook/autores/Michele-Martins.jpg',
  },
  {
    nome: 'Maria Ulrich',
    capitulo: 'Qual é a aparência da nova realidade para operações em hotéis?',
    cargo: 'Diretora de Vendas da ReviewPro para o Brasil',
    foto: '/images/ebook/autores/Maria-Ulrich.jpg',
    linkedin: 'https://www.linkedin.com/in/mariaveraulrich/',
  },
  {
    nome: 'Patricia Boo',
    capitulo: 'A Cultura de Compartilhamento de Dados',
    cargo: 'Diretora Regional da STR',
    foto: '/images/ebook/autores/Patricia-Boo.jpg',
    linkedin: 'https://www.linkedin.com/in/patricia-boo-1151aa17/',
  },
  {
    nome: 'Marcelo Picka Van Roey',
    capitulo: 'Reflexão Final',
    cargo:
      'Managing Director do Grande Hotel Escola São Pedro e Grande Hotel Escola Campos do Jordão e Presidente do Conselho da Resorts Brasil',
    foto: '/images/ebook/autores/Marcelo-Picka.jpg',
    linkedin: 'https://www.linkedin.com/in/marcelo-picka-van-roey-84870919/',
  },
];
