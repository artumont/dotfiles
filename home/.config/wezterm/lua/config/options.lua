local wezterm = require("wezterm")

local M = {}

function M.apply(config)
	config.font = wezterm.font_with_fallback({
		{
			family = "Monaspace Neon Var",
			harfbuzz_features = {
				"calt",
				"ss01",
				"ss02",
				"ss03",
				"ss04",
				"ss05",
				"ss06",
				"ss07",
				"ss08",
				"ss09",
				"ss10",
				"liga",
			},
		},
		"Symbols Nerd Font",
	})
	config.font_size = 12.0
	config.freetype_load_flags = "FORCE_AUTOHINT"
	config.freetype_render_target = "Normal"

	config.color_scheme = "Tokyo Night Storm"
	config.default_gui_startup_args = { "start", "--always-new-process" }

	config.window_padding = { left = 12, right = 12, top = 4, bottom = 4 }
	config.initial_rows = 35
	config.initial_cols = 120
	config.default_cursor_style = "SteadyBlock"

	config.use_fancy_tab_bar = false
	config.tab_bar_at_bottom = true
	config.enable_tab_bar = true
	config.show_tabs_in_tab_bar = true
	config.show_new_tab_button_in_tab_bar = false

	config.term = "wezterm"

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
