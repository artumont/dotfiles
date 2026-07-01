;;; treemacs.el --- File tree sidebar -*- lexical-binding: t; -*-

(use-package treemacs
  :straight t
  :commands (treemacs)
  :bind ("C-c t" . treemacs)
  :config
  ;; Disable treemacs's own modeline entirely — doom-modeline handles it
  (setq treemacs-user-mode-line-format 'none))

(use-package treemacs-nerd-icons
  :straight t
  :after (treemacs nerd-icons)
  :config
  (treemacs-load-theme "nerd-icons"))

(use-package treemacs-magit
  :straight t
  :after (treemacs magit))

(provide 'packages/treemacs)
