// ==UserScript==
// @name         DarkMode (Powerscripts)
// @namespace    https://powerscripts.luakit/darkmode
// @version      5.0.1
// @description  True DarkReader dynamic theming - analyzes stylesheets, not filter
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';
    const domain = location.hostname;
    function getSetting(k, d) { try { if (typeof GM_getValue !== 'undefined') return GM_getValue(k, d); const v=localStorage.getItem(k); return v!==null?JSON.parse(v):d; } catch(e){ return d; } }
    function setSetting(k, v) { try { if (typeof GM_setValue !== 'undefined') GM_setValue(k, v); else localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

    // DarkReader config - dynamic theme is best, fallback to filter if needed
    const DR_CONFIG = { brightness: 100, contrast: 90, sepia: 10 };

    // Immediate dark bg to prevent white flash before DarkReader loads
    try {
        document.documentElement.style.backgroundColor = '#181a1b';
        document.documentElement.style.colorScheme = 'dark';
        let m = document.querySelector('meta[name="color-scheme"]');
        if (!m) { m=document.createElement('meta'); m.name='color-scheme'; m.content='dark light'; (document.head||document.documentElement).appendChild(m); }
    } catch(e){}

    function loadDarkReader(cb) {
        if (window.DarkReader) return cb();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/darkreader@4.9.96/darkreader.min.js';
        s.async = false;
        s.onload = cb;
        s.onerror = () => {
            // fallback: try unpkg
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/darkreader@4.9.96/darkreader.js';
            s2.onload = cb;
            (document.head||document.documentElement).appendChild(s2);
        };
        (document.head||document.documentElement).appendChild(s);
    }

    function applyForDomain() {
        const enabled = getSetting(`dark_mode_${domain}`, true);
        if (!enabled) {
            if (window.DarkReader && window.DarkReader.isEnabled()) window.DarkReader.disable();
            document.documentElement.classList.remove('darkreader--enabled');
            return;
        }
        // respect sites that already have dark theme - check before enabling
        try {
            const hasDarkAttr = document.documentElement.getAttribute('data-theme')==='dark' ||
                                document.documentElement.classList.contains('dark') ||
                                document.body.classList.contains('dark');
            if (hasDarkAttr) return;
        } catch(e){}
        loadDarkReader(() => {
            try {
                if (!window.DarkReader.isEnabled()) window.DarkReader.enable(DR_CONFIG);
                document.documentElement.setAttribute('data-darkreader-scheme','dark');
            } catch(e){ console.error('DarkReader enable failed', e); }
        });
    }

    // Expose for which-key (powerscripts calls these via eval_js, separate world shares DOM+localStorage)
    window.__darkmode_toggle = () => {
        const cur = getSetting(`dark_mode_${domain}`, true);
        const next = !cur;
        setSetting(`dark_mode_${domain}`, next);
        if (next) {
            loadDarkReader(() => { try { window.DarkReader.enable(DR_CONFIG); } catch(e){} });
            document.documentElement.classList.add('darkreader--enabled');
        } else {
            try { if(window.DarkReader) window.DarkReader.disable(); } catch(e){}
            document.documentElement.classList.remove('darkreader--enabled');
        }
        // also handle isolated world callers that toggle via direct DOM
        try { localStorage.setItem(`dark_mode_${domain}`, JSON.stringify(next)); } catch(e){}
    };
    window.__darkmode_enable = () => {
        if (!getSetting(`dark_mode_${domain}`, true)) {
            setSetting(`dark_mode_${domain}`, true);
            loadDarkReader(() => { try { window.DarkReader.enable(DR_CONFIG); } catch(e){} });
        }
    };
    window.__darkmode_disable = () => {
        setSetting(`dark_mode_${domain}`, false);
        try { if(window.DarkReader) window.DarkReader.disable(); } catch(e){}
    };
    window.__darkmode_show_gui = () => {
        // GUI removed - toggle instead
        window.__darkmode_toggle();
    };

    // Initial apply - wait for DarkReader to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyForDomain);
    }
    // Try immediately (document-start) and also after load
    applyForDomain();
    // Re-apply on SPA navigation (popstate/pushState)
    const obsNav = () => {
        const nd = location.hostname;
        const en = getSetting(`dark_mode_${nd}`, true);
        if (en) loadDarkReader(() => { try { if(!window.DarkReader.isEnabled()) window.DarkReader.enable(DR_CONFIG); } catch(e){} });
        else try { if(window.DarkReader && window.DarkReader.isEnabled()) window.DarkReader.disable(); } catch(e){}
    };
    addEventListener('popstate', obsNav);
    addEventListener('pageshow', obsNav);
    const _push = history.pushState; if(_push) history.pushState = function(){ const r=_push.apply(this,arguments); obsNav(); return r; };
    const _rep = history.replaceState; if(_rep) history.replaceState = function(){ const r=_rep.apply(this,arguments); obsNav(); return r; };

    // MutationObserver for which-key popup etc - ensure they are not darkened (DarkReader respects data-darkreader-ignore)
    // Keep DarkReader alive across Google-style DOM swaps (search without full reload)
    let lastDomCheck = 0;
    const domObserver = new MutationObserver(() => {
        const now = Date.now();
        if (now - lastDomCheck < 1000) return; // throttle 1s
        lastDomCheck = now;
        const en = getSetting(`dark_mode_${location.hostname}`, true);
        if (en) {
            // Re-enable if DarkReader got disabled by navigation or new content
            if (window.DarkReader && !window.DarkReader.isEnabled()) {
                try { window.DarkReader.enable(DR_CONFIG); } catch(e){}
            }
            // Ensure html still has dark marker (Google wipes it on search)
            if (!document.documentElement.classList.contains('extension-dark-mode') &&
                !document.documentElement.hasAttribute('data-darkreader-scheme')) {
                document.documentElement.classList.add('extension-dark-mode');
                document.documentElement.setAttribute('data-darkreader-scheme','dark');
            }
        }
    });
    // Observe body for Google search results injection
    const startDomObserver = () => {
        const target = document.body || document.documentElement;
        if (target) domObserver.observe(target, {childList:true, subtree:true});
    };
    if (document.body) startDomObserver();
    else document.addEventListener('DOMContentLoaded', startDomObserver);

    const wkObserver = new MutationObserver(() => {
        const wk = document.getElementById('-wk-root');
        if (wk) wk.setAttribute('data-darkreader-ignore','');
        const gui = document.getElementById('ps-darkmode-gui');
        if (gui) gui.setAttribute('data-darkreader-ignore','');
    });
    if (document.documentElement) wkObserver.observe(document.documentElement, {childList:true, subtree:true});

    if(typeof PS!=='undefined'&&PS.log) PS.log('darkmode: DarkReader dynamic v5.0.0 loaded for '+domain);
})();
