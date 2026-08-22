// ==UserScript==
// @name         uBlock Lite (Powerscripts)
// @namespace    https://powerscripts.luakit/ublock
// @version      0.1.0
// @description  Trimmed adblock - cosmetic + fetch/XHR blocking, cached lists
// @match        *://*/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const DOMAIN = location.hostname;
    const CACHE_KEY = 'ublock_cache_v1';
    const CACHE_TIME = 24*60*60*1000;

    function log(...a){ if(typeof PS!=='undefined'&&PS.log) PS.log('[ublock]',...); else console.log('[ublock]',...); }

    // Fallback storage
    function getVal(k,d){ try{ if(typeof GM_getValue!=='undefined') return GM_getValue(k,d); const v=localStorage.getItem(k); return v!==null?JSON.parse(v):d; }catch(e){return d;} }
    function setVal(k,v){ try{ if(typeof GM_setValue!=='undefined') GM_setValue(k,v); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

    const DEFAULT_LISTS = [
        'https://easylist.to/easylist/easylist.txt',
        'https://easylist.to/easylist/easyprivacy.txt'
    ];

    // Trimmed parser: only handles simple forms
    function parseLists(text) {
        const cosmetic = [];
        const network = []; // array of RegExp
        const lines = text.split('\n');
        for(let raw of lines) {
            raw = raw.trim();
            if(!raw || raw.startsWith('!') || raw.startsWith('[')) continue;
            // cosmetic: ##selector or ###id
            if(raw.includes('##')) {
                const idx = raw.indexOf('##');
                const sel = raw.slice(idx+2).trim();
                // ignore procedural and scriptlet for trimmed
                if(!sel || sel.includes('+js(') || sel.includes(':has(')) continue;
                // basic validation
                if(sel.length < 2 || sel.length > 200) continue;
                cosmetic.push(sel);
            } else if(raw.startsWith('||') || raw.startsWith('|http')) {
                // network: ||example.com^  -> regexp
                try {
                    let pat = raw;
                    // strip options $...
                    pat = pat.split('$')[0];
                    // convert to regex: ||domain^ => \b domain
                    pat = pat.replace(/^\|\|/, '').replace(/^\|/, '').replace(/\^/g, '(?:[^a-z0-9.-]|$)').replace(/\*/g, '.*');
                    // crude: if contains * or ^
                    if(pat.length < 3 || pat.length > 120) continue;
                    network.push(new RegExp(pat, 'i'));
                    if(network.length > 1000) break; // trimmed cap
                } catch(e){}
            }
        }
        return {cosmetic, network};
    }

    function injectCosmetic(cssList) {
        if(!cssList.length) return;
        // chunk to avoid huge style
        const chunkSize = 400;
        for(let i=0;i<cssList.length;i+=chunkSize) {
            const chunk = cssList.slice(i, i+chunkSize);
            const css = chunk.join(', ') + ' { display: none !important; }';
            try {
                if(typeof GM_addStyle !== 'undefined') GM_addStyle(css);
                else { const s=document.createElement('style'); s.textContent=css; (document.head||document.documentElement).appendChild(s); }
            } catch(e){}
        }
        log('cosmetic injected', cssList.length);
    }

    function shouldBlock(url, network) {
        if(url && typeof url !== 'string' && url.toString) try{ url = url.toString(); }catch(e){ return false; }
        if(typeof url !== 'string') try{ url = String(url); }catch(e){ return false; }
        if(!url || !network.length) return false;
        if(url.startsWith('data:') || url.startsWith('luakit:') || url.startsWith('about:') || url.includes('favicon')) return false;
        // ignore same-origin? allow? For trimmed, block third-party only if list says
        for(const re of network) {
            if(re.test(url)) return true;
        }
        return false;
    }

    function hookNetwork(network) {
        if(!network.length) return;
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            try {
                const url = typeof input === 'string' ? input : input.url;
                if(shouldBlock(url, network)) {
                    log('blocked fetch', url);
                    return Promise.resolve(new Response('', {status:204}));
                }
            } catch(e){}
            return origFetch.apply(this, arguments);
        };
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
            this._ublockUrl = url;
            return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
            try {
                if(shouldBlock(this._ublockUrl, network)) {
                    log('blocked xhr', this._ublockUrl);
                    // abort and fake
                    Object.defineProperty(this, 'readyState', {value:4});
                    Object.defineProperty(this, 'status', {value:0});
                    this.dispatchEvent(new Event('loadend'));
                    return;
                }
            } catch(e){}
            return origSend.apply(this, arguments);
        };
        // Image/script src blocking via createElement - disabled for luakit Trusted Types compat
        // Hook disabled to prevent favicon/TrustedScriptURL breakage
        // Network blocking still covers fetch/XHR, which is main vector
        log('network hooks installed', network.length);
    }

    function applyFilters(data) {
        const {cosmetic, network} = parseLists(data);
        // inject cosmetic immediately
        if(document.documentElement) injectCosmetic(cosmetic);
        else document.addEventListener('DOMContentLoaded', ()=>injectCosmetic(cosmetic));
        // hook network
        hookNetwork(network);
        // expose stats for which-key
        window.__ublock_stats = {cosmetic: cosmetic.length, network: network.length, domain: DOMAIN};
        window.__ublock_toggle = () => {
            // simple toggle: remove styles
            document.querySelectorAll('style').forEach(s=>{
                if(s.textContent.includes('display: none !important')) s.remove();
            });
            log('toggled');
        };
    }

    function fetchLists(urls, cb) {
        let combined = '';
        let pending = urls.length;
        if(!pending) return cb('');
        urls.forEach(url=>{
            const done = (txt)=>{
                if(txt) combined += '\n' + txt;
                if(--pending===0) cb(combined);
            };
            try {
                if(typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method:'GET', url:url,
                        onload: r=>done(r.responseText),
                        onerror: ()=>done('')
                    });
                } else {
                    fetch(url).then(r=>r.text()).then(done).catch(()=>done(''));
                }
            } catch(e){ done(''); }
        });
    }

    // Main
    const cached = getVal(CACHE_KEY, null);
    const now = Date.now();
    if(cached && cached.text && (now - cached.time < CACHE_TIME)) {
        log('using cached lists', cached.text.length);
        applyFilters(cached.text);
    } else {
        log('fetching lists...');
        fetchLists(DEFAULT_LISTS, (txt)=>{
            if(txt) {
                setVal(CACHE_KEY, {text: txt, time: now});
                log('fetched', txt.length);
            }
            applyFilters(txt || '');
        });
    }

    // per-site disable via GM_getValue
    const disabled = getVal('ublock_disabled_'+DOMAIN, false);
    if(disabled) {
        log('disabled for', DOMAIN);
        // don't apply? For trimmed, we already applied, so remove
        setTimeout(()=>{
            document.querySelectorAll('style').forEach(s=>{
                if(s.textContent.includes('display: none !important')) s.remove();
            });
        }, 100);
    }

    window.__ublock_stats = () => {
        const c = getVal(CACHE_KEY, {text:''});
        return {domain: DOMAIN, disabled: getVal('ublock_disabled_'+DOMAIN,false), cacheSize: c.text?c.text.length:0};
    };
    window.__ublock_disable_site = () => { setVal('ublock_disabled_'+DOMAIN, true); location.reload(); };
    window.__ublock_enable_site = () => { setVal('ublock_disabled_'+DOMAIN, false); location.reload(); };

    log('ublock lite v0.1 ready for', DOMAIN);
})();
