-- ==UserScript==
-- @name        powerscripts Test
-- @namespace   https://powerscripts.test
-- @version     1.0.0
-- @description Validates powerscripts framework APIs
-- @match       https://example.com/*
-- @grant       GM_getValue
-- @grant       GM_setValue
-- @grant       GM_deleteValue
-- @grant       GM_listValues
-- @grant       GM_addStyle
-- @grant       PS.eval_js
-- @grant       PS.keybind
-- @grant       PS.keybind_group
-- @run-at      document-end
-- ==UserScript==

local log = PS.log
local uri = PS.get_uri()
local title = PS.get_title()

log("=== powerscripts test ===")
log("uri:   " .. uri)
log("title: " .. title)

-- ── Storage ──────────────────────────────────────────────────────────────

local test_key = "ps_test_counter"
local val = GM_getValue(test_key, 0)
GM_setValue(test_key, val + 1)
log("storage: " .. test_key .. " = " .. tostring(GM_getValue(test_key, 0)))

local keys = GM_listValues()
log("storage keys: " .. #keys)
for _, k in ipairs(keys) do
    log("  " .. k .. " = " .. tostring(GM_getValue(k)))
end

GM_deleteValue(test_key)
log("after delete: " .. tostring(GM_getValue(test_key, "nil")))

-- ── CSS Injection ────────────────────────────────────────────────────────

GM_addStyle([[
    .ps-test-banner {
        position: fixed;
        bottom: 0;
        right: 0;
        padding: 8px 16px;
        background: #1a1b26;
        color: #7aa2f7;
        font-family: monospace;
        font-size: 12px;
        z-index: 99999;
        border-top-left-radius: 8px;
    }
]])

PS.eval_js([[
    var b = document.createElement('div');
    b.className = 'ps-test-banner';
    b.textContent = '⚡ powerscripts active';
    document.body.appendChild(b);
]])

-- ── JS Eval ──────────────────────────────────────────────────────────────

local computed = PS.eval_js("1 + 2 + 3")
log("eval_js: 1+2+3 = " .. tostring(computed))

-- ── which-key ────────────────────────────────────────────────────────────

PS.keybind_group("p", { name = "Test", icon = " " })

PS.keybind("p.t", {
    desc = "Test notification",
    icon = " ",
}, function(w)
    log("keybind p.t triggered!")
    w:notify("powerscripts keybind works!")
end)

log("=== test complete ===")
