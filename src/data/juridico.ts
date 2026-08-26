import { htmlLang, type Locale } from '../i18n/ui';

/**
 * As datas dos dois documentos juridicos.
 *
 * ESTAVAM ESCRITAS NO MARKUP, uma vez por idioma — seis lugares para duas datas.
 * O risco nao e teorico: atualizar uma politica de privacidade e mexer no texto
 * dos tres arquivos, e a data e a ultima linha em que alguem pensa. Aqui e uma
 * so, e as tres paginas leem dela.
 *
 * O formato e ISO por um segundo motivo, e ele estava visivel no site: o
 * original exibia `12/06/2025` nos TRES idiomas. Em portugues e espanhol
 * aquilo e 12 de junho; para um leitor de lingua inglesa, `12/06` e 6 de
 * dezembro. A data certa, escrita de um jeito que so acerta em dois dos tres
 * idiomas. Guardando o dia como dado, cada idioma o escreve do seu jeito.
 */
export const juridico = {
  /** "Atualizada em 21/02/2022" no rodape do titulo dos termos. */
  termos: { atualizadoEm: '2022-02-21' },
  /** "Última atualização: 12/06/2025" na politica. */
  privacidade: { atualizadoEm: '2025-06-12' },
} as const;

/**
 * A data por extenso, no idioma pedido.
 *
 * `timeZone: 'UTC'` nao e detalhe: `new Date('2022-02-21')` e meia-noite UTC, e
 * formatar isso no fuso do Brasil (UTC-3) devolve **20 de fevereiro**. O build
 * roda em maquina nenhuma em particular, entao o dia mudaria conforme quem
 * buildasse.
 */
export function dataEm(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(htmlLang[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
