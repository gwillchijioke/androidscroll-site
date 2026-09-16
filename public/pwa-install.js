/**
 * AndroidScroll PWA install UI (P17a — port of finance gwill-pwa.js + pwa-install.js).
 * Zero vendor. One file, three jobs:
 *   1. Register the service worker from the stamped URL, base-aware (works on
 *      apex '/' and staging '/androidscroll-site/' from the same tree).
 *   2. Capture beforeinstallprompt, suppress Chrome's mini-infobar, show our own
 *      bottom-sheet card (Not-now = 7-day snooze; install/appinstalled = permanent;
 *      never stacks on an open overlay — yields while the page is scroll-locked).
 *   3. Footer buttons: [data-install-app] native prompt; [data-install-ios] dashed
 *      inline Share-sheet guide (Apple exposes no install API). appinstalled hides all.
 * 0.6.41-fd743b5 is replaced at prebuild (scripts/stamp-pwa.mjs).
 */
(function () {
  'use strict';

  var BUILD_ID = '0.6.41-fd743b5';
  var KEY = '***';
  var DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function read() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  }
  function write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function ua() { return navigator.userAgent || ''; }
  // iPhone/iPad/iPod classic detection + iPadOS 13+ (safari-on-"Mac"-with-touch).
  function isIOS() {
    return /iP(hone|ad|od)/.test(ua()) ||
      (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return ('standalone' in navigator && navigator.standalone === true) ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  // ── 1. Register the service worker ───────────────────────────────────────
  // Resolve sw.js NEXT TO this script file (it ships in public/ beside sw.js),
  // so the URL follows whatever subpath Pages serves. Registered only on a
  // secure origin; failures silent — the site works fully without the SW.
  if (document.currentScript && document.currentScript.src) {
    var SW_URL = new URL('sw.js?v=' + encodeURIComponent(BUILD_ID), document.currentScript.src).href;
  }
  if ('serviceWorker' in navigator && window.isSecureContext && SW_URL) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SW_URL).catch(function () {});
    });
  }

  // ── 2. On-brand install card (bottom-sheet family) ───────────────────────
  var deferredPrompt = null;

  function buildCard() {
    var wrap = document.createElement('div');
    wrap.className = 'as-pwa';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Install AndroidScroll');
    wrap.innerHTML =
      '<div class="as-pwa-card">' +
        '<span class="as-pwa-mark" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +
        '</span>' +
        '<div class="as-pwa-body">' +
          '<p class="as-pwa-kicker mono">INSTALL</p>' +
          '<p class="as-pwa-title">Take AndroidScroll with you</p>' +
          '<p class="as-pwa-copy">Add it to your home screen — guides open in one tap and read offline on bad signal.</p>' +
        '</div>' +
        '<div class="as-pwa-acts">' +
          '<button type="button" class="as-pwa-install" data-as-pwa="install">Install app</button>' +
          '<button type="button" class="as-pwa-later" data-as-pwa="later">Not now</button>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  // An overlay owns the screen while the page is scroll-locked (browse sheet /
  // search / theme menu all set body.frozen). The card yields, never stacks.
  function overlayOpen() {
    return document.body.classList.contains('frozen');
  }

  function showCard() {
    if (document.querySelector('.as-pwa')) return;
    if (document.body.classList.contains('as-pwa-installed')) return;
    var state = read();
    if (state.installed) return;
    if (state.dismissed && (Date.now() - state.dismissed) < DISMISS_MS) return;
    var card = buildCard();
    document.body.appendChild(card);
    requestAnimationFrame(function () {
      document.body.classList.add('as-pwa-visible');
    });
    var installBtn = card.querySelector('[data-as-pwa="install"]');
    var laterBtn = card.querySelector('[data-as-pwa="later"]');
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        if (!deferredPrompt) { hideCard(); return; }
        deferredPrompt.prompt();
        var p = deferredPrompt.userChoice;
        if (p && typeof p.then === 'function') {
          p.then(function (choice) {
            if (choice && choice.outcome === 'accepted') {
              write({ installed: true });
              document.body.classList.add('as-pwa-installed');
            }
          }).catch(function () {});
        }
        deferredPrompt = null;
        hideCard();
      });
    }
    if (laterBtn) {
      laterBtn.addEventListener('click', function () {
        write({ dismissed: Date.now() });
        hideCard();
      });
    }
  }

  function hideCard() {
    var card = document.querySelector('.as-pwa');
    document.body.classList.remove('as-pwa-visible');
    if (card) {
      setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 260);
    }
  }

  // Capture the prompt; suppress Chrome's default mini-infobar by preventing.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(maybeShow, 2500);
  });

  function maybeShow() {
    if (overlayOpen()) {
      var mo = new MutationObserver(function () {
        if (!overlayOpen()) { mo.disconnect(); showCard(); }
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    showCard();
  }

  window.addEventListener('appinstalled', function () {
    write({ installed: true });
    document.body.classList.add('as-pwa-installed');
    hideCard();
  });

  // ── 3. Footer install buttons ────────────────────────────────────────────
  var APP_BTN = '[data-install-app]';
  var IOS_BTN = '[data-install-ios]';

  function show(el) { if (el) { el.hidden = false; } }
  function hide(el) { if (el) { el.hidden = true; } }

  window.addEventListener('beforeinstallprompt', function () {
    var btn = document.querySelector(APP_BTN);
    if (btn && !isStandalone()) { show(btn); }
  });
  window.addEventListener('appinstalled', function () {
    hide(document.querySelector(APP_BTN));
    hide(document.querySelector(IOS_BTN));
    var note = document.querySelector('.as-install-note');
    if (note) note.remove();
  });

  document.addEventListener('DOMContentLoaded', function () {
    var installBtn = document.querySelector(APP_BTN);
    var iosBtn = document.querySelector(IOS_BTN);

    // iOS: dashed Home-Screen guide toggle (no install API exists on iOS).
    if (isIOS() && !isStandalone() && iosBtn) {
      show(iosBtn);
      iosBtn.setAttribute('aria-expanded', 'false');
      iosBtn.addEventListener('click', function () {
        var wrap = iosBtn.closest('.foot-install');
        if (!wrap) return;
        var note = wrap.querySelector('.as-install-note');
        if (!note) {
          note = document.createElement('p');
          note.className = 'as-install-note';
          note.textContent = iosBtn.dataset.guide ||
            'Tap Share (⎙) in Safari’s top bar → “Add to Home Screen”. Alerts then arrive from the installed app.';
          wrap.appendChild(note);
          iosBtn.setAttribute('aria-expanded', 'true');
        } else {
          note.remove();
          iosBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Android/desktop: wire the native prompt (captured above).
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        if (!deferredPrompt) {
          installBtn.textContent = installBtn.dataset.labelAlt || 'Install not available';
          return;
        }
        deferredPrompt.prompt();
        var p = deferredPrompt.userChoice;
        if (p && typeof p.then === 'function') {
          p.then(function (choice) {
            if (choice && choice.outcome === 'accepted') {
              write({ installed: true });
              document.body.classList.add('as-pwa-installed');
              hide(installBtn);
            }
          }).catch(function () {});
        }
        deferredPrompt = null;
      });
    }
  });
})();
