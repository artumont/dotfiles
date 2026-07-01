;;; lsp.el --- LSP configuration  -*- lexical-binding: t; -*-

(use-package lsp-mode
  :straight t
  :commands (lsp lsp-deferred)
  :hook (prog-mode . lsp-deferred)
  :config
  (setq lsp-idle-delay 0.5
        lsp-enable-symbol-highlighting t
        lsp-enable-snippet nil
        lsp-enable-on-type-formatting nil
        lsp-enable-indentation nil))

(use-package lsp-ui
  :straight t
  :after lsp-mode
  :config
  (setq lsp-ui-doc-enable t
        lsp-ui-doc-position 'at-point
        lsp-ui-sideline-enable t
        lsp-ui-sideline-show-diagnostics t
        lsp-ui-sideline-show-hover nil
        lsp-ui-peek-enable t))

(provide 'packages/lsp)
