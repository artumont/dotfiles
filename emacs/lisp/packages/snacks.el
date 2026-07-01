;;; snacks.el --- Startup dashboard -*- lexical-binding: t; -*-

(use-package snacks
  :straight
  (snacks
   :type git
   :host github
   :repo "rougier/snacks")
  :defer t)
