local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- Add lua folder to path so we can require config modules
package.path = os.getenv("HOME") .. "/.config/wezterm/lua/?.lua;" .. package.path

require("config.options").apply(config)
require("config.keymaps").apply(config)
require("plugins.smart-splits").apply(config)
require("plugins.tabline").apply(config)

-- tabline may override this; force native title bar last
config.window_decorations = "TITLE|RESIZE"

return config
