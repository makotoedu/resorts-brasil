/**
 * As 40 paginas do site e os 3 viewports, em um lugar so.
 *
 * A lista estava embutida no visual-diff.mjs. Com a suite de geometria
 * precisando da mesma varredura, duplicar seria criar exatamente o problema que
 * este projeto ja teve com conteudo triplicado: uma copia ganha uma pagina, a
 * outra nao, e o teste que deixou de rodar nao avisa que deixou de rodar.
 *
 * O catalogo do design system (/design) NAO entra: nao e pagina de conteudo,
 * nao tem traducao e nao esta no sitemap.
 */

export const PAGINAS = [
  '/index.html',
  '/resorts-brasil.html',
  '/diretoria.html',
  '/historia.html',
  '/associados.html',
  '/associe-se.html',
  '/publicacoes.html',
  '/estatisticas-e-estudos.html',
  '/apoie.html',
  '/fale-conosco.html',
  '/ebook.html',
  '/politica-de-privacidade.html',
  '/termos-de-uso.html',
  '/404.html',
  '/en-us/home.html',
  '/en-us/resorts-brasil.html',
  '/en-us/board.html',
  '/en-us/history.html',
  '/en-us/associates.html',
  '/en-us/join-us.html',
  '/en-us/publications.html',
  '/en-us/statistics-and-studies.html',
  '/en-us/support-tourism.html',
  '/en-us/contact-us.html',
  '/en-us/ebook.html',
  '/en-us/privacy-policy.html',
  '/en-us/terms-of-use.html',
  '/es-es/inicio.html',
  '/es-es/resorts-brasil.html',
  '/es-es/directorio.html',
  '/es-es/historia.html',
  '/es-es/asociados.html',
  '/es-es/asociese.html',
  '/es-es/publicaciones.html',
  '/es-es/estadisticas-y-estudios.html',
  '/es-es/apoye.html',
  '/es-es/contactenos.html',
  '/es-es/ebook.html',
  '/es-es/politica-de-privacidad.html',
  '/es-es/terminos-de-uso.html',
];

/**
 * O catalogo do design system.
 *
 * Fica fora da lista acima porque nao e pagina de conteudo — o diff visual nao
 * tem contra o que compara-lo, ja que ele nao existe no site original. Mas a
 * varredura de GEOMETRIA precisa dele, e por um motivo pratico: hoje ele e a
 * unica pagina que roda so sobre o sistema novo, entao um primitivo quebrado
 * aparece ali antes de aparecer em qualquer outro lugar. Aconteceu na Etapa 1 —
 * a escala tipografica transbordava 25px no mobile e nenhum outro portao viu.
 */
export const CATALOGO = '/design.html';

/**
 * As larguras sao uma por faixa do site, nao as do Tailwind:
 * xs 0-575 | sm 576-767 | md 768-1024 | lg 1025-1199 | xl 1200+
 *
 * 390 cai em xs, 768 na borda inferior de md e 1440 em xl. Ler o array errado
 * ja custou 22 comparacoes de tablet reprovadas neste projeto — o erro acerta
 * nos extremos e se esconde no meio da escala.
 */
export const VIEWPORTS = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1440, height: 900 },
];

/** PAGES=/index.html,/ebook.html limita a rodada. */
export const paginasSelecionadas = () =>
  process.env.PAGES ? process.env.PAGES.split(',') : PAGINAS;

/** VIEWPORTS=desktop limita a rodada. */
export const viewportsSelecionados = () =>
  VIEWPORTS.filter((v) => !process.env.VIEWPORTS || process.env.VIEWPORTS.split(',').includes(v.nome));
