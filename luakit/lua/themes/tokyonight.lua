-- Tokyo Night theme for luakit
-- Based on https://github.com/folke/tokyonight.nvim

local theme = {}

theme.font = "12px monospace"
theme.fg   = "#c0caf5"
theme.bg   = "#24283b"

-- General colours
theme.success_fg = "#9ece6a"
theme.loaded_fg  = "#7aa2f7"
theme.error_fg = "#f7768e"
theme.error_bg = "#24283b"

-- Warning colours
theme.warning_fg = "#e0af68"
theme.warning_bg = "#24283b"

-- Notification colours
theme.notif_fg = "#c0caf5"
theme.notif_bg = "#24283b"

-- Menu colours
theme.menu_fg                   = "#c0caf5"
theme.menu_bg                   = "#24283b"
theme.menu_selected_fg          = "#24283b"
theme.menu_selected_bg          = "#7aa2f7"
theme.menu_title_bg             = "#24283b"
theme.menu_primary_title_fg     = "#f7768e"
theme.menu_secondary_title_fg   = "#565f89"

theme.menu_disabled_fg = "#565f89"
theme.menu_disabled_bg = theme.menu_bg
theme.menu_enabled_fg = "#9ece6a"
theme.menu_enabled_bg = theme.menu_bg
theme.menu_active_fg = "#73daca"
theme.menu_active_bg = theme.menu_bg

-- Proxy manager
theme.proxy_active_menu_fg      = "#c0caf5"
theme.proxy_active_menu_bg      = "#24283b"
theme.proxy_inactive_menu_fg    = "#565f89"
theme.proxy_inactive_menu_bg    = "#24283b"

-- Statusbar specific
theme.sbar_fg         = "#c0caf5"
theme.sbar_bg         = "#24283b"

-- Downloadbar specific
theme.dbar_fg         = "#c0caf5"
theme.dbar_bg         = "#24283b"
theme.dbar_error_fg   = "#f7768e"

-- Input bar specific
theme.ibar_fg           = "#c0caf5"
theme.ibar_bg           = "#24283b"

-- Tab label
theme.tab_fg            = "#565f89"
theme.tab_bg            = "#24283b"
theme.tab_hover_bg      = "#24283b"
theme.tab_ntheme        = "#565f89"
theme.selected_fg       = "#c0caf5"
theme.selected_bg       = "#24283b"
theme.selected_ntheme   = "#c0caf5"
theme.loading_fg        = "#7aa2f7"
theme.loading_bg        = "#24283b"

theme.selected_private_tab_bg = "#292e42"
theme.private_tab_bg    = "#24283b"

-- Trusted/untrusted ssl colours
theme.trust_fg          = "#9ece6a"
theme.notrust_fg        = "#f7768e"

-- Follow mode hints
theme.hint_font = "10px monospace, courier, sans-serif"
theme.hint_fg = "#24283b"
theme.hint_bg = "#7aa2f7"
theme.hint_border = "1px dashed #3b4261"
theme.hint_opacity = "0.4"
theme.hint_overlay_bg = "rgba(122,162,247,0.15)"
theme.hint_overlay_border = "1px dotted #7aa2f7"
theme.hint_overlay_selected_bg = "rgba(158,206,106,0.2)"
theme.hint_overlay_selected_border = "1px dotted #9ece6a"

-- General colour pairings
theme.ok = { fg = "#9ece6a", bg = "#24283b" }
theme.warn = { fg = "#e0af68", bg = "#24283b" }
theme.error = { fg = "#f7768e", bg = "#24283b" }

-- Gopher page style (override defaults)
theme.gopher_light = { bg = "#24283b", fg = "#c0caf5", link = "#7aa2f7" }
theme.gopher_dark  = { bg = "#24283b", fg = "#c0caf5", link = "#7aa2f7" }

return theme

-- vim: et:sw=4:ts=8:sts=4:tw=80
