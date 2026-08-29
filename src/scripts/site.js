/**
 * Comportamentos do site em JS nativo, substituindo jquery.js + plugins.js +
 * functions.js (504 KB).
 *
 * Os nomes de estado sao herdados do tema Inspiro (.toggle-active,
 * .mainMenu-open, .modal-active, #mainMenu, #scrollTop) — foi isso que deixou um
 * script so servir as duas camadas durante a migracao inteira. Hoje quem os
 * declara e o <style> do cromo.
 *
 * Fora daqui de proposito, por nao existirem neste site: lightbox, filtro de
 * portfolio, parallax, contagem regressiva, graficos, sticky sidebar e
 * cabecalho fixo no scroll.
 *
 * ---------------------------------------------------------------------------
 * O CICLO DE VIDA, E POR QUE ELE E A PARTE DIFICIL DESTE ARQUIVO
 * ---------------------------------------------------------------------------
 *
 * Com o <ClientRouter />, o documento NAO recarrega entre paginas: o corpo e
 * trocado e este modulo continua o mesmo, ja avaliado. Um `DOMContentLoaded`
 * ingenuo deixaria de disparar, e — pior — todo listener preso a `document` ou
 * a `window` ACUMULARIA a cada navegacao se alguem os registrasse de novo.
 *
 * Sao tres os presos assim: o `resize` do menu, o `click` de fora do seletor de
 * idioma e o `scroll` do voltar-ao-topo. Depois de cinco navegacoes, cinco
 * copias de cada — e o menu abriria e fecharia no mesmo clique, porque cinco
 * `setOpen(!open)` rodariam em sequencia sobre closures diferentes.
 *
 * A Etapa 0 adiou as View Transitions exatamente por isso, quando a lista era
 * bem maior: 6 listeners persistentes, 1 setInterval (o autoplay do carrossel,
 * que aceleraria progressivamente) e 1 IntersectionObserver. As etapas 7 e 9
 * levaram os tres ultimos embora ao trocar carrossel, masonry e contadores por
 * CSS, e e por isso que o ciclo de vida cabe agora em vinte linhas.
 *
 * O contrato: TODO listener recebe o `signal`, e todo timer se cancela no
 * `abort`. Nada de `removeEventListener` a mao — um esquecido nao aparece no
 * primeiro clique depois da navegacao, aparece no quinto.
 */

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

/* Menu mobile ------------------------------------------------------------ */
// O tema anima min-height de 0 ate a altura da janela em 500ms com
// easeInOutQuart, marcando .toggle-active no gatilho, .mainMenu-open no body e
// .menu-animate no menu 300ms depois. Os submenus nao precisam de toggle: abaixo
// de 992px o CSS ja os deixa em display:block.
function mobileMenu(signal) {
  const trigger = document.querySelector('#mainMenu-trigger a, #mainMenu-trigger button');
  const menu = document.querySelector('#mainMenu');
  if (!trigger || !menu) return;

  const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
  let open = false;
  let animateTimer;
  signal.addEventListener('abort', () => clearTimeout(animateTimer), { once: true });

  const setOpen = (next) => {
    open = next;
    menu.style.transition = `min-height 500ms ${EASE}`;
    menu.style.minHeight = next ? `${window.innerHeight}px` : '0px';
    trigger.classList.toggle('toggle-active', next);
    trigger.setAttribute('aria-expanded', String(next));
    document.body.classList.toggle('mainMenu-open', next);

    clearTimeout(animateTimer);
    if (next) {
      animateTimer = setTimeout(() => menu.classList.add('menu-animate'), 300);
    } else {
      menu.classList.remove('menu-animate');
    }
  };

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    setOpen(!open);
  }, { signal });

  // O gatilho e um <a> sem href com role="button": o clique do mouse funciona
  // sozinho, mas Enter e Espaco precisam ser tratados a mao — sem isso o
  // elemento recebe foco pelo teclado e nao responde a ele.
  trigger.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setOpen(!open);
  }, { signal });

  // O tema fecha o menu ao redimensionar para o breakpoint de desktop.
  // PRESO A `window`: sem o signal, uma copia por navegacao.
  window.addEventListener('resize', () => {
    if (open && window.innerWidth >= 992) setOpen(false);
  }, { signal });
}

