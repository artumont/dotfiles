;;; dashboard.el --- Start screen -*- lexical-binding: t; -*-

(use-package dashboard
  :straight t
  :init
  (setq dashboard-startup-banner 'logo
        dashboard-center-content t
        dashboard-items '((recents  . 5)
                           (projects . 5)
                           (bookmarks . 5)))
  :config
  (dashboard-setup-startup-hook))

(provide 'packages/dashboard)
