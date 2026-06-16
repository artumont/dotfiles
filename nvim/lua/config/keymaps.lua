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

-- Terminal Management
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Lsp Actions
map("n", "la", "<cmd>Lspsaga code_action<CR>", { desc = "Open Code Actions" })
map("n", "ld", "<cmd>Lspsaga hover_doc<CR>", { desc = "Open Documentation" })
map("n", "lr", "<cmd>Lspsaga rename<CR>", { desc = "Rename Symbol" })
map("n", "lD", "<cmd>Lspsaga hover_doc ++keep<CR>", { desc = "Open Documentation (keep)" })
map("n", "lf", "<cmd>Lspsaga finder<CR>", { desc = "LSP Finder (refs/defs)" })
map("n", "lp", "<cmd>Lspsaga peek_definition<CR>", { desc = "Peek Definition" })
map("n", "lP", "<cmd>Lspsaga peek_type_definition<CR>", { desc = "Peek Type Definition" })
map("n", "lo", "<cmd>Lspsaga outline<CR>", { desc = "Toggle Symbol Outline" })
map("n", "lx", "<cmd>Lspsaga show_line_diagnostics<CR>", { desc = "Line Diagnostics" })
map("n", "lX", "<cmd>Lspsaga show_cursor_diagnostics<CR>", { desc = "Cursor Diagnostics" })
map("n", "[d", "<cmd>Lspsaga diagnostic_jump_prev<CR>", { desc = "Prev Diagnostic" })
map("n", "]d", "<cmd>Lspsaga diagnostic_jump_next<CR>", { desc = "Next Diagnostic" })
map("n", "gd", "<cmd>Lspsaga goto_definition<CR>", { desc = "Go to Definition" })
map("n", "gt", "<cmd>Lspsaga goto_type_definition<CR>", { desc = "Go to Type Definition" })
map("n", "lv", function()
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