/* Seletor de idioma ------------------------------------------------------ */
// No desktop o CSS abre por :hover; o clique existe para toque.
function languageDropdown(signal) {
  // Mantem aria-expanded junto da classe de estado: sao a mesma informacao,
  // uma para o CSS e outra para o leitor de tela.
  const sync = (drop) => {
    const link = drop.querySelector(':scope > a');
    if (link) link.setAttribute('aria-expanded', String(drop.classList.contains('dropdown-active')));
  };

  document.querySelectorAll('.p-dropdown').forEach((drop) => {
    const link = drop.querySelector(':scope > a');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      drop.classList.toggle('dropdown-active');
      sync(drop);
    }, { signal });
    // Esc fecha e devolve o foco ao gatilho, como qualquer menu.
    drop.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !drop.classList.contains('dropdown-active')) return;
      drop.classList.remove('dropdown-active');
      sync(drop);
      link.focus();
    }, { signal });
  });

  // PRESO A `document`: sem o signal, uma copia por navegacao.
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.p-dropdown.dropdown-active').forEach((drop) => {
      if (drop.contains(e.target)) return;
      drop.classList.remove('dropdown-active');
      sync(drop);
    });
  }, { signal });
}

/* Submenus da navegacao -------------------------------------------------- */
// O submenu abre por CSS (:hover no desktop, sempre aberto no mobile), e o
// ajustes.css acrescentou :focus-within para o teclado. Falta so manter o
// aria-expanded honesto: um atributo fixo em "false" enquanto o menu abre
// engana mais o leitor de tela do que a ausencia dele.
function navDropdowns(signal) {
  document.querySelectorAll('#mainMenu nav > ul > li.dropdown').forEach((li) => {
    const link = li.querySelector(':scope > a');
    if (!link) return;
    const marcar = (aberto) => link.setAttribute('aria-expanded', String(aberto));
    li.addEventListener('mouseenter', () => marcar(true), { signal });
    li.addEventListener('mouseleave', () => marcar(false), { signal });
    li.addEventListener('focusin', () => marcar(true), { signal });
    li.addEventListener('focusout', (e) => {
      if (!li.contains(e.relatedTarget)) marcar(false);
    }, { signal });
  });
}

/* Hero: Ken Burns e legendas --------------------------------------------- */
// REMOVIDO NA ETAPA 9, junto com a home que era a unica pagina a usa-lo.
//
// `hero()` criava a camada `.kenburns-bg` lendo a URL de um `style=` inline —
// o que impedia `srcset` e `lazy` na maior imagem do site — e revelava as
// legendas com `setTimeout`, porque `.slide-captions > *` nasce com
// `opacity: 0` no CSS do tema. As duas coisas eram armadilha: a camada tinha
// `z-index: -1` e so aparecia dentro de um contexto de empilhamento que o
// flickity criava, entao o zoom PAROU quando o plugin saiu; e as legendas sao
// da mesma familia do `.grid-loaded` que deixou seis paginas invisiveis.
//
// O <Hero> faz as duas em CSS, e nos dois casos a falha aponta para o lado
// seguro: a foto e um filho posicionado por `inset: 0`, sem z-index negativo, e
// a cascata parte de `animation-fill-mode: both` — se a animacao nao rodar, o
// texto aparece.

/* Carrossel de logos ----------------------------------------------------- */
// REMOVIDO NA ETAPA 9, e a nota fica pelo mesmo motivo da do masonry logo
// abaixo: a funcao era citada em varios lugares da documentacao.
//
// `logoCarousel()` reproduzia a matematica de celula do flickity para a faixa de
// logotipos das tres homes — embrulhava cada filho em `.polo-carousel-item`,
// media a largura util, dividia pelo numero de colunas da faixa da janela e
// avancava um item por segundo, reciclando o primeiro para o fim.
//
// ELA ANIMAVA UM ELEMENTO INVISIVEL. `.carousel` tem `opacity: 0` e
// `visibility: hidden` no style.css, e so `.carousel.carousel-loaded` devolve as
// duas — classe que o init do flickity punha (js/functions.js:1179) e que saiu
// com o jQuery. Desde entao as tres homes baixavam 70 logotipos em tamanho
// original para nao mostrar nenhum, e o teste de comportamento continuava
// passando porque comparava o `src` do primeiro item, que mudava do mesmo jeito.
//
// A faixa passou para <CarrosselLogos>, que e CSS: a fila e escrita duas vezes e
// uma animacao de `transform` desloca a trilha em -50%, fechando a volta sem
// emenda. Com ela sai o UNICO `setInterval` que o projeto ainda tinha — o
// autoplay que a Etapa 0 registrou como obstaculo as View Transitions, porque
// acumularia a cada navegacao e aceleraria a faixa progressivamente.
//
// Sobra UM listener de `resize`, o do mobileMenu(), e ele nao mede layout: fecha
// o menu ao passar para o breakpoint de desktop. Nenhum listener persistente do
// projeto calcula geometria — a Etapa 7 tirou os dois do masonry e esta tirou os
// do carrossel.

