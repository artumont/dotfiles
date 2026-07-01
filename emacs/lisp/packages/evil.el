;;; evil.el --- Vim keybindings/modal editing  -*- lexical-binding: t; -*-

(use-package evil
  :straight t
  :demand t
  :init
  (setq evil-want-integration t
        evil-want-keybinding nil)
  :config
  (evil-mode 1)

  ;; Use system clipboard for yank/paste
  (setq select-enable-clipboard t
        select-enable-primary nil)

  ;; Yank to system clipboard by default
  (setq evil-yank-function #'evil-yank)

  ;; Black hole register: delete/change don't overwrite clipboard
  ;; Use `"_d`, `"_c` etc. to delete without copying
  ;; (evil already supports this out of the box)

  ;; Visual mode: indent with Tab/Shift-Tab
  (define-key evil-visual-state-map (kbd ">") 'evil-shift-right)
  (define-key evil-visual-state-map (kbd "<") 'evil-shift-left)
  (define-key evil-visual-state-map (kbd "<tab>") 'evil-shift-right)
  (define-key evil-visual-state-map (kbd "<S-tab>") 'evil-shift-left))

;; Makes evil bindings consistent across magit, dired, treemacs, etc.
(use-package evil-collection
  :straight t
  :after evil
  :config
  (evil-collection-init))

(provide 'packages/evil)
