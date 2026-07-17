local map = vim.keymap.set
local del = vim.keymap.del

-- State vars
local term_buf = -1
local term_height = 10
local virtual_text_enabled = true

-- UI Toggles
map("n", "<leader>E", "<cmd>Neotree toggle<CR>", { desc = "Toggle File Explorer" })
map("n", "<leader>G", "<cmd>Neotree git_status toggle<CR>", { desc = "Toggle Git Explorer" })
map("n", "<leader>T", function()
  local win = vim.fn.bufwinnr(term_buf)
  if win ~= -1 then
    vim.cmd(win .. "wincmd c")
  else
    if vim.api.nvim_win_get_width(0) < 50 then vim.cmd "wincmd p" end
    if vim.api.nvim_buf_is_valid(term_buf) then
      vim.cmd("below " .. term_height .. "split")
      vim.cmd("buffer " .. term_buf)
    else
      vim.cmd("below " .. term_height .. "split")
      vim.cmd "terminal"
      term_buf = vim.api.nvim_get_current_buf()
      vim.bo[term_buf].buflisted = false
    end
  end
end, { desc = "Toggle Terminal" })

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

-- Buffer Actions
map("n", "<leader>bD", function()
  local bd = require("mini.bufremove").delete
  for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_valid(bufnr) and vim.api.nvim_buf_is_loaded(bufnr) then
      if vim.bo[bufnr].buftype == "" then bd(bufnr, false) end
    end
  end
end, { desc = "Delete all file buffers" })

map("n", "<leader>bt", function() require("utils.buffer_switcher").switch() end, { desc = "Buffer Tab Switcher" })

-- Bufferline Navigation
map("n", "<leader>bn", "<cmd>BufferLineCycleNext<CR>", { desc = "Next Buffer" })
map("n", "<leader>bp", "<cmd>BufferLineCyclePrev<CR>", { desc = "Previous Buffer" })
map("n", "<leader>bd", function() require("mini.bufremove").delete(0, false) end, { desc = "Close Buffer" })
map("n", "<leader>bP", "<cmd>BufferLineTogglePin<CR>", { desc = "Pin/Unpin Buffer" })
map("n", "<leader>bo", "<cmd>BufferLineCloseOthers<CR>", { desc = "Close Other Buffers" })
map("n", "<leader>bl", "<cmd>BufferLineCloseRight<CR>", { desc = "Close Buffers to Right" })
map("n", "<leader>bh", "<cmd>BufferLineCloseLeft<CR>", { desc = "Close Buffers to Left" })
map("n", "<leader>bm", "<cmd>BufferLineMoveNext<CR>", { desc = "Move Buffer Right" })
map("n", "<leader>bM", "<cmd>BufferLineMovePrev<CR>", { desc = "Move Buffer Left" })
map("n", "<leader>bs", "<cmd>BufferLineSortByExtension<CR>", { desc = "Sort Buffers by Extension" })
map("n", "<leader>bS", "<cmd>BufferLineSortByDirectory<CR>", { desc = "Sort Buffers by Directory" })
for i = 1, 9 do
  map("n", "<leader>bg" .. i, function() require("bufferline").go_to(i, true) end, { desc = "Go to Buffer " .. i })
end

-- Tab Navigation Keybinds
map("n", "<leader>to", ":tabnew<CR>", { desc = "Open new tab", noremap = true, silent = true })
map("n", "<leader>td", ":tabclose<CR>", { desc = "Close current tab", noremap = true, silent = true })
map("n", "<leader>tn", ":tabnext<CR>", { desc = "Go to next tab", noremap = true, silent = true })
map("n", "<leader>tp", ":tabprevious<CR>", { desc = "Go to previous tab", noremap = true, silent = true })

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
map("n", "<leader>xx", "<cmd>Trouble diagnostics toggle filter.buf=0<CR>", { desc = "Toggle Buffer Diagnostics" })
map("n", "<leader>xX", "<cmd>Trouble diagnostics toggle<cr>", { desc = "Toggle Global Diagnostics" })
map("n", "<leader>xL", "<cmd>Trouble loclist toggle<cr>", { desc = "Location List (Trouble)" })
map("n", "<leader>xQ", "<cmd>Trouble qflist toggle<cr>", { desc = "Quickfix List (Trouble)" })

-- Git Mappings
map("n", "<leader>gd", function() require("mini.diff").toggle_overlay(0) end, { desc = "Toggle Git Diff" })
map("n", "<leader>gg", function() require("neogit").open() end, { desc = "Open Neogit UI" })

-- Agent smith bindings
map("v", "<leader>as", function() require("agent-smith").visual() end)
map("v", "<leader>aS", function() require("agent-smith").multi_file() end)
map("n", "<leader>af", function() require("agent-smith").search() end)
map("n", "<leader>av", function() require("agent-smith").vibe() end)
map("n", "<leader>ax", function() require("agent-smith").stop_all_requests() end)

-- Telescope Mappings
map("n", "<C-f>", "<cmd>Telescope current_buffer_fuzzy_find<CR>", { desc = "Fuzzy find in current buffer " })
