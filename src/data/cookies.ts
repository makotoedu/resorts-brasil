/**
 * Os cookies que este site realmente grava.
 *
 * A tabela publicada antes descrevia outro site: listava `__privaci_*` (uma
 * plataforma de consentimento que nunca foi instalada aqui), `Wordpress_test_cookie`
 * (o site nao e WordPress), `http_token` e `exitIntentFlag` (Poptin, ausente),
 * `Mc_ session` e `_gali`, com validades vencidas em 2021-2023 — e nao citava o
 * unico cookie que o site de fato gravava.
 *
 * Esta lista foi levantada por medicao, nao por copia: navegador limpo, uma
 * visita a home, seis segundos de espera, e leitura do que ficou gravado. O
 * `_ga_2S6ZPL4J2P` traz o ID da propriedade do Google Analytics 4 do site
 * (G-2S6ZPL4J2P), que e o unico jeito de descobrir de fora qual propriedade o
 * container GTM-PK7DG6MD carrega.
 *
 * O que muda por idioma — a finalidade de cada cookie e os rotulos da tabela —
 * fica em src/i18n/ui.ts, em `cookiePurposes`. Aqui so o que nao traduz.
 *
 * PENDENTE DE CONFIRMACAO DO CLIENTE: so o console do GTM diz o que mais pode
 * ser disparado por uma tag ainda nao publicada. Confira antes de publicar, e
 * lembre que o texto e juridico.
 */
export type CategoriaCookie = 'necessarios' | 'analise' | 'publicidade';

export interface Cookie {
  nome: string;
  fornecedor: string;
  /** Validade em dias, como observada no navegador. */
  dias: number;
  categoria: CategoriaCookie;
}

export const cookies: Cookie[] = [
  {
    nome: 'rb_consent',
    fornecedor: 'Resorts Brasil',
    dias: 180,
    categoria: 'necessarios',
  },
  {
    nome: '_ga',
    fornecedor: 'Google Analytics',
    dias: 400,
    categoria: 'analise',
  },
  {
    nome: '_ga_2S6ZPL4J2P',
    fornecedor: 'Google Analytics',
    dias: 400,
    categoria: 'analise',
  },
];

/** A ordem em que as categorias aparecem na politica. */
export const categoriasCookie: CategoriaCookie[] = ['necessarios', 'analise', 'publicidade'];
