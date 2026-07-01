;;; diff-hl.el --- Inline git change markers -*- lexical-binding: t; -*-

(use-package diff-hl
  :straight t
  :hook ((prog-mode  . diff-hl-mode)
         (dired-mode . diff-hl-dired-mode))
  :config
  (diff-hl-flydiff-mode 1))

(provide 'packages/git-gutter)
