;;; doom-modeline.el --- Mode line -*- lexical-binding: t; -*-

(defun my/hide-side-window-modelines ()
  "Set `mode-line-format' to nil in all side windows."
  (dolist (win (window-list nil 'never))
    (when (window-parameter win 'window-side)
      (with-selected-window win
        (setq-local mode-line-format nil)))))

(use-package doom-modeline
  :straight t
  :config
  (doom-modeline-mode 1)

  (setq doom-modeline-height 28
        doom-modeline-bar-width 0
        doom-modeline-buffer-file-name-style 'truncate-upto-project
        doom-modeline-vcs-max-length 20
        doom-modeline-highlight-modified t)

  (doom-modeline-def-modeline 'main
    '(modals vcs buffer-info)
    '(buffer-encoding major-mode buffer-position))

  ;; Tokyo Night accent colors for the modeline
  (custom-set-faces
   ;; Evil state indicators (NORMAL/INSERT/etc)
   '(doom-modeline-evil-normal-state
     ((t (:background "#9ece6a" :foreground "#1a1b26" :weight bold))))
   '(doom-modeline-evil-insert-state
     ((t (:background "#7aa2f7" :foreground "#1a1b26" :weight bold))))
   '(doom-modeline-evil-visual-state
     ((t (:background "#bb9af7" :foreground "#1a1b26" :weight bold))))
   '(doom-modeline-evil-motion-state
     ((t (:background "#7dcfff" :foreground "#1a1b26" :weight bold))))
   '(doom-modeline-evil-replace-state
     ((t (:background "#f7768e" :foreground "#1a1b26" :weight bold))))
   ;; Panel background
   '(doom-modeline-panel
     ((t (:background "#bb9af7" :foreground "#1a1b26" :weight bold))))
   ;; Modified buffer indicator — red
   '(doom-modeline-buffer-modified
     ((t (:foreground "#f7768e" :weight bold))))
   ;; Buffer file path — blue
   '(doom-modeline-buffer-path
     ((t (:foreground "#7aa2f7" :weight bold))))
   ;; Buffer file name — cyan
   '(doom-modeline-buffer-file
     ((t (:foreground "#7dcfff"))))
   ;; VCS branch — green
   '(doom-modeline-vcs-default
     ((t (:foreground "#9ece6a" :weight bold))))
   ;; Info / position — magenta
   '(doom-modeline-info
     ((t (:foreground "#bb9af7" :weight bold))))
   ;; LSP status — cyan
   '(doom-modeline-lsp-success
     ((t (:foreground "#7dcfff"))))
   '(doom-modeline-lsp-warning
     ((t (:foreground "#e0af68"))))
   '(doom-modeline-lsp-error
     ((t (:foreground "#f7768e"))))))
