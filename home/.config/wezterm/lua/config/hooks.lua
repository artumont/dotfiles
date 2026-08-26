local wezterm = require("wezterm")

local M = {}

function M.apply()
	local want_fullscreen = os.getenv("WEZTERM_NVIM") == "1"

	-- Fullscreen when launched from Neovim desktop entry
	wezterm.on("gui-startup", function(cmd)
		local tab, pane, window = wezterm.mux.spawn_window(cmd or {})
		if window and want_fullscreen then
			local gui_win = window:gui_window()
			gui_win:maximize()
		end
	end)

	-- Hide tab bar when nvim is the foreground process
	wezterm.on("update-status", function(window)
		local pane = window:active_pane()
		if pane then
			local process = pane:get_foreground_process_name() or ""
			local is_nvim = process:find("nvim") ~= nil
			local current = window:get_config_overrides() or {}
			if is_nvim and current.enable_tab_bar ~= false then
				current.enable_tab_bar = false
				window:set_config_overrides(current)
			elseif not is_nvim and current.enable_tab_bar == false then
				current.enable_tab_bar = nil
				window:set_config_overrides(current)
			end
		end
	end)

	-- Dynamic font size: 15 on 2K+ monitors, 12 on 1080p/1920
	local startup_done = false
	wezterm.on("window-focus-changed", function(window)
		if not startup_done then
			startup_done = true
			return
		end
		local dims = window:gui_window():get_dimensions()
		local size = dims.pixel_width >= 2560 and 15 or 12
		window:set_config_overrides({ font_size = size })
	end)
end

return M
