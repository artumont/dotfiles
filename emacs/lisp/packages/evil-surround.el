;;; evil-surround.el --- Surround text objects  -*- lexical-binding: t; -*-

(use-package evil-surround
  :straight t
  :after evil
  :config
  (global-evil-surround-mode 1))

(provide 'packages/evil-surround)
