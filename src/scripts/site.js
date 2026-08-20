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

  // O tema fecha o menu ao redimensionar para o breakpoint de desktop.
  window.addEventListener('resize', () => {
    if (open && window.innerWidth >= 992) setOpen(false);
  });
}

/* Seletor de idioma ------------------------------------------------------ */
// No desktop o CSS abre por :hover; o clique existe para toque.
function languageDropdown() {
  document.querySelectorAll('.p-dropdown').forEach((drop) => {
    const link = drop.querySelector(':scope > a');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      drop.classList.toggle('dropdown-active');
    });
  });

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.p-dropdown.dropdown-active').forEach((drop) => {
      if (!drop.contains(e.target)) drop.classList.remove('dropdown-active');
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
    const items = [...carousel.children];
    if (items.length < 2) return;

    const perView = Number(carousel.getAttribute('data-items')) || 6;
    const interval = Number(carousel.getAttribute('data-autoplay')) || 1000;

    carousel.style.display = 'flex';
    carousel.style.overflow = 'hidden';
    items.forEach((item) => {
      item.style.flex = `0 0 ${100 / perView}%`;
      item.style.maxWidth = `${100 / perView}%`;
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let busy = false;
    setInterval(() => {
      if (busy || document.hidden) return;
      busy = true;
      const first = carousel.firstElementChild;
      carousel.style.transition = 'transform 600ms ease';
      carousel.style.transform = `translateX(-${100 / perView}%)`;

      const done = () => {
        carousel.style.transition = 'none';
        carousel.style.transform = 'translateX(0)';
        carousel.appendChild(first);
        busy = false;
        carousel.removeEventListener('transitionend', done);
      };
      carousel.addEventListener('transitionend', done);
    }, interval);
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
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('href');
      const scope = tab.closest('.tabs') || document;
      const pane = scope.querySelector(targetId);
      if (!pane) return;

      scope.querySelectorAll('.nav-link').forEach((link) => {
        link.classList.remove('active');
        link.setAttribute('aria-selected', 'false');
      });
      scope.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active', 'show'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      pane.classList.add('active', 'show');
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

  const hide = (persist) => {
    notice.classList.remove('modal-active');
    if (!persist) return;
    const expires = new Date(Date.now() + expireDays * 864e5).toUTCString();
    document.cookie = `${name}=1; expires=${expires}; path=/; SameSite=Lax`;
  };

  notice.querySelectorAll('.modal-confirm').forEach((b) =>
    b.addEventListener('click', () => hide(true))
  );
  notice.querySelectorAll('.modal-close').forEach((b) =>
    b.addEventListener('click', () => hide(false))
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
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  update();
}

ready(() => {
  mobileMenu();
  languageDropdown();
  hero();
  logoCarousel();
  counters();
  tabs();
  cookieNotice();
  scrollTop();
});
