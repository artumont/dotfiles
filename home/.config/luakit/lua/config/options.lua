local globals = require "config.globals"
local settings = require "settings"
local window = require "window"

settings.webview.hardware_acceleration_policy = "always"

local function maximize_window(w) w.win.maximized = true end

for _, w in pairs(window.bywidget) do
  if w.title ~= "lazy.luakit" and w.title ~= "" then maximize_window(w) end
  w:navigate(globals.default_page)
end

settings.webview.user_agent = globals.user_agent

settings.application.prefer_dark_mode = true

settings.window.default_search_engine = "google"

settings.window.close_with_last_tab = true
