// @ts-check
import { defineConfig } from 'astro/config';

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
});
