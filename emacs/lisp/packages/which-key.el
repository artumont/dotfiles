;;; which-key.el --- Keybinding discoverability  -*- lexical-binding: t; -*-

(use-package which-key
  :straight t
  :config
  (which-key-mode 1)
  (setq which-key-idle-delay 0.5
        which-key-sort-order 'which-key-key-order-alpha
        which-key-sort-uppercase-first nil
        which-key-add-column-padding 1
        which-key-max-display-columns 3
        which-key-min-display-lines 6
        which-key-side-window-max-width 0.33
        which-key-side-window-location 'bottom))

(provide 'packages/which-key)
