local sep = require "utils.separator"

-- Section separator command
vim.api.nvim_create_user_command("Divider", function(opts)
  local title = opts.args ~= "" and opts.args or "Section"
  local line = sep.make_separator(title)
  local row = vim.api.nvim_win_get_cursor(0)[1]
  vim.api.nvim_buf_set_lines(0, row, row, false, { line })
  vim.api.nvim_win_set_cursor(0, { row + 1, #line })
end, { nargs = "?", desc = "Insert section separator with custom title" })
