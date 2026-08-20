/**
 * Comportamentos do site em JS nativo, substituindo jquery.js + plugins.js +
 * functions.js (504 KB).
 *
 * Cada bloco replica o que o tema Inspiro fazia, usando as MESMAS classes de
 * estado, para que o CSS existente continue valendo sem alteracao.
 *
 * Fora daqui de proposito, por nao existirem neste site: lightbox, filtro de
 * portfolio, parallax, contagem regressiva, graficos, sticky sidebar e o
 * cabecalho fixo no scroll (as 40 paginas usam .header-disable-fixed, que
 * desliga esse comportamento no proprio tema).
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
function mobileMenu() {
  const trigger = document.querySelector('#mainMenu-trigger a, #mainMenu-trigger button');
  const menu = document.querySelector('#mainMenu');
  if (!trigger || !menu) return;

  const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
  let open = false;
  let animateTimer;

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
  });

  // O gatilho e um <a> sem href com role="button": o clique do mouse funciona
  // sozinho, mas Enter e Espaco precisam ser tratados a mao — sem isso o
  // elemento recebe foco pelo teclado e nao responde a ele.
  trigger.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setOpen(!open);
  });

  // O tema fecha o menu ao redimensionar para o breakpoint de desktop.
  window.addEventListener('resize', () => {
    if (open && window.innerWidth >= 992) setOpen(false);
  });
}

/* Seletor de idioma ------------------------------------------------------ */
// No desktop o CSS abre por :hover; o clique existe para toque.
function languageDropdown() {
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
    });
    // Esc fecha e devolve o foco ao gatilho, como qualquer menu.
    drop.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !drop.classList.contains('dropdown-active')) return;
      drop.classList.remove('dropdown-active');
      sync(drop);
      link.focus();
    });
  });

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.p-dropdown.dropdown-active').forEach((drop) => {
      if (drop.contains(e.target)) return;
      drop.classList.remove('dropdown-active');
      sync(drop);
    });
  });
}

/* Submenus da navegacao -------------------------------------------------- */
// O submenu abre por CSS (:hover no desktop, sempre aberto no mobile), e o
// ajustes.css acrescentou :focus-within para o teclado. Falta so manter o
// aria-expanded honesto: um atributo fixo em "false" enquanto o menu abre
// engana mais o leitor de tela do que a ausencia dele.
function navDropdowns() {
  document.querySelectorAll('#mainMenu nav > ul > li.dropdown').forEach((li) => {
    const link = li.querySelector(':scope > a');
    if (!link) return;
    const marcar = (aberto) => link.setAttribute('aria-expanded', String(aberto));
    li.addEventListener('mouseenter', () => marcar(true));
    li.addEventListener('mouseleave', () => marcar(false));
    li.addEventListener('focusin', () => marcar(true));
    li.addEventListener('focusout', (e) => {
      if (!li.contains(e.relatedTarget)) marcar(false);
    });
  });
}

/* Hero: Ken Burns e legendas --------------------------------------------- */
// O hero tem um unico slide, entao nao ha carrossel: basta montar a camada de
// fundo que recebe o zoom e revelar as legendas em cascata.
// .slide-captions > * comeca com opacity 0 no CSS do tema.
function hero() {
  document.querySelectorAll('.inspiro-slider .slide.kenburns').forEach((slide) => {
    if (slide.querySelector('.kenburns-bg')) return;
    const image = slide.style.backgroundImage;
    if (!image) return;

    const bg = document.createElement('div');
    bg.className = 'kenburns-bg';
    bg.style.backgroundImage = image;
    bg.style.width = '100%';
    slide.insertBefore(bg, slide.firstChild);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => bg.classList.add('kenburns-bg-animate'));
    });
  });

  document.querySelectorAll('.inspiro-slider .slide-captions').forEach((captions) => {
    [...captions.children].forEach((el, i) => {
      const duration = el.getAttribute('data-animate-duration') || 600;
      const delay = el.getAttribute('data-caption-delay') || i * 350 + 1000;
      const animation = el.getAttribute('data-caption-animate') || 'animate__fadeInUp';
      el.style.animationDuration = `${duration}ms`;
      setTimeout(() => {
        el.style.opacity = 1;
        el.classList.add(animation);
      }, Number(delay));
    });
  });
}

