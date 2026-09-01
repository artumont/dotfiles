local map = Snacks.keymap.set
local del = vim.keymap.set

local function is_file_buffer(buf) return vim.bo[buf or 0].buftype == "" end

-- Quick Navigation
map("n", "R", function() Snacks.picker.recent() end, { desc = "Open recent files browser" })

-- Search
map("n", "<leader>sb", function() Snacks.picker.lines() end, { desc = "Buffer Lines" })
map("n", "<leader>sB", function() Snacks.picker.grep_buffers() end, { desc = "Grep Open Buffers" })
map("n", "<leader>sg", function() Snacks.picker.grep() end, { desc = "Grep" })
map({ "n", "x" }, "<leader>sw", function() Snacks.picker.grep_word() end, { desc = "Visual selection or word" })

-- UI Toggles
map("n", "<leader>ee", "<cmd>Neotree toggle<CR>", { desc = "Toggle file explorer" })
map("n", "<leader>eg", "<cmd>Neotree git_status toggle right<CR>", { desc = "Toggle git explorer" })
map("n", "<leader>gg", function() Snacks.lazygit() end, { desc = "Open LazyGit" })
map("n", "<leader>kk", function() Snacks.terminal "lazydocker" end, { desc = "Open LazyDocker" })
map("n", "<leader>xx", "<cmd>Trouble diagnostics toggle filter.buf=0<CR>", { desc = "Toggle buffer diagnostics" })
map("n", "<leader>xg", "<cmd>Trouble diagnostics toggle<CR>", { desc = "Toggle global diagnostics" })

-- File Manipulation
map("n", "<leader>w", function() pcall(vim.api.nvim_command, "write") end, { desc = "Save file" })

map("v", "<Tab>", ">gv", { noremap = true, silent = true, desc = "Indent selection", enabled = is_file_buffer })
map("v", "<S-Tab>", "<gv", { noremap = true, silent = true, desc = "Dedent selection", enabled = is_file_buffer })

-- Git
map("n", "<leader>gi", function() Snacks.picker.gh_issue { state = "all" } end, { desc = "Open Github Issues" })
map("n", "<leader>gp", function() Snacks.picker.gh_pr { state = "all" } end, { desc = "Open Github Pull Requests" })

-- Buffer
map("n", "<leader>bd", function() Snacks.bufdelete(0) end, { desc = "Delete current buffer" })
map("n", "<leader>bD", function() Snacks.bufdelete.other() end, { desc = "Delete all other buffers" }) --

-- Lsp Actions
map("n", "ma", function() vim.lsp.buf.code_action() end, { desc = "Open code actions" })
map("n", "mr", function() vim.lsp.buf.rename() end, { desc = "Rename Symbol" })
map("n", "md", function() vim.lsp.buf.hover() end, { desc = "Hover Documentation" })

-- Lsp Navigation
map("n", "gd", function() Snacks.picker.lsp_definitions() end, { desc = "Goto Definition" })
map("n", "gD", function() Snacks.picker.lsp_declarations() end, { desc = "Goto Declaration" })
map("n", "gr", function() Snacks.picker.lsp_references() end, { nowait = true, desc = "References" })
map("n", "gI", function() Snacks.picker.lsp_implementations() end, { desc = "Goto Implementation" })
map("n", "gy", function() Snacks.picker.lsp_type_definitions() end, { desc = "Goto T[y]pe Definition" })
map("n", "gai", function() Snacks.picker.lsp_incoming_calls() end, { desc = "C[a]lls Incoming" })
map("n", "gao", function() Snacks.picker.lsp_outgoing_calls() end, { desc = "C[a]lls Outgoing" })
map("n", "<leader>ss", function() Snacks.picker.lsp_symbols() end, { desc = "LSP Symbols" })
map("n", "<leader>sS", function() Snacks.picker.lsp_workspace_symbols() end, { desc = "LSP Workspace Symbols" })

-- Terminal Navigation
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Divider
map("n", "<leader>---", function()
  vim.ui.input({ prompt = "Section title: " }, function(title)
    if title then
      local sep = require "utils.separator"
      local full_title = title ~= "" and title or "Section"
      local line = sep.make_separator(full_title)
      local row = vim.api.nvim_win_get_cursor(0)[1]
      vim.api.nvim_buf_set_lines(0, row, row, false, { line })
      vim.api.nvim_win_set_cursor(0, { row + 1, #line })
    end
  end)
end, { desc = "Insert section separator" })

-- Vimspector Debug (global)
map("n", "<leader>dd", "<Plug>VimspectorLaunch", { desc = "Start Debugging", remap = true })
map("n", "<leader>de", "<Plug>VimspectorReset", { desc = "Stop Debugging", remap = true })
map("n", "<leader>db", "<Plug>VimspectorToggleBreakpoint", { desc = "Toggle Breakpoint", remap = true })

-- Vimspector Debug (single-key, active only during session)
local debug_maps = {
  { "c", "<Plug>VimspectorContinue", "Continue" },
  { "n", "<Plug>VimspectorStepOver", "Step Over" },
  { "i", "<Plug>VimspectorStepInto", "Step Into" },
  { "o", "<Plug>VimspectorStepOut", "Step Out" },
}

local function set_debug_keymaps(bufnr)
  for _, m in ipairs(debug_maps) do
    vim.keymap.set("n", m[1], m[2], {
      buffer = bufnr, remap = true, silent = true, desc = m[3] .. " (debug)",
    })
  end
end

local function del_debug_keymaps(bufnr)
  for _, m in ipairs(debug_maps) do
    pcall(vim.keymap.del, "n", m[1], { buffer = bufnr })
  end
end

vim.api.nvim_create_autocmd("User", {
  pattern = "VimspectorUICreated",
  callback = function(args)
    set_debug_keymaps(args.buf)
  end,
  desc = "Set single-key debug maps on source buffer",
})

vim.api.nvim_create_autocmd("User", {
  pattern = "VimspectorDebugEnded",
  callback = function(args)
    del_debug_keymaps(args.buf)
  end,
  desc = "Remove single-key debug maps from source buffer",
})
