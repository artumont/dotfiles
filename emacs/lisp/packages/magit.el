;;; magit.el --- Git porcelain  -*- lexical-binding: t; -*-

(use-package magit
  :straight t
  :bind ("C-x g" . magit-status))

(provide 'packages/magit)
