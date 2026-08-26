local wezterm = require("wezterm")

local M = {}

function M.apply(config)
	config.keys = {
		-- splits
		{ key = "\\", mods = "ALT", action = wezterm.action.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
		{ key = "-", mods = "ALT", action = wezterm.action.SplitVertical({ domain = "CurrentPaneDomain" }) },
		{ key = "x", mods = "ALT", action = wezterm.action.CloseCurrentPane({ confirm = true }) },

		-- pane navigation
		{ key = "h", mods = "ALT", action = wezterm.action.ActivatePaneDirection("Left") },
		{ key = "j", mods = "ALT", action = wezterm.action.ActivatePaneDirection("Down") },
		{ key = "k", mods = "ALT", action = wezterm.action.ActivatePaneDirection("Up") },
		{ key = "l", mods = "ALT", action = wezterm.action.ActivatePaneDirection("Right") },

		-- tabs
		{ key = "t", mods = "ALT", action = wezterm.action.SpawnTab("CurrentPaneDomain") },
		{ key = "1", mods = "ALT", action = wezterm.action.ActivateTab(0) },
		{ key = "2", mods = "ALT", action = wezterm.action.ActivateTab(1) },
		{ key = "3", mods = "ALT", action = wezterm.action.ActivateTab(2) },
		{ key = "4", mods = "ALT", action = wezterm.action.ActivateTab(3) },
		{ key = "5", mods = "ALT", action = wezterm.action.ActivateTab(4) },

		-- font size
		{ key = "=", mods = "CTRL", action = wezterm.action.IncreaseFontSize },
		{ key = "-", mods = "CTRL", action = wezterm.action.DecreaseFontSize },
		{ key = "0", mods = "CTRL", action = wezterm.action.ResetFontSize },

		-- copy mode (vi-like)
		{ key = "c", mods = "ALT", action = wezterm.action.ActivateCopyMode },

		-- disable alt+enter (used by neovim toggle term)
		{ key = "Enter", mods = "ALT", action = wezterm.action.DisableDefaultAssignment },
	}
	return config
end

return M