/* Grades .grid-layout ---------------------------------------------------- */
// REMOVIDO NA ETAPA 7, e a nota fica porque a funcao era citada em tres lugares
// da documentacao. Ela substituia o Isotope nas paginas de publicacoes e de
// estatisticas — empacotava os itens na coluna mais curta, em posicionamento
// absoluto, com listeners de `resize` e de `load` para refazer a conta.
//
// As seis paginas passaram para <Grade>, que e grade CSS com `gap` e container
// query: alturas desiguais deixam de produzir escada sem que ninguem calcule
// nada. Com ela saem os dois ultimos listeners persistentes que existiam so por
// causa do masonry — e some a classe `.grid-loaded`, cujo `opacity: 0` ja deixou
// seis paginas invisiveis quando o jQuery foi removido.

/* Contadores ------------------------------------------------------------- */
// REMOVIDO NA ETAPA 9. Ja estava inerte desde a Etapa 8, quando /associados
// migrou: a funcao procura `[data-to]`, e o <Contador> emite
// `[data-contador]` com o valor final JA ESCRITO dentro do elemento, mais o
// proprio script. No tema o `<span data-to="83">` vinha VAZIO, entao a secao
// que existe para dizer cinco numeros mostrava cinco rotulos em branco para
// quem chegasse sem JavaScript.
//
// Com ela sai o unico IntersectionObserver deste arquivo.

/* Abas ------------------------------------------------------------------- */
// REMOVIDO NA ETAPA 9, e como o contador ja estava inerte desde a Etapa 8.
// Toda a funcao dependia de `[data-bs-toggle="tab"]`, o gancho do Bootstrap, e
// as <Abas> nao o emitem — elas trazem o proprio script, com `role="tab"`,
// `aria-selected` e tabulacao rotativa.
//
// Nao era so codigo morto parado: `tabs()` varria `[role="tablist"]`, que as
// <Abas> USAM. Ele saia sem fazer nada por nao achar o atributo do Bootstrap
// dentro, mas era um segundo dono a um passo de distancia do mesmo elemento.

/* Consentimento de cookies ----------------------------------------------- */
/*
 * So a interface. Quem grava o cookie, fala Consent Mode e decide carregar (ou
 * nao) o GTM e o window.rbConsent, no bloco inline do <head> (Cabeca.astro) —
 * aquilo precisa rodar antes de qualquer rede, e este arquivo so roda no
 * DOMContentLoaded.
 *
 * A faixa continua usando as classes de estado do tema (.modal-strip,
 * .modal-active), entao o CSS existente vale sem alteracao.
 */
