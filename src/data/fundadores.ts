/**
 * As 12 empresas que fundaram a associacao em dezembro de 2001.
 *
 * Nome proprio nao traduz, entao e `src/data/` e nao `src/i18n/ui.ts` — a mesma
 * regra que separa o nome de um resort do rotulo de uma aba.
 *
 * A LISTA ERA MARKUP, e o markup carregava uma decisao de layout junto: no tema
 * ela vinha partida em tres `<ul>` de quatro itens, um por coluna do Bootstrap.
 * Isso e uma lista so exibida em tres colunas, mas para o leitor de tela eram
 * tres listas de quatro — e mudar o conteudo obrigava a reequilibrar as colunas
 * a mao. Aqui e um array; quem faz as colunas e o `<ListaIcones colunas={3}>`,
 * em CSS.
 *
 * A ORDEM E A DO SITE, e ela e por coluna: os quatro primeiros formavam a
 * primeira coluna, e assim por diante. `columns: 3` preenche na mesma direcao,
 * entao a leitura na tela continua identica.
 */
export const fundadores: string[] = [
  'Accor Sofitel',
  'Blue Tree Park Angra dos Reis',
  'Blue Tree Cabo de Santo Agostinho',
  'Costão do Santinho Resort',
  'Hotel do Frade',
  'Mabu Hotéis & Resorts',
  'Porto Bello',
  'Pousada do Rio Quente',
  'Club Hotel Salinas do Maragogi',
  'Summerville Hotel',
  'Superclubs',
  'Tropical Manaus',
];
