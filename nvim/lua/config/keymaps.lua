local map = vim.keymap.set
local del = vim.keymap.del

-- State vars
local virtual_text_enabled = true

-- UI Toggles
map("n", "<leader>E", "<cmd>Neotree toggle<CR>", { desc = "Toggle File Explorer" })
map("n", "<leader>G", "<cmd>Neotree git_status toggle<CR>", { desc = "Toggle Git Explorer" })
map("n", "<leader>X", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", { desc = "Toggle Buffer Diagnostics" })
map("n", "<leader>T", "<cmd>ToggleTerm<CR>", { desc = "Toggle Terminal Panel" })

-- File Saving
map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save File" })

-- Avoid copy on delete
map({ "n", "v" }, "d", '"_d', { noremap = true })
map({ "n", "v" }, "D", '"_D', { noremap = true })
map({ "n", "v" }, "c", '"_c', { noremap = true })
map({ "n", "v" }, "C", '"_C', { noremap = true })

map({ "n", "v" }, "y", '"+y', { noremap = true })
map("n", "Y", '"+Y', { noremap = true })

-- Indentation Management
map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection" })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection" })

-- Buffer Navigation
map("n", "<leader>bp", "<cmd>BufferLinePick<CR>", { desc = "Buffer Pick" })
map("n", "<leader>bd", function()
  local bd = require("mini.bufremove").delete
  bd(0, true)
end, { desc = "Delete buffer" })
map("n", "<leader>bD", function()
  for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_loaded(bufnr) then require("mini.bufremove").delete(bufnr, false) end
  end
end, { desc = "Delete all active buffers" })

-- Terminal Management
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Lsp Actions
map("n", "ma", "<cmd>Lspsaga code_action<CR>", { desc = "Open Code Actions" })
map("n", "md", "<cmd>Lspsaga hover_doc<CR>", { desc = "Open Documentation" })
map("n", "mr", "<cmd>Lspsaga rename<CR>", { desc = "Rename Symbol" })
map("n", "mD", "<cmd>Lspsaga hover_doc ++keep<CR>", { desc = "Open Documentation (keep)" })
map("n", "mf", "<cmd>Lspsaga finder<CR>", { desc = "LSP Finder (refs/defs)" })
map("n", "mp", "<cmd>Lspsaga peek_definition<CR>", { desc = "Peek Definition" })
map("n", "mx", "<cmd>Lspsaga show_line_diagnostics<CR>", { desc = "Line Diagnostics" })
map("n", "me", "<cmd>Lspsaga diagnostic_jump_prev<CR>", { desc = "Prev Diagnostic" })
map("n", "mw", "<cmd>Lspsaga diagnostic_jump_next<CR>", { desc = "Next Diagnostic" })
map("n", "gd", "<cmd>Lspsaga goto_definition<CR>", { desc = "Go to Definition" })
map("n", "gt", "<cmd>Lspsaga goto_type_definition<CR>", { desc = "Go to Type Definition" })
map("n", "sv", function()
  virtual_text_enabled = not virtual_text_enabled
  vim.diagnostic.config { virtual_text = virtual_text_enabled and opts.diagnostics.virtual_text or false }
  vim.notify("Virtual text " .. (virtual_text_enabled and "enabled" or "disabled"), vim.log.levels.INFO)
end, { desc = "Toggle LSP Virtual Text" })

-- Surround Mappings
map("x", '"', '<Plug>(operator-sandwich-add)"', { silent = true })
map("x", "(", "<Plug>(operator-sandwich-add)(", { silent = true })
map("x", ")", "<Plug>(operator-sandwich-add))", { silent = true })

-- Trouble Mappings
map("n", "<leader>xX", "<cmd>Trouble diagnostics toggle<cr>", { desc = "Toggle Global Diagnostics" })
map("n", "<leader>xL", "<cmd>Trouble loclist toggle<cr>", { desc = "Location List (Trouble)" })
map("n", "<leader>xQ", "<cmd>Trouble qflist toggle<cr>", { desc = "Quickfix List (Trouble)" })

-- Git Mappings
map("n", "<leader>gd", function() require("mini.diff").toggle_overlay(0) end, { desc = "Toggle Git Diff" })
map("n", "<leader>gg", function() require("neogit").open() end, { desc = "Open Neogit UI" })

-- 99Agent Mappings
map("v", "<leader>9v", function() require("99").visual() end, { desc = "Prompt agent on selection" })
map("n", "<leader>9x", function() require("99").stop_all_requests() end, { desc = "Cancel all requests" })
map("n", "<leader>9s", function() require("99").search() end, { desc = "Search codebase with agent" })
map(
  "n",
  "<leader>9m",
  function() require("99.extensions.telescope").select_model() end,
  { desc = "Open model switcher" }
)

-- Telescope Mappings
map("n", "<C-f>", "<cmd>Telescope current_buffer_fuzzy_find<CR>", { desc = "Fuzzy find in current buffer " })