function cookieNotice(signal) {
  const notice = document.querySelector('.cookie-notify');
  const api = window.rbConsent;
  if (!notice || !api) return;

  const painel = notice.querySelector('#cookiePrefs');
  const btnPersonalizar = notice.querySelector('[data-cookie="personalizar"]');
  const caixas = notice.querySelectorAll('[data-cookie-cat]');

  // O `hidden` so cai depois que a faixa termina de descer, e quem reabre pelo
  // rodape dentro desses 700ms cancelaria a si mesmo se o timer sobrevivesse.
  let timerEsconder = null;
  signal.addEventListener('abort', () => {
    clearTimeout(timerEsconder);
    /* `rbConsent` vive no <head> e ATRAVESSA a navegacao — e o unico estado
       deste arquivo que nao morre com o corpo da pagina. Deixar o callback
       apontando para a faixa que acabou de ser trocada faria o botao do rodape
       reabrir um elemento destacado do documento. */
    if (api.aoAbrir === reabrir) api.aoAbrir = null;
  }, { once: true });

  const mostrar = () => {
    clearTimeout(timerEsconder);
    notice.hidden = false;
    // Um quadro de intervalo entre revelar e animar: sem isso o navegador
    // calcula o estado inicial ja com a classe aplicada e nao ha transicao.
    requestAnimationFrame(() => notice.classList.add('modal-active'));
  };

  const esconder = () => {
    notice.classList.remove('modal-active');
    fecharPainel(false);
    // Espera a transicao do tema (.7s) antes do hidden, senao a faixa some de
    // uma vez em vez de descer.
    clearTimeout(timerEsconder);
    timerEsconder = setTimeout(() => {
      notice.hidden = true;
    }, 700);
  };

  const abrirPainel = () => {
    painel.hidden = false;
    btnPersonalizar.setAttribute('aria-expanded', 'true');
    const escolha = api.get();
    caixas.forEach((c) => {
      c.checked = !!(escolha && escolha[c.dataset.cookieCat]);
    });
    caixas[0]?.focus();
  };

  function fecharPainel(devolverFoco = true) {
    if (painel.hidden) return;
    painel.hidden = true;
    btnPersonalizar.setAttribute('aria-expanded', 'false');
    if (devolverFoco) btnPersonalizar.focus();
  }

  const decidir = (escolha) => {
    api.set(escolha);
    esconder();
  };

  notice.addEventListener('click', (e) => {
    const acao = e.target.closest('[data-cookie]')?.dataset.cookie;
    if (acao === 'aceitar') decidir({ analise: true, publicidade: true });
    else if (acao === 'rejeitar') decidir({ analise: false, publicidade: false });
    else if (acao === 'personalizar') (painel.hidden ? abrirPainel : fecharPainel)();
    else if (acao === 'salvar') {
      const escolha = { analise: false, publicidade: false };
      caixas.forEach((c) => {
        escolha[c.dataset.cookieCat] = c.checked;
      });
      decidir(escolha);
    }
  }, { signal });

  // Esc fecha o painel e volta para a faixa — nunca fecha a faixa inteira, o
  // que equivaleria a decidir por quem nao decidiu.
  notice.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !painel.hidden) {
      e.stopPropagation();
      fecharPainel();
    }
  }, { signal });

  // O botao do rodape entra por aqui. Reabrir ja mostra o painel: quem pediu
  // para rever a escolha quer as categorias, nao a faixa de novo.
  function reabrir() {
    mostrar();
    abrirPainel();
  }
  api.aoAbrir = reabrir;

  // Sem escolha registrada, a faixa aparece de imediato. O atraso de 2s do
  // original so fazia sentido quando ela era decorativa; agora nada e medido
  // enquanto ela nao for respondida, e adiar a pergunta seria adiar a medicao.
  if (!api.get()) mostrar();

  // O botao do rodape so existe quando ha JavaScript para atende-lo.
  const revogar = document.querySelector('.cookie-manage');
  if (revogar) {
    revogar.hidden = false;
    revogar
      .querySelector('.cookie-manage-btn')
      .addEventListener('click', () => api.abrir(), { signal });
  }
}

/* Voltar ao topo --------------------------------------------------------- */
// O tema mexe direto no style porque #scrollTop nasce com opacity 0 e z-index -1.
function scrollTop(signal) {
  const button = document.querySelector('#scrollTop');
  if (!button) return;

  const threshold = Number(document.body.getAttribute('data-offset')) || 400;

  const update = () => {
    const visible = window.scrollY > threshold;
    button.style.bottom = visible ? '26px' : '0px';
    button.style.opacity = visible ? '1' : '0';
    button.style.zIndex = visible ? '199' : '-1';
  };

  // PRESO A `window`: sem o signal, uma copia por navegacao — e este dispara a
  // cada quadro de rolagem, entao seria o mais caro dos tres.
  window.addEventListener('scroll', update, { passive: true, signal });
  // preventDefault para o href="#top" nao sujar a URL quando ha JavaScript. Sem
  // JavaScript o href continua valendo e leva ao topo do documento.
  button.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, { signal });
  update();
}

/* Fachada dos videos do YouTube ------------------------------------------ */
/*
 * Ate o clique, nenhum dominio do Google e contatado por causa do video. O
 * clique e o consentimento para aquele embed — e por isso a fachada nao depende
 * da faixa de cookies.
 *
 * O destino e youtube-nocookie.com, que so grava cookie depois que o video
 * comeca a tocar.
 */
