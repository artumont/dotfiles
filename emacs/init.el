;; Performance Options
(setq gc-cons-threshold #x40000000)
(setq read-process-output-max (* 1024 1024 4))
(setq native-comp-jit-compilation nil)
(setq straight-check-for-modifications nil)

;; Directory Paths & Setup

;; Point straight.el AND no-littering at the same base-dir so everything
;; (package repos/builds, auto-saves, backups, etc.) lives in one tidy
;; place instead of being scattered across user-emacs-directory.
(setq straight-base-dir base-dir)
(setq no-littering-etc-directory (expand-file-name "etc/" base-dir))
(setq no-littering-var-directory (expand-file-name "var/" base-dir))

(add-to-list 'custom-theme-load-path (expand-file-name "lisp/themes" user-emacs-directory))

;; Setup straight
(add-to-list 'load-path (expand-file-name "lisp" user-emacs-directory))
(require 'straight-setup)

;; Error Tracking Variables
(defvar my/package-load-errors nil
  "Alist of (FILE . ERROR) for packages that failed to load at startup.")

(defvar my/theme-load-errors nil
  "Alist of (FILE . ERROR) for themes that failed to load at startup.")

(defvar my/config-load-errors nil
  "Alist of (FILE . ERROR) for config files that failed to load at startup.")

;; Auto-Load Blocks

;; Packages
(let ((packages-dir (expand-file-name "lisp/packages" user-emacs-directory)))
  (when (file-directory-p packages-dir)
    (dolist (file (sort (directory-files packages-dir t "\\.el\\'") #'string<))
      (condition-case err
          (load file nil 'nomessage)
        (error
         (push (cons file err) my/package-load-errors)
         (message "!! Failed to load package %s: %s" (file-name-nondirectory file)
                  (error-message-string err)))))))

;; Themes
(let ((themes-dir (expand-file-name "lisp/themes" user-emacs-directory)))
  (when (file-directory-p themes-dir)
    (dolist (file (sort (directory-files themes-dir t "\\.el\\'") #'string<))
      (condition-case err
          (load file nil 'nomessage)
        (error
         (push (cons file err) my/theme-load-errors)
         (message "!! Failed to load theme %s: %s" (file-name-nondirectory file)
                  (error-message-string err)))))))

;; Config
(let ((config-dir (expand-file-name "lisp/config" user-emacs-directory)))
  (when (file-directory-p config-dir)
    (dolist (file (sort (directory-files config-dir t "\\.el\\'") #'string<))
      (condition-case err
          (load file nil 'nomessage)
        (error
         (push (cons file err) my/config-load-errors)
         (message "!! Failed to load config %s: %s" (file-name-nondirectory file)
                  (error-message-string err)))))))

;; Report Load Failures
(when (or my/package-load-errors my/theme-load-errors my/config-load-errors)
  (message "--- Startup Issues Detected ---")
  (when my/package-load-errors (message " -> %d package(s) failed" (length my/package-load-errors)))
  (when my/theme-load-errors   (message " -> %d theme(s) failed" (length my/theme-load-errors)))
  (when my/config-load-errors  (message " -> %d config file(s) failed" (length my/config-load-errors)))
  (message "-------------------------------"))

;; Custom Generated Customizations
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(inhibit-startup-screen t))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )

