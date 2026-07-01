;;; centaur-tabs.el --- Buffer tab bar -*- lexical-binding: t; -*-

(use-package centaur-tabs
  :straight t
  :demand t
  :after nerd-icons
  :config
  (centaur-tabs-mode t)
  (setq centaur-tabs-style "bar"
        centaur-tabs-set-icons t
        centaur-tabs-set-modified-marker t
        centaur-tabs-show-navigation-buttons t)
  :bind
  ("C-<prior>" . centaur-tabs-backward)
  ("C-<next>"  . centaur-tabs-forward))

(provide 'packages/tabs)
