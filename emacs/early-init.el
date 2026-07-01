;; -*- lexical-binding: t; -*-

(setq base-dir
      (expand-file-name "emacs/" (or (getenv "XDG_DATA_HOME") "~/.local/share")))

(when (and (fboundp 'startup-redirect-eln-cache)
           (fboundp 'native-comp-available-p)
           (native-comp-available-p))
  (startup-redirect-eln-cache
   (convert-standard-filename
    (expand-file-name "var/eln-cache/" base-dir))))

;; Use straight.el instead of package.el
(setq package-enable-at-startup nil)

;; UI Stuff
(setq-default initial-frame-alist '((background-color . "#24283b")
                                    (foreground-color . "#a9b1d6")))
(setq-default default-frame-alist '((background-color . "#24283b")
                                    (foreground-color . "#a9b1d6")))

(push '(tool-bar-lines . 0) default-frame-alist)
(push '(vertical-scroll-bars . nil) default-frame-alist)
(push '(menu-bar-lines . 0) default-frame-alist)
(push '(fullscreen . maximized) default-frame-alist)
