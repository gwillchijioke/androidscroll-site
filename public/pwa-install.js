/**
 * AndroidScroll PWA install UI (P17a - port of finance gwill-pwa.js + pwa-install.js).
 * Zero vendor. One file, three jobs:
 *   1. Register the service worker from the stamped URL, base-aware (works on
 *      apex '/' and staging '/androidscroll-site/' from the same tree).
 *   2. Capture beforeinstallprompt, suppress Chrome's mini-infobar, show our own
 *      bottom-sheet card (Not-now = 7-day snooze; install/appinstalled = permanent;
 *      never stacks on an open overlay - yields while the page is scroll-locked).
 *   3. Footer buttons: [data-install-app] native prompt; [data-install-ios] dashed
 *      inline Share-sheet guide (Apple exposes no install API). appinstalled hides all.
 * 0.6.65-5fa38b6 is replaced at prebuild (scripts/stamp-pwa.mjs).
 */
(function () {
  'use strict';

  var BUILD_ID = '0.6.65-5fa38b6';
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
  // secure origin; failures silent - the site works fully without the SW.
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
          '<p class="as-pwa-copy">Add it to your home screen - guides open in one tap and read offline on bad signal.</p>' +
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

  // ── 4. Push bell (P17b - status panel, never a blind toggle) ─────────────
  // Beats the tech/finance bells: action buttons in the SW, dismiss beacons,
  // and per-topic choice (posts / deals / news) instead of all-or-nothing.
  // VAPID public key is stamped at ship (manager); unconfigured → error state.
  var PUSH_BASE = 'https://androidscroll-push.gwill.workers.dev';
  var VAPID_KEY = 'BEBDTPXuCqGrs6lpNqSVdcDGXBd71YZQlvlllBB-uD08sIJ2LjXs-GWIWAP26UltzBaSs2H2dZO14QGHoG6uCvQ';
  var TOPICS = [
    { id: 'posts', label: 'New posts' },
    { id: 'deals', label: 'Deals' },
    { id: 'news', label: 'News' },
  ];
  var PUSH_UNSET = 0, PUSH_SUB = 1, PUSH_BLOCKED = 2, PUSH_ERR = 3, PUSH_NOSUP = 4;
  var pushState = PUSH_UNSET;
  var pushPanel = null;
  var pushBusy = false;
  var pushBusyAction = null; // 'on' while subscribing, 'off' while turning off
  var pushTopics = ['posts'];
  var pushLastError = ''; // browser's own failure words, shown in the error panel
  function pushNoteError(e, step) {
    try {
      pushLastError = (step ? step + ' - ' : '') + (e ? ((e.name ? e.name + ': ' : '') + (e.message || 'no details')) : 'unknown failure');
    } catch (_) { pushLastError = 'unknown failure'; }
    try { console.warn('[push] failure' + (step ? ' @' + step : ''), e); } catch (_) {}
  }
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function pushSupported() {
    return ('Notification' in window) && ('serviceWorker' in navigator) &&
      ('PushManager' in window) && !!window.isSecureContext;
  }
  function pushConfigured() {
    return VAPID_KEY && VAPID_KEY.indexOf('__') !== 0 && VAPID_KEY.length > 40;
  }
  // keys arrive base64url from PushManager; the worker takes padded or not.
  function urlBase64ToBytes(b64) {
    var s = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pushPost(path, payload) {
    return fetch(PUSH_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }).then(function (r) { return r.json(); });
  }
  function pushReg() {
    return navigator.serviceWorker.ready;
  }
  function pushBrowser() {
    var u = ua();
    if (/SamsungBrowser/i.test(u)) return 'samsung';
    if (/OPR\/|Opera/i.test(u)) return 'opera';
    if (/Edg\//i.test(u)) return 'edge';
    if (/Firefox/i.test(u)) return 'firefox';
    if (/Safari/i.test(u) && !/Chrome/i.test(u)) return 'safari';
    return 'chrome';
  }
  function pushUnblockSteps() {
    switch (pushBrowser()) {
      case 'firefox': return 'Tap the padlock left of the address bar → Connection Secure → More Information → Permissions → Notifications → Allow, then Check again.';
      case 'samsung': return 'Tap ⋮ → Settings → Sites and downloads → Notifications → make sure AndroidScroll is allowed, then Check again.';
      case 'edge': return 'Tap the padlock → Permissions → Notifications → Allow, then Check again.';
      case 'opera': return 'Tap the padlock → Site settings → Notifications → Allow, then Check again.';
      case 'safari': return 'On iPhone: install the app first (Share → Add to Home Screen), then allow in Settings → Notifications. On Mac: Safari → Settings → Websites → Notifications → Allow.';
      default: return 'Tap the tune/padlock icon left of the address bar → Permissions → Notifications → Allow, then Check again.';
    }
  }

  function closePushPanel(returnFocus) {
    if (!pushPanel) return;
    var opener = pushPanel.getAttribute('data-opener');
    if (pushPanel.parentNode) pushPanel.parentNode.removeChild(pushPanel);
    pushPanel = null;
    if (returnFocus !== false && opener === '1') {
      var bell = document.querySelector('[data-push-toggle]');
      if (bell && bell.focus) { try { bell.focus(); } catch (e) {} }
    }
    document.removeEventListener('keydown', pushEsc, true);
  }
  function pushEsc(e) {
    if (e.key === 'Escape') closePushPanel(true);
  }
  function renderPushPanel() {
    closePushPanel(false);
    var bell = document.querySelector('[data-push-toggle]');
    var panel = document.createElement('div');
    panel.className = 'as-push';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notification settings');
    panel.setAttribute('data-opener', '1');
    var inner = '';
    if (pushState === PUSH_SUB) {
      inner = '<p class="as-push-kicker mono">NOTIFICATIONS</p>' +
        '<p class="as-push-title">You\'re subscribed</p>' +
        '<p class="as-push-copy">Fresh guides ring your phone the moment they publish.</p>' +
        pushTopicsHtml() +
        '<div class="as-push-acts"><button type="button" class="as-push-off" data-as-push="off">Turn off</button></div>';
    } else if (pushState === PUSH_BLOCKED) {
      inner = '<p class="as-push-kicker mono">NOTIFICATIONS</p>' +
        '<p class="as-push-title">Alerts are blocked</p>' +
        '<p class="as-push-copy">' + pushUnblockSteps() + '</p>' +
        '<div class="as-push-acts"><button type="button" class="as-push-on" data-as-push="check">Check again</button></div>';
    } else if (pushState === PUSH_NOSUP) {
      inner = '<p class="as-push-kicker mono">NOTIFICATIONS</p>' +
        '<p class="as-push-title">This browser can\'t ring</p>' +
        '<p class="as-push-copy">Alerts need Chrome, Edge, Firefox, Opera, Samsung Internet, or Safari 16+ (iPhone: installed app, iOS 16.4+).</p>';
    } else if (pushState === PUSH_ERR) {
      inner = '<p class="as-push-kicker mono">NOTIFICATIONS</p>' +
        '<p class="as-push-title">Something snagged</p>' +
        '<p class="as-push-copy">The bell rope slipped. Try again - nothing changed on your side.</p>' +
        (pushLastError ? '<p class="as-push-err mono">Your browser says: ' + escHtml(pushLastError) + '</p>' : '') +
        '<div class="as-push-acts"><button type="button" class="as-push-on" data-as-push="on">Try again</button></div>';
    } else {
      inner = '<p class="as-push-kicker mono">NOTIFICATIONS</p>' +
        '<p class="as-push-title">Never miss a guide</p>' +
        '<p class="as-push-copy">One tap and breaking battery, display and deal news rings your phone.</p>' +
        pushTopicsHtml() +
        '<div class="as-push-acts"><button type="button" class="as-push-on" data-as-push="on">Enable alerts</button></div>';
    }
    panel.innerHTML = '<div class="as-push-card"><button type="button" class="as-push-x" data-as-push="x" aria-label="Close">×</button>' + inner + '</div>';
    if (pushBusy) {
      // v0.6.47: the working state - buttons rest, a spinner speaks.
      var busyLabel = pushBusyAction === 'off' ? 'Turning off…' : 'Ringing…';
      var acts = panel.querySelector('.as-push-acts');
      if (acts) acts.innerHTML = '<button type="button" class="as-push-on" disabled aria-busy="true"><span class="as-push-spin" aria-hidden="true"></span>' + busyLabel + '</button>';
      panel.querySelector('.as-push-card').setAttribute('aria-busy', 'true');
    }
    // after the footer paragraph, never inside it (a div in a <p> is invalid)
    var anchor = bell && bell.closest('.foot-install');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else document.body.appendChild(panel);
    pushPanel = panel;
    document.addEventListener('keydown', pushEsc, true);
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t === panel) { closePushPanel(true); return; }
      var btn = t.closest ? t.closest('[data-as-push]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-as-push');
      if (act === 'x') closePushPanel(true);
      else if (act === 'on') pushEnable();
      else if (act === 'check') pushRefresh();
      else if (act === 'off') pushDisable();
    });
    var boxes = panel.querySelectorAll('[data-topic]');
    Array.prototype.forEach.call(boxes, function (box) {
      box.addEventListener('change', pushRetopics);
    });
    var first = panel.querySelector('.as-push-acts button');
    if (first && first.focus) { try { first.focus(); } catch (e) {} }
  }
  function pushTopicsHtml() {
    var h = '<fieldset class="as-push-topics"><legend>Ring me for</legend>';
    TOPICS.forEach(function (t) {
      var on = pushTopics.indexOf(t.id) !== -1 ? ' checked' : '';
      h += '<label><input type="checkbox" data-topic="' + t.id + '"' + on + '> ' + t.label + '</label>';
    });
    return h + '</fieldset>';
  }
  function pushReadTopics() {
    if (!pushPanel) return pushTopics;
    var out = [];
    var boxes = pushPanel.querySelectorAll('[data-topic]:checked');
    Array.prototype.forEach.call(boxes, function (b) { out.push(b.getAttribute('data-topic')); });
    return out.length ? out : ['posts'];
  }
  function pushRefresh() {
    if (!pushSupported()) { pushState = PUSH_NOSUP; renderPushPanel(); return; }
    if (!pushConfigured()) { pushState = PUSH_ERR; renderPushPanel(); return; }
    pushReg().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (sub) {
        pushState = PUSH_SUB;
        // self-heal: permission granted but server lost us → re-POST silently
        pushPost('/subscribe', subJson(sub, pushTopics)).catch(function () {});
      } else if (window.Notification && Notification.permission === 'denied') {
        pushState = PUSH_BLOCKED;
      } else {
        pushState = PUSH_UNSET;
      }
      renderPushPanel();
    }).catch(function (e) {
      pushNoteError(e);
      pushState = PUSH_ERR;
      renderPushPanel();
    });
  }
  function subJson(sub, topics) {
    var raw = sub.toJSON();
    return {
      endpoint: sub.endpoint,
      keys: { p256dh: (raw.keys.p256dh || '').replace(/=+$/, ''), auth: (raw.keys.auth || '').replace(/=+$/, '') },
      topics: topics && topics.length ? topics : ['posts'],
    };
  }
  function pushEnable() {
    if (pushBusy) return;
    pushBusy = true;
    pushBusyAction = 'on';
    renderPushPanel();
    pushTopics = pushReadTopics();
    var chain = Promise.resolve();
    if (window.Notification && Notification.permission === 'default') {
      chain = chain.then(function () { return Notification.requestPermission(); });
    }
    chain.then(function () {
      if (Notification.permission === 'denied') { pushState = PUSH_BLOCKED; renderPushPanel(); return; }
      // v0.6.45: reach the bell server FIRST - a dead route (VPN/ad-blocker/carrier)
      // then names itself instead of masquerading as a subscribe failure.
      return fetch(PUSH_BASE + '/health', { method: 'GET' }).then(function (r) {
        if (!r.ok) throw new Error('bell server answered ' + r.status);
        return pushReg();
      }, function (e) {
        throw new Error('bell server unreachable - connection, VPN, or ad-blocker may be stopping your phone from reaching it (' + (e && e.message ? e.message : 'no details') + ')');
      }).then(function (reg) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(VAPID_KEY) });
      }, function (e) {
        if (e && e.message && e.message.indexOf('bell server') === 0) throw e;
        pushNoteError(e, 'asking Google for a bell (subscribe)');
        pushState = PUSH_ERR;
        pushBusy = false; pushBusyAction = null;
        renderPushPanel();
        return null;
      }).then(function (sub) {
        if (!sub) return null; // subscribe leg already reported
        return pushPost('/subscribe', subJson(sub, pushTopics)).then(function () { return true; }, function (e) {
          pushNoteError(e, 'telling the bell server (save)');
          pushState = PUSH_ERR;
          pushBusy = false; pushBusyAction = null;
          renderPushPanel();
          return null;
        });
      }).then(function (ok) {
        if (ok) { pushState = PUSH_SUB; pushBusy = false; pushBusyAction = null; renderPushPanel(); }
      });
    }).catch(function (e) {
      pushNoteError(e);
      pushState = (e && e.name === 'NotAllowedError') ? PUSH_BLOCKED : PUSH_ERR;
      pushBusy = false; pushBusyAction = null;
      renderPushPanel();
    }).then(function () { pushBusy = false; pushBusyAction = null; });
  }
  function pushDisable() {
    if (pushBusy) return;
    pushBusy = true;
    pushBusyAction = 'off';
    renderPushPanel();
    pushReg().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      var endpoint = sub ? sub.endpoint : '';
      var done = sub ? sub.unsubscribe() : Promise.resolve(true);
      return done.then(function () {
        if (endpoint) return pushPost('/unsubscribe', { endpoint }).catch(function () {});
      });
    }).then(function () {
      pushState = PUSH_UNSET;
      pushBusy = false; pushBusyAction = null;
      renderPushPanel();
    }).catch(function (e) {
      pushNoteError(e);
      pushState = PUSH_ERR;
      pushBusy = false; pushBusyAction = null;
      renderPushPanel();
    }).then(function () { pushBusy = false; pushBusyAction = null; });
  }
  function pushRetopics() {
    pushTopics = pushReadTopics();
    if (pushState !== PUSH_SUB || pushBusy) return;
    pushReg().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (sub) return pushPost('/subscribe', subJson(sub, pushTopics));
    }).catch(function (e) {
      try { console.warn('[push] topics update failed', e); } catch (_) {}
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var bells = document.querySelectorAll('[data-push-toggle]');
    if (!bells.length) return;
    Array.prototype.forEach.call(bells, function (bell) {
      bell.hidden = false; // bell stays even when unsupported - panel explains why
      bell.addEventListener('click', function () {
        if (pushPanel) { closePushPanel(true); return; }
        if (!pushSupported()) { pushState = PUSH_NOSUP; renderPushPanel(); return; }
        if (!pushConfigured()) { pushState = PUSH_ERR; renderPushPanel(); return; }
        if (pushState === PUSH_UNSET || pushState === PUSH_ERR) { pushRefresh(); return; }
        renderPushPanel();
      });
    });
    // prove real state quietly - no panel, bell just reflects next tap
    if (pushSupported() && pushConfigured()) {
      pushReg().then(function (reg) {
        return reg.pushManager.getSubscription();
      }).then(function (sub) {
        if (sub) {
          pushState = PUSH_SUB;
          pushPost('/subscribe', subJson(sub, pushTopics)).catch(function () {});
        } else if (window.Notification && Notification.permission === 'denied') {
          pushState = PUSH_BLOCKED;
        }
      }).catch(function () {});
    }
  });
})();
