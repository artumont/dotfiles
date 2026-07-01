;;; company.el --- Completion framework  -*- lexical-binding: t; -*-

(use-package company
  :straight t
  :hook (prog-mode . company-mode))

(provide 'packages/company)
