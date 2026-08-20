// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { routes, htmlLang, locales, defaultLocale } from './src/i18n/ui.ts';

/**
 * Alternates de cada pagina, indexadas pela URL sem extensao.
 *
 * O i18n embutido do @astrojs/sitemap nao serve aqui: ele assume o mesmo slug
 * em todos os idiomas (/about e /en/about) e pareia por prefixo de caminho.
 * Os slugs deste site sao traduzidos — /historia e /en-us/history sao a mesma
 * pagina — entao o pareamento tem de sair do mapa `routes`, que ja e a fonte
 * unica de verdade do canonical e das tags hreflang do BaseLayout.
 */
const SITE = 'https://www.resortsbrasil.com.br';
/** @param {string} caminho */
const abs = (caminho) => new URL(caminho, SITE).href;

/** @type {Map<string, { lang: string, url: string }[]>} */
const alternatesByUrl = new Map();
for (const slugs of Object.values(routes)) {
  const links = locales.map((lang) => ({ lang: htmlLang[lang], url: abs(slugs[lang]) }));
  // x-default aponta para o portugues, igual ao que o BaseLayout emite no HTML.
  links.push({ lang: 'x-default', url: abs(slugs[defaultLocale]) });
  for (const lang of locales) alternatesByUrl.set(slugs[lang], links);
}

export default defineConfig({
  site: 'https://www.resortsbrasil.com.br',

  // 'file' gera historia.html em vez de historia/index.html. Combinado com o
  // cleanUrls: true do vercel.json, preserva exatamente as URLs atuais.
  build: {
    format: 'file',
  },

  trailingSlash: 'never',

  i18n: {
    locales: ['pt-br', 'en-us', 'es-es'],
    defaultLocale: 'pt-br',
    routing: {
      // PT continua na raiz e nao ha redirect automatico: as URLs atuais do
      // site sao requisito, e qualquer roteamento implicito as mudaria.
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      // A 404 nao e uma pagina de conteudo e nao tem traducao.
      filter: (page) => !page.endsWith('/404'),
      serialize(item) {
        // O build gera .html; a URL publica nao tem extensao (cleanUrls).
        const caminho = new URL(item.url).pathname.replace(/\.html$/, '');
        const canonical = caminho === '/index' ? '/' : caminho;

        item.url = abs(canonical);

        const links = alternatesByUrl.get(canonical);
        if (links) item.links = links;

        return item;
      },
    }),
  ],
});