function videoFacades(signal) {
  document.querySelectorAll('.yt-facade-btn').forEach((botao) => {
    botao.addEventListener('click', (e) => {
      // O href leva a pagina do video e e o caminho de quem esta sem JavaScript;
      // aqui ele da lugar ao embed no proprio lugar da fachada.
      e.preventDefault();
      const { yt, ytParams, ytTitulo } = botao.dataset;
      const iframe = document.createElement('iframe');
      iframe.src =
        `https://www.youtube-nocookie.com/embed/${yt}?` + (ytParams ? `${ytParams}&` : '') + 'autoplay=1';
      iframe.title = ytTitulo;
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      botao.parentElement.replaceChildren(iframe);
      // Quem chegou pelo teclado perderia o foco no <button> que acabou de sumir.
      iframe.focus();
    }, { signal });
  });
}

/* Pageview das navegacoes sem recarga ------------------------------------- */
/*
 * SEM CARGA DE PAGINA, O GTM NAO CONTA A VISITA SOZINHO. O gtm.js dispara o
 * pageview uma vez, quando entra no documento; da segunda pagina em diante o
 * corpo e trocado e nenhuma rede acontece. Sem este empurrao, o Analytics
 * passaria a ver uma sessao de uma pagina so — e a perda seria invisivel aqui
 * dentro, porque nenhum portao deste projeto olha para dado de terceiro.
 *
 * SO EMPURRA SE O CONTAINER FOI CARREGADO, que e o que `api.medindo()` responde.
 * Sem isso, quem recusou os cookies acumularia eventos num `dataLayer` que
 * ninguem consome — e, pior, eles seriam REPRODUZIDOS de uma vez se a pessoa
 * aceitasse depois, inventando um punhado de visitas com a hora errada.
 *
 * DEPENDE DE CONFIGURACAO NO CONSOLE DO GTM, e isso nao se resolve daqui: o
 * container precisa de um gatilho para o evento `pageview_spa` (ou para History
 * Change, que o router tambem provoca). Ate isso ser feito, a navegacao interna
 * nao aparece no relatorio. Mesma familia da nota de src/data/cookies.ts.
 */
function pageviewSpa() {
  const api = window.rbConsent;
  if (!api || typeof api.medindo !== 'function' || !api.medindo()) return;
  window.dataLayer.push({
    event: 'pageview_spa',
    page_location: location.href,
    page_path: location.pathname + location.search,
    page_title: document.title,
  });
}

/* Montagem e desmontagem -------------------------------------------------- */

let controlador = null;

function montar() {
  if (controlador) return;
  controlador = new AbortController();
  const { signal } = controlador;
  mobileMenu(signal);
  languageDropdown(signal);
  navDropdowns(signal);
  cookieNotice(signal);
  videoFacades(signal);
  scrollTop(signal);
}

function desmontar() {
  controlador?.abort();
  controlador = null;
}

/*
 * DOIS GATILHOS PARA A MESMA MONTAGEM, e o segundo e uma rede de seguranca.
 *
 * `astro:page-load` dispara na carga inicial E depois de cada navegacao do
 * router, entao sozinho ele bastaria — desde que o <ClientRouter /> esteja no
 * layout. Se alguem o tirar, o evento simplesmente nunca acontece e ESTE ARQUIVO
 * INTEIRO fica inerte: menu morto, faixa de cookies que nunca aparece, botao de
 * voltar ao topo parado. Nenhum erro, nenhum aviso — a assinatura exata das
 * armadilhas que este projeto ja documentou cinco vezes.
 *
 * O `ready()` fecha esse buraco. Na carga inicial com o router presente ele
 * chega primeiro (DOMContentLoaded vem antes de `astro:page-load`), monta, e o
 * `astro:page-load` seguinte encontra `controlador` preenchido e nao faz nada.
 * Sem o router, ele e o unico a rodar, e o comportamento e o de antes.
 */
ready(montar);
document.addEventListener('astro:before-swap', desmontar);

/*
 * A PRIMEIRA CARGA NAO EMPURRA PAGEVIEW, e o motivo e que ela ja tem um: o
 * `astro:page-load` dispara tambem na entrada no site, e ali quem conta a visita
 * e o proprio gtm.js ao ser injetado. Empurrar aqui tambem dobraria toda sessao.
 *
 * Vale igual para quem aceita os cookies no meio da navegacao: o container entra
 * naquele momento e conta a pagina em que a pessoa esta; daí em diante as trocas
 * de corpo passam por aqui.
 */
let primeiraCarga = true;
document.addEventListener('astro:page-load', () => {
  montar();
  if (primeiraCarga) {
    primeiraCarga = false;
    return;
  }
  pageviewSpa();
});
