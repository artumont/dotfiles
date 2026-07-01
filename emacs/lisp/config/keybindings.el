;;; keybindings.el --- Keybinding configuration  -*- lexical-binding: t; -*-

(require 'which-key)

;; ── Which-key prefix labels ──────────────────────────────────────────
(which-key-add-keymap-based-replacements evil-normal-state-map
  "SPC"   '(nil . "leader")
  "SPC b" '(nil . "buffer")
  "SPC g" '(nil . "git")
  "SPC m" '(nil . "lsp")
  "SPC t" '(nil . "terminal")
  "SPC x" '(nil . "diagnostics"))

;; ── UI Toggles ───────────────────────────────────────────────────────
;; File explorer (treemacs)
(evil-define-key 'normal global-map (kbd "SPC e") #'treemacs)

;; Git explorer (treemacs git status)
(evil-define-key 'normal global-map (kbd "SPC g t")
  (lambda () (interactive) (treemacs) (treemacs-git-mode 'deferred)))

;; Toggle terminal (vterm)
(evil-define-key 'normal global-map (kbd "SPC t") #'vterm)

;; Buffer diagnostics
(evil-define-key 'normal global-map (kbd "SPC x x") #'flymake-list-diagnostics)

;; ── File Saving ──────────────────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "SPC w") #'save-buffer)

;; ── Buffer Navigation ────────────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "SPC b d") #'kill-current-buffer)
(evil-define-key 'normal global-map (kbd "SPC b p") #'switch-to-buffer)

;; ── Git ──────────────────────────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "SPC g g") #'magit-status)
(evil-define-key 'normal global-map (kbd "SPC g d") #'diff-hl-show-hunk)

;; ── Diagnostics ──────────────────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "SPC x X") #'flymake-list-diagnostics)
(evil-define-key 'normal global-map (kbd "SPC x l") #'next-error)
(evil-define-key 'normal global-map (kbd "SPC x q") #'previous-error)

;; ── LSP (under SPC m prefix) ────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "SPC m a") #'lsp-execute-code-action)
(evil-define-key 'normal global-map (kbd "SPC m d") #'lsp-describe-thing-at-point)
(evil-define-key 'normal global-map (kbd "SPC m r") #'lsp-rename)
(evil-define-key 'normal global-map (kbd "SPC m f") #'lsp-find-references)
(evil-define-key 'normal global-map (kbd "SPC m p") #'lsp-ui-peek-find-definitions)
(evil-define-key 'normal global-map (kbd "SPC m x") #'lsp-ui-sideline-apply-all)
(evil-define-key 'normal global-map (kbd "SPC m e") #'flymake-goto-prev-error)
(evil-define-key 'normal global-map (kbd "SPC m w") #'flymake-goto-next-error)

;; ── Go-to definitions ───────────────────────────────────────────────
(evil-define-key 'normal global-map (kbd "g d") #'xref-find-definitions)
(evil-define-key 'normal global-map (kbd "g t") #'xref-find-type-definition)

;; ── Terminal ─────────────────────────────────────────────────────────
;; Esc in terminal mode exits to normal (evil handles this automatically)
(with-eval-after-load 'vterm
  (define-key vterm-mode-map (kbd "<escape>") #'vterm-send-C-c))

(provide 'config/keybindings)
