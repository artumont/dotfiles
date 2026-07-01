;;; font.el --- Fallback fonts for symbols/icons  -*- lexical-binding: t; -*-

;; Set default font family and size
(set-face-attribute 'default nil
                    :font "Monaspace Neon Var"
                    :weight 'normal)

;; Enable antialiasing, subpixel rendering, and full hinting via font config
(setq-default Xft.antialias 1
              Xft.rgba "rgb"
              Xft.hinting 1
              Xft.hintstyle "hintfull")

;; Enable OpenType font features (ligatures and stylistic sets)
(when (fboundp 'mac-font-get-features) 
  (mac-add-font-features "Monaspace Neon Var" 
                         '((calt 1) (ss01 1) (ss02 1) (ss03 1) (ss04 1) 
                           (ss05 1) (ss06 1) (ss07 1) (ss08 1) (ss09 1) (ss10 1))))

;; Fallback setup for Symbols Nerd Font and standard monospace
(set-fontset-font t 'nil (font-spec :family "Symbols Nerd Font") nil 'prepend)
(set-fontset-font t 'nil (font-spec :family "monospace") nil 'append)

