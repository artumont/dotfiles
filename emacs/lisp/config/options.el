;;; options.el --- Editor behavior options -*- lexical-binding: t; -*-

;; Line numbers
(global-display-line-numbers-mode -1)
(add-hook 'prog-mode-hook #'display-line-numbers-mode)
(add-hook 'text-mode-hook #'display-line-numbers-mode)

;; Highlight current line
(add-hook 'prog-mode-hook #'hl-line-mode)
(add-hook 'text-mode-hook #'hl-line-mode)

;; Scrolloff equivalent
(setq scroll-margin 8
      scroll-conservatively 101   ; scroll one line at a time near edges
      scroll-preserve-screen-position t)

;; No line wrap
(setq-default truncate-lines t)

;; Indentation
(setq-default tab-width 2
              indent-tabs-mode nil)

;;Matching parens/brackets highlight
(show-paren-mode 1)
(setq show-paren-delay 0)

;; Quieter startup 
(setq inhibit-startup-screen t
      initial-scratch-message nil
      ring-bell-function #'ignore
      visible-bell nil)

;; No cursor blinking
(blink-cursor-mode -1)

(provide 'packages/defaults)
