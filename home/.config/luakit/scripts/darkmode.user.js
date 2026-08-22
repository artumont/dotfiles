// ==UserScript==
// @name         DarkMode (Powerscripts)
// @namespace    https://powerscripts.luakit/darkmode
// @version      2.0.0
// @description  Smart dark mode - opt-in per site, excludes which-key popups
// @author       adapted from rkshrksh/dark-mode-userscript
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    const domain = window.location.hostname;

    function getSetting(key, def) {
        try {
            if (typeof GM_getValue !== 'undefined') return GM_getValue(key, def);
            const v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : def;
        } catch(e) { return def; }
    }
    function setSetting(key, val) {
        try {
            if (typeof GM_setValue !== 'undefined') GM_setValue(key, val);
            else localStorage.setItem(key, JSON.stringify(val));
        } catch(e) {}
    }

    // --- double-dark detection ---
    function isAlreadyDark() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                // site prefers dark, check if it actually uses dark bg
                const bg = getComputedStyle(document.documentElement).backgroundColor;
                const m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (m) {
                    const lum = (0.299*m[1] + 0.587*m[2] + 0.114*m[3]) / 255;
                    if (lum < 0.45) return true;
                }
            }
            // check common dark class signals
            if (document.documentElement.classList.contains('dark') ||
                document.documentElement.getAttribute('data-theme') === 'dark' ||
                document.body.classList.contains('dark')) return true;
            // check computed bg luminance
            const bg2 = getComputedStyle(document.body || document.documentElement).backgroundColor;
            const mm = bg2 && bg2.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (mm) {
                const lum2 = (0.299*mm[1] + 0.587*mm[2] + 0.114*mm[3]) / 255;
                if (lum2 < 0.4) return true;
            }
        } catch(e) {}
        return false;
    }

    const POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    let currentPosition = getSetting(`dark_mode_position_${domain}`, 'bottom-right');
    const isEnabledForDomain = getSetting(`dark_mode_${domain}`, false);

    const css = `
        html.extension-dark-mode {
             filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) !important;
             background-color: white !important;
             color-scheme: dark !important;
        }
        html {
            transition: filter 0.3s ease, background-color 0.3s ease;
        }
        html.extension-dark-mode img,
        html.extension-dark-mode video,
        html.extension-dark-mode iframe,
        html.extension-dark-mode canvas,
        html.extension-dark-mode svg {
             filter: invert(1) hue-rotate(180deg) !important;
        }
        /* exclusions: which-key popup lives in Shadow DOM host #-wk-root (child of html) */
        html.extension-dark-mode #-wk-root {
             filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) !important;
        }
        /* darkmode toggle itself - keep as designed (double invert cancels html invert) */
        html.extension-dark-mode #dark-mode-toggle-btn {
             filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) !important;
        }
        /* generic ignore attribute for any non-page popups */
        html.extension-dark-mode [data-darkmode-ignore],
        html.extension-dark-mode [data-powerscripts-ignore] {
             filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) !important;
        }
        #dark-mode-toggle-btn {
            position: fixed;
            --toggle-bottom: 20px;
            --toggle-right: 20px;
            bottom: var(--toggle-bottom);
            right: var(--toggle-right);
            z-index: 2147483647;
            background: #333;
            color: white;
            border: 2px solid #fff;
            outline: 2px solid #333;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.3);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            user-select: none;
            opacity: 0.8;
        }
        #dark-mode-toggle-btn.position-bottom-left { --toggle-right: auto; --toggle-left: 20px; left: var(--toggle-left); }
        #dark-mode-toggle-btn.position-top-right { --toggle-bottom: auto; --toggle-top: 20px; top: var(--toggle-top); }
        #dark-mode-toggle-btn.position-top-left { --toggle-bottom: auto; --toggle-top: 20px; --toggle-right: auto; --toggle-left: 20px; top: var(--toggle-top); left: var(--toggle-left); }
        #dark-mode-toggle-btn:hover { transform: scale(1.1); background: #555; opacity: 1; }
        #dark-mode-toggle-btn.active { background: #e2e8f0; color: #1a202c; border-color: #1a202c; outline-color: #e2e8f0; }
        /* GUI panel */
        #ps-darkmode-gui {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483646;
            background: #1e1e2e;
            color: #e8e6e3;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 16px;
            min-width: 240px;
            font-family: monospace;
            font-size: 13px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            display: none;
        }
        #ps-darkmode-gui[data-visible="true"] { display: block; }
        #ps-darkmode-gui h3 { margin: 0 0 12px 0; font-size: 14px; }
        #ps-darkmode-gui label { display: flex; align-items: center; gap: 8px; margin: 8px 0; cursor: pointer; }
        #ps-darkmode-gui button { margin-top: 12px; padding: 6px 12px; cursor: pointer; }
        html.extension-dark-mode #ps-darkmode-gui {
            filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) !important;
        }
    `;

    function injectStylesAndUI() {
        if (!document.documentElement) return;
        if (!document.getElementById('dark-mode-core-css')) {
            const style = document.createElement('style');
            style.id = 'dark-mode-core-css';
            style.textContent = css;
            document.documentElement.appendChild(style);
        }
        if (isEnabledForDomain) {
            if (isAlreadyDark()) {
                if (typeof PS !== 'undefined' && PS.log) PS.log('darkmode: site already dark, skipping auto-enable for ' + domain);
                else console.log('darkmode: site already dark, skipping');
            } else {
                document.documentElement.classList.add('extension-dark-mode');
            }
        }
    }
    injectStylesAndUI();

    function createToggleButton() {
        if (window !== window.top) return;
        if (!document.body || document.getElementById('dark-mode-toggle-btn')) return;
        const currentlyEnabled = getSetting(`dark_mode_${domain}`, false);
        const btn = document.createElement('button');
        btn.id = 'dark-mode-toggle-btn';
        btn.innerHTML = currentlyEnabled ? '☀️' : '🌙';
        btn.title = "Toggle Dark Mode (right-click: move)";
        if (currentlyEnabled) btn.classList.add('active');
        if (currentPosition && currentPosition !== 'bottom-right') btn.classList.add(`position-${currentPosition}`);
        btn.addEventListener('click', () => {
            const on = document.documentElement.classList.contains('extension-dark-mode');
            if (on) {
                document.documentElement.classList.remove('extension-dark-mode');
                setSetting(`dark_mode_${domain}`, false);
                btn.innerHTML = '🌙'; btn.classList.remove('active');
            } else {
                if (isAlreadyDark()) {
                    if (typeof PS !== 'undefined' && PS.log) PS.log('darkmode: not enabling - site already dark');
                    return;
                }
                document.documentElement.classList.add('extension-dark-mode');
                setSetting(`dark_mode_${domain}`, true);
                btn.innerHTML = '☀️'; btn.classList.add('active');
            }
        });
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const idx = POSITIONS.indexOf(currentPosition);
            const next = POSITIONS[(idx + 1) % POSITIONS.length];
            currentPosition = next;
            POSITIONS.forEach(p => btn.classList.remove(`position-${p}`));
            if (next !== 'bottom-right') btn.classList.add(`position-${next}`);
            setSetting(`dark_mode_position_${domain}`, next);
            btn.title = `Position: ${next.replace('-',' ')}`;
            setTimeout(() => btn.title = "Toggle Dark Mode (right-click: move)", 1500);
        });
        document.body.appendChild(btn);
    }

    // GUI panel
    function createGUI() {
        if (document.getElementById('ps-darkmode-gui')) return;
        const gui = document.createElement('div');
        gui.id = 'ps-darkmode-gui';
        gui.setAttribute('data-powerscripts-ignore', 'true');
        gui.innerHTML = `
            <h3>DarkMode Control</h3>
            <label><input type="checkbox" id="ps-darkmode-enabled"> Enabled for this site</label>
            <div style="margin-top:8px; font-size:11px; opacity:0.7;">Domain: ${domain}</div>
            <div style="margin-top:4px; font-size:11px; opacity:0.7;" id="ps-darkmode-status"></div>
            <button id="ps-darkmode-gui-close">Close</button>
        `;
        document.body.appendChild(gui);
        const chk = gui.querySelector('#ps-darkmode-enabled');
        const status = gui.querySelector('#ps-darkmode-status');
        const update = () => {
            const on = document.documentElement.classList.contains('extension-dark-mode');
            chk.checked = on;
            status.textContent = on ? 'Status: ON' : (isAlreadyDark() ? 'Status: site already dark' : 'Status: OFF');
        };
        chk.addEventListener('change', () => {
            document.getElementById('dark-mode-toggle-btn')?.click();
            setTimeout(update, 50);
        });
        gui.querySelector('#ps-darkmode-gui-close').addEventListener('click', () => {
            gui.setAttribute('data-visible', 'false');
        });
        update();
    }

    window.__darkmode_toggle = () => document.getElementById('dark-mode-toggle-btn')?.click();
    window.__darkmode_enable = () => {
        if (!document.documentElement.classList.contains('extension-dark-mode')) {
            document.getElementById('dark-mode-toggle-btn')?.click();
        }
    };
    window.__darkmode_disable = () => {
        if (document.documentElement.classList.contains('extension-dark-mode')) {
            document.getElementById('dark-mode-toggle-btn')?.click();
        }
    };
    window.__darkmode_show_gui = () => {
        createGUI();
        const g = document.getElementById('ps-darkmode-gui');
        if (g) g.setAttribute('data-visible', g.getAttribute('data-visible') === 'true' ? 'false' : 'true');
    };
    window.__darkmode_toggle_gui = window.__darkmode_show_gui;

    // Polyfill GM_registerMenuCommand as which-key fallback (no-op)
    if (typeof GM_registerMenuCommand === 'undefined') window.GM_registerMenuCommand = () => {};

    if (typeof GM_registerMenuCommand !== "undefined") {
        try { GM_registerMenuCommand("Toggle Dark Mode", () => document.getElementById('dark-mode-toggle-btn')?.click()); } catch(e) {}
    }

    const observeNavigation = () => {
        const nd = window.location.hostname;
        const en = getSetting(`dark_mode_${nd}`, false);
        const pos = getSetting(`dark_mode_position_${nd}`, 'bottom-right');
        let btn = document.getElementById('dark-mode-toggle-btn');
        if (en && !isAlreadyDark()) document.documentElement.classList.add('extension-dark-mode');
        else document.documentElement.classList.remove('extension-dark-mode');
        if (!btn) { createToggleButton(); btn = document.getElementById('dark-mode-toggle-btn'); }
        if (btn) {
            if (en) { btn.innerHTML = '☀️'; btn.classList.add('active'); }
            else { btn.innerHTML = '🌙'; btn.classList.remove('active'); }
            if (pos) {
                POSITIONS.forEach(p => btn.classList.remove(`position-${p}`));
                if (pos !== 'bottom-right') btn.classList.add(`position-${pos}`);
                currentPosition = pos;
            }
        }
    };
    window.addEventListener('popstate', observeNavigation);
    const _push = history.pushState;
    if (_push) history.pushState = function(){ const r=_push.apply(this, arguments); observeNavigation(); return r; };
    const _rep = history.replaceState;
    if (_rep) history.replaceState = function(){ const r=_rep.apply(this, arguments); observeNavigation(); return r; };

    function initUI() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createToggleButton);
        else createToggleButton();
        let a=0; const iv=setInterval(()=>{ a++; if(document.getElementById('dark-mode-toggle-btn')){ clearInterval(iv); setupObserver(); return; } if(a>=20){ clearInterval(iv); setupObserver(); return; } createToggleButton(); },500);
    }
    initUI();
    function setupObserver(){
        if (!document.body) return;
        const o=new MutationObserver((muts)=>{
            for(const m of muts){ if(m.type==='childList'){ const b=document.getElementById('dark-mode-toggle-btn'); if(!b && window===window.top){ createToggleButton(); break; } } }
        });
        o.observe(document.body,{childList:true,subtree:true});
    }
})();
