// ==UserScript==
// @name         DarkMode (Powerscripts)
// @namespace    https://powerscripts.luakit/darkmode
// @version      4.1.1
// @description  DarkReader-style dynamic dark mode - no flash, excludes popups
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const domain = location.hostname;

    function getSetting(k, d) {
        try { if (typeof GM_getValue !== 'undefined') return GM_getValue(k, d);
              const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch(e){ return d; }
    }
    function setSetting(k, v) {
        try { if (typeof GM_setValue !== 'undefined') GM_setValue(k, v);
              else localStorage.setItem(k, JSON.stringify(v)); } catch(e){}
    }

    function isAlreadyDark() {
        try {
            if (matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) {
                const bg = getComputedStyle(document.documentElement).backgroundColor;
                const m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (m) { const lum=(0.299*m[1]+0.587*m[2]+0.114*m[3])/255; if(lum<0.45) return true; }
            }
            if (document.documentElement.classList.contains('dark') ||
                document.documentElement.getAttribute('data-theme')==='dark' ||
                document.documentElement.getAttribute('data-darkreader-scheme')==='dark' ||
                (document.body && document.body.classList.contains('dark'))) return true;
            const bg2 = getComputedStyle(document.body||document.documentElement).backgroundColor;
            const mm = bg2 && bg2.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (mm) { const lum2=(0.299*mm[1]+0.587*mm[2]+0.114*mm[3])/255; if(lum2<0.4) return true; }
        } catch(e){}
        return false;
    }

    const enabled = () => getSetting(`dark_mode_${domain}`, true);

    // --- Core dark CSS + DarkReader dynamic theming vars ---
    const css = `
        :root {
            --darkreader-neutral-background: #181a1b !important;
            --darkreader-neutral-text: #e8e6e3 !important;
            --darkreader-selection-background: #264f78 !important;
            --darkreader-selection-text: #e8e6e3 !important;
        }
        html.extension-dark-mode { background-color: white !important; color-scheme: dark !important; }
        html.extension-dark-mode body {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
             background-color: white !important;
        }
        html { transition: filter 0.25s ease; color-scheme: light dark; }
        html.extension-dark-mode-preload { background: #0f0f0f !important; color-scheme: dark !important; }
        html.extension-dark-mode-preload body { background: #0f0f0f !important; }

        /* Re-invert media */
        html.extension-dark-mode body img,
        html.extension-dark-mode body video,
        html.extension-dark-mode body iframe,
        html.extension-dark-mode body canvas,
        html.extension-dark-mode body svg,
        html.extension-dark-mode body embed,
        html.extension-dark-mode body object {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }
        /* DarkReader INVERT – common selectors that must stay light */
        html.extension-dark-mode body .jfk-bubble.gtx-bubble,
        html.extension-dark-mode body .captcheck_answer_label > input + img,
        html.extension-dark-mode body span#closed_text > img[src^="https://www.gstatic.com/images/branding/googlelogo"],
        html.extension-dark-mode body span[data-href^="https://www.hcaptcha.com/"] > #icon,
        html.extension-dark-mode body img.Wirisformula,
        html.extension-dark-mode body a[data-testid="headerMediumLogo"]>svg,
        html.extension-dark-mode body div[style*="background: rgb(255, 255, 255)"] {
             filter: invert(1) hue-rotate(180deg) !important;
        }

        /* DarkReader CSS fixes */
        html.extension-dark-mode body .jfk-bubble.gtx-bubble { background-color: white !important; }
        html.extension-dark-mode .vimvixen-hint {
            background-color: #ffd76e !important; border-color: #c59d00 !important; color: #302505 !important;
        }
        html.extension-dark-mode #vimvixen-console-frame { color-scheme: light !important; }
        html.extension-dark-mode ::placeholder { opacity: 0.5 !important; }

        /* Neutral vars usage */
        html.extension-dark-mode *[style*="background:#fff"],
        html.extension-dark-mode *[style*="background: #fff"] {
            background: var(--darkreader-neutral-background) !important;
        }
        html.extension-dark-mode *[style*="color: rgb(0, 0, 1)"] { color: var(--darkreader-neutral-text) !important; }

        /* Exclusions: which-key Shadow host and any popup with ignore attr */
        html.extension-dark-mode #-wk-root { filter: none !important; }
        html.extension-dark-mode [data-darkmode-ignore],
        html.extension-dark-mode [data-powerscripts-ignore],
        html.extension-dark-mode [data-wk-ignore] {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }    `;

    // Immediate dark background to prevent white flash - runs before DOM ready
    try { document.documentElement.style.backgroundColor = '#0f0f0f'; document.documentElement.style.colorScheme = 'dark'; } catch(e){}
    function injectCSS() {
        if (!document.documentElement) return;
        if (!document.getElementById('dark-mode-core-css')) {
            const s = document.createElement('style');
            s.id = 'dark-mode-core-css';
            s.textContent = css;
            (document.head || document.documentElement).insertBefore(s, (document.head || document.documentElement).firstChild);
        }
        // force dark color-scheme early to prevent flash
        try {
            let meta = document.querySelector('meta[name="color-scheme"]');
            if (!meta) { meta=document.createElement('meta'); meta.name='color-scheme'; document.head && document.head.appendChild(meta); }
            meta.content='dark light';
            document.documentElement.style.colorScheme='dark';
            // preload bg immediately if enabled
            if (getSetting(`dark_mode_${domain}`, true)) {
                document.documentElement.classList.add('extension-dark-mode');
                document.documentElement.classList.add('extension-dark-mode-preload');
                setTimeout(()=>document.documentElement.classList.remove('extension-dark-mode-preload'), 80);
            }
        } catch(e){}
    }
    injectCSS();

    function setEnabled(on) {
        if (on) {
            if (isAlreadyDark()) { if(typeof PS!=='undefined'&&PS.log) PS.log('darkmode: site already dark, skip'); return false; }
            document.documentElement.classList.add('extension-dark-mode');
            setSetting(`dark_mode_${domain}`, true);
        } else {
            document.documentElement.classList.remove('extension-dark-mode');
            setSetting(`dark_mode_${domain}`, true);
        }
        updateGUI();
        return true;
    }
    const toggle = () => setEnabled(!document.documentElement.classList.contains('extension-dark-mode'));

    function updateGUI(){}

    window.__darkmode_toggle = toggle;
    window.__darkmode_enable = ()=>setEnabled(true);
    window.__darkmode_disable = ()=>setEnabled(false);
    window.__darkmode_show_gui = ()=>{};
    window.__darkmode_toggle_gui = ()=>{};
    if(typeof GM_registerMenuCommand==='undefined') window.GM_registerMenuCommand=()=>{};
    try{ GM_registerMenuCommand("Toggle Dark Mode", ()=>window.__darkmode_toggle()); }catch(e){}

    const observeNavigation=()=>{
        const nd=location.hostname;
        const en=getSetting(`dark_mode_${nd}`, true);
        if(en) document.documentElement.classList.add('extension-dark-mode');
        else document.documentElement.classList.remove('extension-dark-mode');
    };
    addEventListener('popstate', observeNavigation);
    const _push=history.pushState; if(_push) history.pushState=function(){ const r=_push.apply(this,arguments); observeNavigation(); return r; };
    const _rep=history.replaceState; if(_rep) history.replaceState=function(){ const r=_rep.apply(this,arguments); observeNavigation(); return r; };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectCSS);
})();
