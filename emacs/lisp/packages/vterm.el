;;; vterm.el --- Integrated terminal  -*- lexical-binding: t; -*-

(use-package vterm
  :straight t
  :commands (vterm vterm-other-window)
  :config
  (setq vterm-max-scrollback 10000
        vterm-timer-delay 0.01))

(provide 'packages/vterm)