/* Carrossel de logos ----------------------------------------------------- */
// Marquee continuo: avanca um item por vez e recicla o primeiro para o fim,
// o que dispensa clonar a lista para dar a volta.
function logoCarousel() {
  document.querySelectorAll('.carousel.client-logos').forEach((carousel) => {
    const originals = [...carousel.children];
    if (originals.length < 2) return;

    // Reproduz a estrutura que o flickity montava: cada item embrulhado em
    // .polo-carousel-item. E essa classe que o CSS do tema estiliza
    // (padding: 20px 30px, e img { width: 100% }), entao recriar o wrapper
    // faz o dimensionamento das logos voltar a valer sem tocar no CSS.
    const cells = originals.map((child) => {
      if (child.classList.contains('polo-carousel-item')) return child;
      const cell = document.createElement('div');
      cell.className = 'polo-carousel-item';
      child.replaceWith(cell);
      cell.appendChild(child);
      return cell;
    });

    // 7000 e o padrao do tema (`autoPlay: data-autoplay || 7000`). O carrossel
    // de logos nao traz o atributo, entao girava a cada 7s, nao a cada 1s.
    const interval = Number(carousel.getAttribute('data-autoplay')) || 7000;
    // O tema aplicava padding-right inline a partir de data-margin, sobrepondo
    // os 30px do CSS. Sem isso a logo fica menor que no original.
    const margin = Number(carousel.getAttribute('data-margin')) || 10;

    // Cadeia de colunas do tema (js/functions.js, linhas 1048-1089): cada faixa
    // menor herda a de cima limitada a um teto, salvo data-items-* explicito.
    const attrNum = (nome) => Number(carousel.getAttribute(nome)) || 0;
    const items = attrNum('data-items') || 4;
    const itemsLg = attrNum('data-items-lg') || Math.min(items, 4);
    const itemsMd = attrNum('data-items-md') || Math.min(itemsLg, 3);
    const itemsSm = attrNum('data-items-sm') || Math.min(itemsMd, 2);
    const itemsXs = attrNum('data-items-xs') || Math.min(itemsSm, 1);

    carousel.style.display = 'flex';
    carousel.style.overflow = 'hidden';

    // As faixas sao as de js/functions.js, nao as do plugin — ver o comentario
    // em public/css/ajustes.css. O plugin media com $(window).width(), que e o
    // clientWidth do documento (sem a barra de rolagem).
    const columns = () => {
      const w = document.documentElement.clientWidth;
      if (w < 576) return itemsXs;
      if (w < 768) return itemsSm;
      if (w < 1025) return itemsMd;
      if (w < 1200) return itemsLg;
      return items;
    };

    // Largura da celula como o flickity calculava: a margem entra na conta e so
    // depois vira padding, entao as colunas somadas preenchem exatamente a
    // largura util e o padding da ultima celula fica para fora, no corte do
    // overflow. Dividir a largura por colunas deixa cada logo alguns px menor.
    const layout = () => {
      const cols = columns();
      const estilo = getComputedStyle(carousel);
      const util =
        carousel.clientWidth -
        parseFloat(estilo.paddingLeft) -
        parseFloat(estilo.paddingRight);
      const cellWidth = (util + margin) / cols;
      cells.forEach((cell) => {
        cell.style.flex = `0 0 ${cellWidth}px`;
        cell.style.maxWidth = `${cellWidth}px`;
        // As celulas do flickity eram quadradas: a altura do carrossel
        // acompanhava a largura da celula.
        cell.style.height = `${cellWidth}px`;
        cell.style.paddingRight = `${margin}px`;
      });
    };

    layout();
    window.addEventListener('resize', layout);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let busy = false;
    setInterval(() => {
      if (busy || document.hidden) return;
      busy = true;
      const first = carousel.firstElementChild;
      // Um passo e uma celula. Em px, nao em %: a celula mede
      // (largura util + margem) / colunas, que nao e uma fracao redonda da
      // largura do carrossel.
      const step = first.getBoundingClientRect().width;
      carousel.style.transition = 'transform 600ms ease';
      carousel.style.transform = `translateX(-${step}px)`;

      let encerrado = false;
      const done = () => {
        if (encerrado) return;
        encerrado = true;
        carousel.style.transition = 'none';
        carousel.style.transform = 'translateX(0)';
        carousel.appendChild(first);
        busy = false;
        carousel.removeEventListener('transitionend', done);
      };
      carousel.addEventListener('transitionend', done);
      // Rede de seguranca: transicao de duracao zero nao emite transitionend, e
      // sem isto o `busy` ficaria preso e o carrossel pararia de vez. Acontece
      // com prefers-reduced-motion e com o CSS que o diff visual injeta.
      setTimeout(done, 800);
    }, interval);
  });
}

