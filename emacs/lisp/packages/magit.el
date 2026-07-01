;;; magit.el --- Git porcelain, docked as a right-side panel  -*- lexical-binding: t; -*-

(require 'vc-git)

(defun my/git-tree ()
  "Show changed files in a tree view grouped by directory."
  (interactive)
  (let* ((root (or (vc-git-root default-directory) default-directory))
         (status (shell-command-to-string (format "git -C %s status --porcelain" root)))
         (files '()))
    ;; Parse git status output
    (dolist (line (split-string status "\n" t))
      (when (>= (length line) 4)
        (let ((code (substring line 0 2))
              (file (substring line 3)))
          (push (cons code file) files))))
    ;; Build the tree buffer
    (let ((buf (get-buffer-create "*git-tree*")))
      (with-current-buffer buf
        (let ((inhibit-read-only t))
          (erase-buffer)
          ;; Header
          (insert (propertize (format " %s\n" (file-name-nondirectory (directory-file-name root)))
                              'face '(:weight bold :foreground "#7aa2f7")))
          (insert (propertize (format " %d changed file(s)\n\n" (length files))
                              'face '(:foreground "#565f89")))
          ;; Group files by top-level directory
          (let ((tree (make-hash-table :test #'equal)))
            (dolist (f files)
              (let* ((parts (split-string (cdr f) "/" t))
                     (dir (if (> (length parts) 1) (car parts) ".")))
                (put dir (cons f (get dir tree)) tree)))
            ;; Insert tree nodes
            (maphash
             (lambda (dir entries)
               (let ((sorted (sort entries (lambda (a b) (string< (cdr a) (cdr b))))))
                 ;; Directory header
                 (insert (propertize (format "  %s %s (%d)\n"
                                             (if (string= dir ".") "" "")
                                             dir (length sorted))
                                     'face '(:weight bold :foreground "#bb9af7")))
                 ;; Files under directory
                 (dolist (entry sorted)
                   (let* ((icon (pcase (substring (car entry) 0 1)
                                  ("M" "●") ("A" "+") ("D" "✗")
                                  ("U" "!") ("?" "?") ("!" "!")
                                  (_ "·")))
                          (color (pcase (substring (car entry) 0 1)
                                   ("M" "#e0af68") ("A" "#9ece6a") ("D" "#f7768e")
                                   ("U" "#ff9e64") ("?" "#565f89") ("!" "#565f89")
                                   (_ "#565f89")))
                          (fname (file-name-nondirectory (cdr entry))))
                     (insert (propertize (format "    %s %s\n" icon fname)
                                         'face `(:foreground ,color))))))
             tree))
          (goto-char (point-min)))
        (setq-local read-only t)
        (setq-local mode-line-format nil)
        (buffer-list-update-hook
         (lambda () (setq-local cursor-type nil))))
      ;; Display in the side window
      (display-buffer buf
                      '(display-buffer-in-side-window
                        (side . right) (slot . 1) (window-width . 35)))
      buf)))

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

  (setq magit-status-sections-hook
        '(magit-insert-status-headers
          magit-insert-rebase-sequence
          magit-insert-sequencer-sequence
          magit-insert-untracked-files
          magit-insert-unstaged-changes
          magit-insert-staged-changes
          magit-insert-stashes
          magit-insert-unpushed-to-pushremote
          magit-insert-unpushed-to-upstream-or-recent
          magit-insert-unpulled-from-pushremote
          magit-insert-unpulled-from-upstream))

  (defun my/magit-status-panel-toggle ()
    "Toggle the persistent right-side git status panel."
    (interactive)
    (if-let ((win (seq-find (lambda (w)
                               (string-prefix-p "magit: " (buffer-name (window-buffer w))))
                             (window-list))))
        (delete-window win)
      (my/git-tree)))
  :bind ("C-c g" . my/magit-status-panel-toggle))

(provide 'packages/magit)
