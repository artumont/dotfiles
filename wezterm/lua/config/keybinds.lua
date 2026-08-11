local wezterm = require("wezterm")

local M = {}

function M.apply(config)
	config.keys = {
		{
			key = "Enter",
			mods = "ALT",
			action = wezterm.action.DisableDefaultAssignment,
		},
	}
	return config
end

return M