/* Grades .grid-layout ---------------------------------------------------- */
// Substitui o Isotope, que o tema usava nas paginas de publicacoes e
// estatisticas. Empacota cada item na coluna mais curta (masonry): com floats
// as alturas desiguais produziriam uma escada, e no tablet a diferenca passa
// de 500px de altura de pagina.
//
// A visibilidade fica no CSS (ver public/css/ajustes.css), nao aqui: o tema
// mantinha os itens em opacity 0 ate inicializar, e se o script falhasse o
// conteudo simplesmente sumia.
function gridLayout() {
  const grids = document.querySelectorAll('.grid-layout[data-item]');
  if (!grids.length) return;

  const layout = (grid) => {
    const seletor = '.' + grid.getAttribute('data-item');
    const items = [...grid.children].filter((el) => el.matches(seletor));
    if (!items.length) return;

    // Largura vem do CSS do tema (.post-5-columns .post-item etc.), que ja e
    // responsivo; aqui so descobrimos quantas colunas isso da.
    items.forEach((item) => {
      item.style.position = '';
      item.style.left = '';
      item.style.top = '';
    });
    const itemWidth = items[0].getBoundingClientRect().width;
    if (!itemWidth) return;
    const cols = Math.max(1, Math.round(grid.clientWidth / itemWidth));

    const alturas = new Array(cols).fill(0);
    grid.style.position = 'relative';

    items.forEach((item) => {
      const menor = alturas.indexOf(Math.min(...alturas));
      item.style.position = 'absolute';
      item.style.left = `${menor * itemWidth}px`;
      item.style.top = `${alturas[menor]}px`;
      alturas[menor] += item.getBoundingClientRect().height;
    });

    grid.style.height = `${Math.max(...alturas)}px`;
  };

  const relayout = () => grids.forEach(layout);

  relayout();
  window.addEventListener('resize', relayout);
  // As imagens mudam a altura dos itens depois de carregarem.
  window.addEventListener('load', relayout);
  grids.forEach((grid) => {
    grid.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', relayout, { once: true });
    });
  });
}

