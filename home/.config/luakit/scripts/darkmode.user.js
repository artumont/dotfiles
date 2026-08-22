// ==UserScript==
// @name         DarkMode (Powerscripts)
// @namespace    https://powerscripts.luakit/darkmode
// @version      3.0.0
// @description  Smart dark mode - opt-in per site, no flash, excludes popups
// @author       adapted from rkshrksh/dark-mode-userscript
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const domain = window.location.hostname;

    function getSetting(k, d) {
        try {
            if (typeof GM_getValue !== 'undefined') return GM_getValue(k, d);
            const v = localStorage.getItem(k);
            return v !== null ? JSON.parse(v) : d;
        } catch(e) { return d; }
    }
    function setSetting(k, v) {
        try {
            if (typeof GM_setValue !== 'undefined') GM_setValue(k, v);
            else localStorage.setItem(k, JSON.stringify(v));
        } catch(e) {}
    }

    function isAlreadyDark() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                const bg = getComputedStyle(document.documentElement).backgroundColor;
                const m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (m) {
                    const lum = (0.299*m[1] + 0.587*m[2] + 0.114*m[3]) / 255;
                    if (lum < 0.45) return true;
                }
            }
            if (document.documentElement.classList.contains('dark') ||
                document.documentElement.getAttribute('data-theme') === 'dark' ||
                (document.body && document.body.classList.contains('dark'))) return true;
            const bg2 = getComputedStyle(document.body || document.documentElement).backgroundColor;
            const mm = bg2 && bg2.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (mm) {
                const lum2 = (0.299*mm[1] + 0.587*mm[2] + 0.114*mm[3]) / 255;
                if (lum2 < 0.4) return true;
            }
        } catch(e) {}
        return false;
    }

    const isEnabledForDomain = getSetting(`dark_mode_${domain}`, false);

    const css = `
        html.extension-dark-mode {
             filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.05) !important;
             background-color: white !important;
             color-scheme: dark !important;
        }
        html {
            transition: filter 0.25s ease, background-color 0.25s ease;
            color-scheme: light dark;
        }
        /* flash prevention: dark bg immediately while loading */
        html.extension-dark-mode-preload {
            background: #121212 !important;
            color-scheme: dark !important;
        }
        html.extension-dark-mode img,
        html.extension-dark-mode video,
        html.extension-dark-mode iframe,
        html.extension-dark-mode canvas,
        html.extension-dark-mode svg,
        html.extension-dark-mode embed,
        html.extension-dark-mode object {
             filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.05) !important;
        }
        /* exclusions: which-key Shadow host and generic popups */
        html.extension-dark-mode #-wk-root {
             filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.05) !important;
        }
        html.extension-dark-mode [data-darkmode-ignore],
        html.extension-dark-mode [data-powerscripts-ignore],
        html.extension-dark-mode [data-wk-ignore] {
             filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.05) !important;
        }
        /* darkmode GUI itself - double invert to appear normal */
        html.extension-dark-mode #ps-darkmode-gui {
             filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.05) !important;
        }
        #ps-darkmode-gui {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483646;
            background: #1e1e2e;
            color: #e8e6e3;
            border: 1px solid #444;
            border-radius: 10px;
            padding: 16px;
            min-width: 260px;
            font-family: monospace;
            font-size: 13px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            display: none;
        }
        #ps-darkmode-gui[data-visible="true"] { display: block; }
        #ps-darkmode-gui h3 { margin: 0 0 12px 0; font-size: 14px; }
        #ps-darkmode-gui label { display: flex; align-items: center; gap: 8px; margin: 8px 0; cursor: pointer; }
        #ps-darkmode-gui button { margin-top: 12px; padding: 6px 12px; cursor: pointer; border-radius: 6px; border: 1px solid #555; background: #2a2a3a; color: #eee; }
        #ps-darkmode-gui button:hover { background: #3a3a4a; }
        #ps-darkmode-gui .ps-gui-hint { font-size: 11px; opacity: 0.6; margin-top: 8px; }
    `;

    function injectStyles() {
        if (!document.documentElement) return;
        if (!document.getElementById('dark-mode-core-css')) {
            const style = document.createElement('style');
            style.id = 'dark-mode-core-css';
            style.textContent = css;
            // inject as early as possible - before any other styles
            const target = document.head || document.documentElement;
            target.insertBefore(style, target.firstChild);
        }
        // force dark color-scheme immediately to prevent flash
        try {
            let meta = document.querySelector('meta[name="color-scheme"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'color-scheme';
                meta.content = 'dark light';
                document.head && document.head.appendChild(meta);
            }
        } catch(e) {}
        if (isEnabledForDomain && !isAlreadyDark()) {
            document.documentElement.classList.add('extension-dark-mode');
            // preload class for instant dark bg before filter applies
            document.documentElement.classList.add('extension-dark-mode-preload');
            // remove preload after filter is active to avoid conflicts
            setTimeout(() => document.documentElement.classList.remove('extension-dark-mode-preload'), 100);
        }
    }

    // inject immediately (document-start)
    injectStyles();

    function setEnabled(on) {
        if (on) {
            if (isAlreadyDark()) {
                if (typeof PS !== 'undefined' && PS.log) PS.log('darkmode: site already dark, skipping');
                return false;
            }
            document.documentElement.classList.add('extension-dark-mode');
            setSetting(`dark_mode_${domain}`, true);
            updateGUI();
            return true;
        } else {
            document.documentElement.classList.remove('extension-dark-mode');
            setSetting(`dark_mode_${domain}`, false);
            updateGUI();
            return true;
        }
    }

    function toggle() {
        const on = document.documentElement.classList.contains('extension-dark-mode');
        return setEnabled(!on);
    }

    // GUI
    function createGUI() {
        if (document.getElementById('ps-darkmode-gui')) return;
        const gui = document.createElement('div');
        gui.id = 'ps-darkmode-gui';
        gui.setAttribute('data-powerscripts-ignore', 'true');
        gui.innerHTML = `
            <h3>DarkMode Control</h3>
            <label><input type="checkbox" id="ps-darkmode-enabled"> Enabled for this site</label>
            <div style="font-size:11px; opacity:0.7; margin-top:4px;">\${domain}</div>
            <div style="font-size:11px; opacity:0.6;" id="ps-darkmode-status"></div>
            <div class="ps-gui-hint">Controlled via <b>&lt;leader&gt; p d</b> which-key menu</div>
            <button id="ps-darkmode-gui-close">Close</button>
        `;
        (document.body || document.documentElement).appendChild(gui);
        const chk = gui.querySelector('#ps-darkmode-enabled');
        const update = () => {
            const on = document.documentElement.classList.contains('extension-dark-mode');
            chk.checked = on;
            const st = gui.querySelector('#ps-darkmode-status');
            st.textContent = on ? 'Status: ON' : (isAlreadyDark() ? 'Status: site already dark' : 'Status: OFF');
        };
        chk.addEventListener('change', () => { toggle(); setTimeout(update, 20); });
        gui.querySelector('#ps-darkmode-gui-close').addEventListener('click', () => gui.setAttribute('data-visible','false'));
        update();
        window.__darkmode_update_gui = update;
    }
    function updateGUI() {
        const upd = window.__darkmode_update_gui;
        if (upd) upd();
        const chk = document.querySelector('#ps-darkmode-gui #ps-darkmode-enabled');
        if (chk) chk.checked = document.documentElement.classList.contains('extension-dark-mode');
    }

    window.__darkmode_toggle = toggle;
    window.__darkmode_enable = () => setEnabled(true);
    window.__darkmode_disable = () => setEnabled(false);
    window.__darkmode_show_gui = () => {
        if (!document.getElementById('ps-darkmode-gui')) createGUI();
        const g = document.getElementById('ps-darkmode-gui');
        if (g) {
            const isVis = g.getAttribute('data-visible') === 'true';
            g.setAttribute('data-visible', isVis ? 'false' : 'true');
            if (!isVis) createGUI();
        }
    };
    window.__darkmode_toggle_gui = window.__darkmode_show_gui;

    // Polyfill GM_registerMenuCommand
    if (typeof GM_registerMenuCommand === 'undefined') window.GM_registerMenuCommand = () => {};
    try { GM_registerMenuCommand("Toggle Dark Mode", () => window.__darkmode_toggle()); } catch(e) {}

    const observeNavigation = () => {
        const nd = window.location.hostname;
        const en = getSetting(`dark_mode_${nd}`, false);
        if (en && !isAlreadyDark()) document.documentElement.classList.add('extension-dark-mode');
        else document.documentElement.classList.remove('extension-dark-mode');
    };
    window.addEventListener('popstate', observeNavigation);
    const _push = history.pushState;
    if (_push) history.pushState = function(){ const r=_push.apply(this, arguments); observeNavigation(); return r; };
    const _rep = history.replaceState;
    if (_rep) history.replaceState = function(){ const r=_rep.apply(this, arguments); observeNavigation(); return r; };

    // ensure GUI parent exists when body appears
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectStyles(); });
    }
    // MutationObserver for SPA body replacement - no toggle recreation needed now
    const setupObserver = () => {
        if (!document.body) return;
        // no floating button to recreate, just keep GUI alive
    };
    if (document.body) setupObserver();
    else document.addEventListener('DOMContentLoaded', setupObserver);
})();
