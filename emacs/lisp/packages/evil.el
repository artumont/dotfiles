;;; evil.el --- Vim keybindings/modal editing  -*- lexical-binding: t; -*-

(use-package evil
  :straight t
  :demand t
  :init
  (setq evil-want-integration t
        evil-want-keybinding nil)
  :config
  (evil-mode 1))

;; Makes evil bindings consistent across magit, dired, treemacs, etc.
(use-package evil-collection
  :straight t
  :after evil
  :config
  (evil-collection-init))

(provide 'packages/evil)
