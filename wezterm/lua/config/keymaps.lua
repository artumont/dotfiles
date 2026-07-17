local wezterm = require "wezterm"
local act = wezterm.action

local M = {}

function M.apply(config)
  config.keys = {
    -- Pane splitting
    { key = "-", mods = "CTRL|SHIFT", action = act.SplitVertical { domain = "CurrentPaneDomain" } },
    { key = "\\", mods = "CTRL|SHIFT", action = act.SplitHorizontal { domain = "CurrentPaneDomain" } },

    -- Pane navigation
    { key = "LeftArrow", mods = "CTRL|SHIFT", action = act.ActivatePaneDirection "Left" },
    { key = "RightArrow", mods = "CTRL|SHIFT", action = act.ActivatePaneDirection "Right" },
    { key = "UpArrow", mods = "CTRL|SHIFT", action = act.ActivatePaneDirection "Up" },
    { key = "DownArrow", mods = "CTRL|SHIFT", action = act.ActivatePaneDirection "Down" },

    -- Pane resize
    { key = "LeftArrow", mods = "CTRL|ALT", action = act.AdjustPaneSize { "Left", 5 } },
    { key = "RightArrow", mods = "CTRL|ALT", action = act.AdjustPaneSize { "Right", 5 } },
    { key = "UpArrow", mods = "CTRL|ALT", action = act.AdjustPaneSize { "Up", 5 } },
    { key = "DownArrow", mods = "CTRL|ALT", action = act.AdjustPaneSize { "Down", 5 } },

    -- New tab
    { key = "n", mods = "CTRL|SHIFT", action = act.SpawnTab "CurrentPaneDomain" },

    -- Switch tabs
    { key = "1", mods = "CTRL|SHIFT", action = act.ActivateTab(0) },
    { key = "2", mods = "CTRL|SHIFT", action = act.ActivateTab(1) },
    { key = "3", mods = "CTRL|SHIFT", action = act.ActivateTab(2) },
    { key = "4", mods = "CTRL|SHIFT", action = act.ActivateTab(3) },
    { key = "5", mods = "CTRL|SHIFT", action = act.ActivateTab(4) },
    { key = "6", mods = "CTRL|SHIFT", action = act.ActivateTab(5) },
    { key = "7", mods = "CTRL|SHIFT", action = act.ActivateTab(6) },
    { key = "8", mods = "CTRL|SHIFT", action = act.ActivateTab(7) },

    -- Font size
    { key = "=", mods = "CTRL|SHIFT", action = act.IncreaseFontSize },
    { key = "-", mods = "CTRL|SHIFT", action = act.DecreaseFontSize },
    { key = "0", mods = "CTRL|SHIFT", action = act.ResetFontSize },

    -- Quick open nvim
    { key = "t", mods = "CTRL|SHIFT", action = act.SpawnCommandInNewTab { args = { "nvim" } } },
  }

  return config
end

return M
