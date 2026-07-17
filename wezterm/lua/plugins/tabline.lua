local wezterm = require "wezterm"

local M = {}

function M.apply(config)
  local tabline = wezterm.plugin.require "https://github.com/michaelbrusegard/tabline.wez"

  tabline.setup {
    options = {
      icons_enabled = true,
      theme = "Tokyo Night Storm",
      tabs_enabled = true,
      section_separators = {
        left = wezterm.nerdfonts.pl_left_hard_divider,
        right = wezterm.nerdfonts.pl_right_hard_divider,
      },
      component_separators = {
        left = wezterm.nerdfonts.pl_left_soft_divider,
        right = wezterm.nerdfonts.pl_right_soft_divider,
      },
      tab_separators = {
        left = wezterm.nerdfonts.pl_left_hard_divider,
        right = wezterm.nerdfonts.pl_right_hard_divider,
      },
    },
    sections = {
      tabline_a = { "mode" },
      tabline_b = { "workspace" },
      tabline_c = { " " },
      tab_active = {
        "index",
        { "process", padding = { left = 0, right = 1 } },
        { "zoomed", padding = 0 },
      },
      tab_inactive = {
        "index",
        { "process", padding = { left = 0, right = 1 } },
      },
      tabline_x = { "hostname" },
      tabline_y = { "datetime" },
      tabline_z = { "domain" },
    },
  }

  tabline.apply_to_config(config)

  -- Keep status/tabline at bottom
  config.tab_bar_at_bottom = true
  config.enable_tab_bar = true
  config.show_tabs_in_tab_bar = true
  config.show_new_tab_button_in_tab_bar = false

  return config
end

return M
