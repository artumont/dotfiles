local lazy = require("lazy")

lazy.setup({
	config_dir = luakit.config_dir .. "/lua",
	lockfile = luakit.config_dir .. "/lazy-lock.json",
	spec = "plugins",
})
