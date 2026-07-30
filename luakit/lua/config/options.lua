local settings = require "settings"
local window = require "window"
local chrome = require "chrome"

local default_site = "https://google.com"
local function maximize_window(w) w.win.maximized = true end

for _, w in pairs(window.bywidget) do
  if w.title ~= "lazy.luakit" and w.title ~= "" then maximize_window(w) end
  w:navigate(default_site)
end

settings.webview.hardware_acceleration_policy = "always"
settings.application.prefer_dark_mode = true
settings.window.default_search_engine = "google"
