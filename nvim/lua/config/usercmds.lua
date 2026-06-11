vim.api.nvim_create_user_command("WorkspaceOpen", function()
  -- search recursively from cwd, max depth 5 to avoid huge trees
  local results = vim.fn.systemlist("fd --type f --extension code-workspace --max-depth 5 . " .. vim.fn.getcwd())

  if vim.v.shell_error ~= 0 or #results == 0 then
    -- fallback to find if fd isn't available
    results = vim.fn.systemlist("find " .. vim.fn.getcwd() .. " -maxdepth 5 -name '*.code-workspace' 2>/dev/null")
  end

  if #results == 0 then
    vim.notify("No .code-workspace files found", vim.log.levels.WARN)
    return
  end

  local function load_workspace(workspace_file)
    local file = io.open(workspace_file, "r")
    if not file then
      vim.notify("Could not open: " .. workspace_file, vim.log.levels.ERROR)
      return
    end

    local content = file:read "*a"
    file:close()

    local ok, workspace = pcall(vim.fn.json_decode, content)
    if not ok or not workspace.folders then
      vim.notify("Invalid .code-workspace file", vim.log.levels.ERROR)
      return
    end

    local workspace_dir = vim.fn.fnamemodify(workspace_file, ":p:h")

    local entries = {}
    for _, folder in ipairs(workspace.folders) do
      local root = vim.fn.fnamemodify(workspace_dir .. "/" .. folder.path, ":p"):gsub("/$", "")
      if vim.fn.isdirectory(root) == 1 and root ~= workspace_dir then
        table.insert(entries, {
          label = folder.name or vim.fn.fnamemodify(root, ":t"),
          root = root,
        })
      end
    end

    if #entries == 0 then
      vim.notify("No valid folders found in workspace", vim.log.levels.WARN)
      return
    end

    local pickers = require "telescope.pickers"
    local finders = require "telescope.finders"
    local conf = require("telescope.config").values
    local actions = require "telescope.actions"
    local action_state = require "telescope.actions.state"
    local entry_display = require "telescope.pickers.entry_display"

    local displayer = entry_display.create {
      separator = " ",
      items = {
        { width = 20 },
        { remaining = true },
      },
    }

    local function open_tabs(selected)
      local function open_next(i)
        if i > #selected then
          vim.cmd "tablast"
          return
        end

        local entry = selected[i]
        vim.cmd "tabnew"
        vim.cmd("tcd " .. vim.fn.fnameescape(entry.root))

        local buf = vim.api.nvim_create_buf(false, true)
        vim.api.nvim_buf_set_name(buf, entry.label .. i)
        vim.api.nvim_win_set_buf(0, buf)
        vim.bo[buf].buftype = "nofile"
        vim.bo[buf].bufhidden = "wipe"

        local win = vim.api.nvim_get_current_win()
        vim.cmd "Neotree filesystem show left"
        vim.cmd "Neotree git_status show right"

        vim.defer_fn(function() open_next(i + 1) end, 150)
      end

      open_next(1)
    end

    pickers
      .new({}, {
        prompt_title = "Select Folders — " .. vim.fn.fnamemodify(workspace_file, ":t"),
        finder = finders.new_table {
          results = entries,
          entry_maker = function(entry)
            return {
              value = entry,
              display = function()
                return displayer {
                  { entry.label, "TelescopeResultsIdentifier" },
                  { entry.root, "TelescopeResultsComment" },
                }
              end,
              ordinal = entry.label,
            }
          end,
        },
        sorter = conf.generic_sorter {},
        attach_mappings = function(prompt_bufnr, _)
          actions.select_default:replace(function()
            local picker = action_state.get_current_picker(prompt_bufnr)
            local selected = picker:get_multi_selection()
            if #selected == 0 then selected = { action_state.get_selected_entry() } end
            actions.close(prompt_bufnr)
            open_tabs(vim.tbl_map(function(e) return e.value end, selected))
          end)
          return true
        end,
      })
      :find()
  end

  -- if multiple workspace files found, pick one first
  if #results == 1 then
    load_workspace(results[1])
  else
    local pickers = require "telescope.pickers"
    local finders = require "telescope.finders"
    local conf = require("telescope.config").values
    local actions = require "telescope.actions"
    local action_state = require "telescope.actions.state"

    pickers
      .new({}, {
        prompt_title = "Select Workspace File",
        finder = finders.new_table {
          results = results,
          entry_maker = function(entry)
            return {
              value = entry,
              display = vim.fn.fnamemodify(entry, ":~:."), -- show relative path
              ordinal = entry,
            }
          end,
        },
        sorter = conf.generic_sorter {},
        attach_mappings = function(prompt_bufnr, _)
          actions.select_default:replace(function()
            local selection = action_state.get_selected_entry()
            actions.close(prompt_bufnr)
            if selection then load_workspace(selection.value) end
          end)
          return true
        end,
      })
      :find()
  end
end, {})
