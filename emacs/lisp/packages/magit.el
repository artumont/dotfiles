;;; magit.el --- Git porcelain, docked as a right-side panel  -*- lexical-binding: t; -*-

(use-package magit
  :straight t
  :bind ("C-x g" . magit-status)
  :init
  (add-to-list 'display-buffer-alist
               '("magit: "
                 (display-buffer-in-side-window)
                 (side . right)
                 (slot . 0)
                 (window-width . 38)
                 (dedicated . t)))
  :config
  (setq magit-display-buffer-function #'magit-display-buffer-traditional)

  (defun my/magit-status-panel-toggle ()
    "Toggle the persistent right-side git status panel."
    (interactive)
    (if-let ((win (seq-find (lambda (w)
                               (string-prefix-p "magit: " (buffer-name (window-buffer w))))
                             (window-list))))
        (delete-window win)
      (magit-status)))
  :bind ("C-c g" . my/magit-status-panel-toggle))

(provide 'packages/magit)
