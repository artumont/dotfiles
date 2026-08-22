// ==UserScript==
// @name         DarkMode (Powerscripts)
// @namespace    https://powerscripts.luakit/darkmode
// @version      4.0.0
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

    const enabled = () => getSetting(`dark_mode_${domain}`, false);

    // --- Core dark CSS + DarkReader dynamic theming vars ---
    const css = `
        :root {
            --darkreader-neutral-background: #181a1b !important;
            --darkreader-neutral-text: #e8e6e3 !important;
            --darkreader-selection-background: #264f78 !important;
            --darkreader-selection-text: #e8e6e3 !important;
        }
        html.extension-dark-mode {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
             background-color: white !important;
             color-scheme: dark !important;
        }
        html { transition: filter 0.25s ease; color-scheme: light dark; }
        html.extension-dark-mode-preload { background: #0f0f0f !important; color-scheme: dark !important; }

        /* Re-invert media */
        html.extension-dark-mode img,
        html.extension-dark-mode video,
        html.extension-dark-mode iframe,
        html.extension-dark-mode canvas,
        html.extension-dark-mode svg,
        html.extension-dark-mode embed,
        html.extension-dark-mode object {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }
        /* DarkReader INVERT – common selectors that must stay light */
        html.extension-dark-mode .jfk-bubble.gtx-bubble,
        html.extension-dark-mode .captcheck_answer_label > input + img,
        html.extension-dark-mode span#closed_text > img[src^="https://www.gstatic.com/images/branding/googlelogo"],
        html.extension-dark-mode span[data-href^="https://www.hcaptcha.com/"] > #icon,
        html.extension-dark-mode img.Wirisformula,
        html.extension-dark-mode a[data-testid="headerMediumLogo"]>svg,
        html.extension-dark-mode div[style*="background: rgb(255, 255, 255)"] {
             filter: invert(1) hue-rotate(180deg) !important;
        }

        /* DarkReader CSS fixes */
        html.extension-dark-mode .jfk-bubble.gtx-bubble { background-color: white !important; }
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
        html.extension-dark-mode #-wk-root {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }
        html.extension-dark-mode [data-darkmode-ignore],
        html.extension-dark-mode [data-powerscripts-ignore],
        html.extension-dark-mode [data-wk-ignore] {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }
        /* Powerscripts GUI itself */
        html.extension-dark-mode #ps-darkmode-gui {
             filter: invert(1) hue-rotate(180deg) brightness(0.97) contrast(1.02) !important;
        }
        /* Generic high-z fixed popups – heuristic: any fixed element that is a dialog/tooltip */
        html.extension-dark-mode [role="dialog"],
        html.extension-dark-mode [role="tooltip"],
        html.extension-dark-mode [aria-modal="true"] {
             filter: none !important;
        }

        #ps-darkmode-gui {
            position: fixed; top: 20px; right: 20px; z-index: 2147483646;
            background: #1e1e2e; color: #e8e6e3; border: 1px solid #444; border-radius: 10px;
            padding: 16px; min-width: 260px; font-family: monospace; font-size: 13px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: none;
        }
        #ps-darkmode-gui[data-visible="true"] { display: block; }
        #ps-darkmode-gui h3 { margin: 0 0 12px 0; font-size: 14px; }
        #ps-darkmode-gui label { display: flex; align-items: center; gap: 8px; margin: 8px 0; cursor: pointer; }
        #ps-darkmode-gui button { margin-top: 12px; padding: 6px 12px; cursor: pointer; border-radius: 6px; border: 1px solid #555; background: #2a2a3a; color: #eee; }
        #ps-darkmode-gui button:hover { background: #3a3a4a; }
        #ps-darkmode-gui .ps-gui-hint { font-size: 11px; opacity: 0.6; margin-top: 8px; }
    `;

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
            if (getSetting(`dark_mode_${domain}`, false) && !isAlreadyDark()) {
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
            setSetting(`dark_mode_${domain}`, false);
        }
        updateGUI();
        return true;
    }
    const toggle = () => setEnabled(!document.documentElement.classList.contains('extension-dark-mode'));

    function createGUI(){
        if(document.getElementById('ps-darkmode-gui')) return;
        const g=document.createElement('div'); g.id='ps-darkmode-gui'; g.setAttribute('data-powerscripts-ignore','true');
        g.innerHTML = `<h3>DarkMode Control</h3>
            <label><input type="checkbox" id="ps-darkmode-enabled"> Enabled for this site</label>
            <div style="font-size:11px;opacity:0.7;margin-top:4px;">\${domain}</div>
            <div style="font-size:11px;opacity:0.6;" id="ps-darkmode-status"></div>
            <div class="ps-gui-hint">Toggle via &lt;leader&gt; p d</div>
            <button id="ps-darkmode-gui-close">Close</button>`;
        (document.body||document.documentElement).appendChild(g);
        const chk=g.querySelector('#ps-darkmode-enabled');
        const upd=()=>{ const on=document.documentElement.classList.contains('extension-dark-mode'); chk.checked=on;
            const st=g.querySelector('#ps-darkmode-status'); st.textContent=on?'Status: ON':(isAlreadyDark()?'Status: site already dark':'Status: OFF'); };
        chk.addEventListener('change',()=>{ toggle(); setTimeout(upd,20); });
        g.querySelector('#ps-darkmode-gui-close').addEventListener('click',()=>g.setAttribute('data-visible','false'));
        window.__darkmode_update_gui=upd; upd();
    }
    function updateGUI(){ const u=window.__darkmode_update_gui; if(u) u(); }

    window.__darkmode_toggle = toggle;
    window.__darkmode_enable = ()=>setEnabled(true);
    window.__darkmode_disable = ()=>setEnabled(false);
    window.__darkmode_show_gui = ()=>{
        if(!document.getElementById('ps-darkmode-gui')) createGUI();
        const g=document.getElementById('ps-darkmode-gui');
        if(g) g.setAttribute('data-visible', g.getAttribute('data-visible')==='true'?'false':'true');
    };
    window.__darkmode_toggle_gui = window.__darkmode_show_gui;
    if(typeof GM_registerMenuCommand==='undefined') window.GM_registerMenuCommand=()=>{};
    try{ GM_registerMenuCommand("Toggle Dark Mode", ()=>window.__darkmode_toggle()); }catch(e){}

    const observeNavigation=()=>{
        const nd=location.hostname;
        const en=getSetting(`dark_mode_${nd}`, false);
        if(en && !isAlreadyDark()) document.documentElement.classList.add('extension-dark-mode');
        else document.documentElement.classList.remove('extension-dark-mode');
    };
    addEventListener('popstate', observeNavigation);
    const _push=history.pushState; if(_push) history.pushState=function(){ const r=_push.apply(this,arguments); observeNavigation(); return r; };
    const _rep=history.replaceState; if(_rep) history.replaceState=function(){ const r=_rep.apply(this,arguments); observeNavigation(); return r; };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectCSS);
})();
