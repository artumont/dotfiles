// ==UserScript==
// @name        powerscripts Test
// @namespace   https://powerscripts.test
// @version     1.0.0
// @description Validates powerscripts framework APIs
// @match       https://www.google.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       PS.eval_js
// @run-at      document-end
// ==/UserScript==

(function() {
    'use strict';

    PS.log('=== powerscripts test ===');
    PS.log('uri:', PS.get_uri());
    PS.log('title:', PS.get_title());

    // ── Storage ──────────────────────────────────────────────────────────

    var key = 'ps_test_counter';
    var val = GM_getValue(key, 0);
    GM_setValue(key, val + 1);
    PS.log('storage:', key, '=', GM_getValue(key, 0));

    var keys = GM_listValues();
    PS.log('storage keys:', keys.length);
    keys.forEach(function(k) {
        PS.log(' ', k, '=', GM_getValue(k));
    });

    GM_deleteValue(key);
    PS.log('after delete:', GM_getValue(key, 'nil'));

    // ── CSS Injection ────────────────────────────────────────────────────

    GM_addStyle([
        '.ps-test-banner {',
        '  position: fixed;',
        '  bottom: 0;',
        '  right: 0;',
        '  padding: 8px 16px;',
        '  background: #1a1b26;',
        '  color: #7aa2f7;',
        '  font-family: monospace;',
        '  font-size: 12px;',
        '  z-index: 99999;',
        '  border-top-left-radius: 8px;',
        '}'
    ].join('\n'));

    var banner = document.createElement('div');
    banner.className = 'ps-test-banner';
    banner.textContent = '⚡ powerscripts active';
    document.body.appendChild(banner);

    // ── JS Eval ──────────────────────────────────────────────────────────

    var computed = PS.eval_js('1 + 2 + 3');
    PS.log('eval_js: 1+2+3 =', computed);

    // ── HTTP ─────────────────────────────────────────────────────────────

    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://httpbin.org/get',
        onload: function(resp) {
            PS.log('GM_xmlhttpRequest status:', resp.status);
        },
        onerror: function(err) {
            PS.log('GM_xmlhttpRequest error:', err.error);
        }
    });

    PS.log('=== test complete ===');
})();
