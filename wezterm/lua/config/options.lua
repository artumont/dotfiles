local wezterm = require("wezterm")

local M = {}

function M.apply(config)
	config.font = wezterm.font_with_fallback({
		"Monaspace Neon Var",
		"Symbols Nerd Font",
	})
	config.font_size = 12.0

	config.color_scheme = "Tokyo Night Storm"

	config.window_padding = { left = 12, right = 12, top = 4, bottom = 4 }
	config.window_decorations = "TITLE|RESIZE"
	config.initial_rows = 30
	config.initial_cols = 115
	config.default_cursor_style = "SteadyBlock"

	config.use_fancy_tab_bar = false
	config.tab_bar_at_bottom = true
	config.enable_tab_bar = true
	config.show_tabs_in_tab_bar = true
	config.show_new_tab_button_in_tab_bar = false

	config.mouse_bindings = {
		{
			event = { Down = { streak = 1, button = { WheelUp = 1 } } },
			mods = "NONE",
			action = wezterm.action.ScrollByLine(-2),
		},
		{
			event = { Down = { streak = 1, button = { WheelDown = 1 } } },
			mods = "NONE",
			action = wezterm.action.ScrollByLine(2),
		},
	}

	return config
end

return M