/* Contadores ------------------------------------------------------------- */
// Sobe de data-from ate data-to quando o numero entra na tela.
function counters() {
  const targets = document.querySelectorAll('[data-to]');
  if (!targets.length) return;

  const run = (el) => {
    const from = Number(el.getAttribute('data-from')) || 0;
    const to = Number(el.getAttribute('data-to')) || 0;
    const duration = Number(el.getAttribute('data-speed')) || 500;
    const suffix = el.getAttribute('data-suffix') || '';
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(from + (to - from) * progress) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  targets.forEach((el) => observer.observe(el));
}

/* Abas ------------------------------------------------------------------- */
// Equivale ao data-bs-toggle="tab" do Bootstrap: .active no link e no painel.
function tabs() {
  const ativar = (tab) => {
    const targetId = tab.getAttribute('href');
    const scope = tab.closest('.tabs') || document;
    const pane = scope.querySelector(targetId);
    if (!pane) return false;

    scope.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('active');
      link.setAttribute('aria-selected', 'false');
      // Tabulacao rotativa: so a aba selecionada fica na ordem de tabulacao,
      // as outras se alcancam pelas setas. E o que o padrao ARIA de abas pede.
      link.setAttribute('tabindex', '-1');
    });
    scope.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active', 'show'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.removeAttribute('tabindex');
    pane.classList.add('active', 'show');
    return true;
  };

  document.querySelectorAll('[role="tablist"]').forEach((lista) => {
    const abas = [...lista.querySelectorAll('[data-bs-toggle="tab"]')];
    if (!abas.length) return;

    // Estado inicial da tabulacao rotativa, a partir de quem ja esta ativo.
    const ativa = abas.find((t) => t.classList.contains('active')) || abas[0];
    abas.forEach((t) => t !== ativa && t.setAttribute('tabindex', '-1'));

    lista.addEventListener('keydown', (e) => {
      const atual = abas.indexOf(document.activeElement);
      if (atual === -1) return;

      const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let alvo;
      if (passo) alvo = abas[(atual + passo + abas.length) % abas.length];
      else if (e.key === 'Home') alvo = abas[0];
      else if (e.key === 'End') alvo = abas[abas.length - 1];
      else return;

      e.preventDefault();
      if (ativar(alvo)) alvo.focus();
    });
  });

  document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      ativar(tab);
    });
  });
}

/* Aviso de cookies ------------------------------------------------------- */
function cookieNotice() {
  const notice = document.querySelector('.cookie-notify');
  if (!notice) return;

  const name = notice.getAttribute('data-cookie-name') || 'cookieModalName2020_3';
  // O tema le data-cookie-expire (ausente no markup), caindo no padrao de 365 dias.
  const expireDays = Number(notice.getAttribute('data-cookie-expire')) || 365;
  const delay = Number(notice.getAttribute('data-delay')) || 3000;

  if (document.cookie.split('; ').some((c) => c.startsWith(`${name}=`))) return;

  // Aceitar e recusar registram a escolha; o que muda e o valor gravado. Antes
  // so o "Aceitar" persistia, entao quem recusava via a faixa de novo a cada
  // pagina — a recusa nao era respeitada nem pelo tempo de uma navegacao.
  const decidir = (aceitou) => {
    notice.classList.remove('modal-active');
    const expires = new Date(Date.now() + expireDays * 864e5).toUTCString();
    document.cookie = `${name}=${aceitou ? 1 : 0}; expires=${expires}; path=/; SameSite=Lax`;
  };

  notice.querySelectorAll('.modal-confirm').forEach((b) =>
    b.addEventListener('click', () => decidir(true))
  );
  notice.querySelectorAll('.modal-close').forEach((b) =>
    b.addEventListener('click', () => decidir(false))
  );

  setTimeout(() => notice.classList.add('modal-active'), delay);
}

/* Voltar ao topo --------------------------------------------------------- */
// O tema mexe direto no style porque #scrollTop nasce com opacity 0 e z-index -1.
function scrollTop() {
  const button = document.querySelector('#scrollTop');
  if (!button) return;

  const threshold = Number(document.body.getAttribute('data-offset')) || 400;

  const update = () => {
    const visible = window.scrollY > threshold;
    button.style.bottom = visible ? '26px' : '0px';
    button.style.opacity = visible ? '1' : '0';
    button.style.zIndex = visible ? '199' : '-1';
  };

  window.addEventListener('scroll', update, { passive: true });
  // preventDefault para o href="#top" nao sujar a URL quando ha JavaScript. Sem
  // JavaScript o href continua valendo e leva ao topo do documento.
  button.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  update();
}

ready(() => {
  mobileMenu();
  languageDropdown();
  navDropdowns();
  hero();
  logoCarousel();
  gridLayout();
  counters();
  tabs();
  cookieNotice();
  scrollTop();
});
