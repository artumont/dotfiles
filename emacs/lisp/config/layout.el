(defun my/startup-layout ()
  "Set up panels and buffers based on launch arguments.
No args: show dashboard, no panels.
Directory arg: close Dired, show dashboard, open treemacs + magit.
File arg: open the file normally, no panels."
  (let ((dir (cl-find-if (lambda (arg)
                           (and (stringp arg)
                                (not (string-prefix-p "-" arg))
                                (file-directory-p arg)))
                         (cdr command-line-args)))
        (file (cl-find-if (lambda (arg)
                            (and (stringp arg)
                                 (not (string-prefix-p "-" arg))
                                 (file-exists-p arg)
                                 (not (file-directory-p arg))))
                          (cdr command-line-args))))
    (cond
     ;; Directory arg: close Dired, show dashboard + panels
     (dir
      (let ((main-buffer (current-buffer)))
        ;; Kill the Dired buffer Emacs opened for the directory
        (when (and main-buffer (eq (buffer-local-value 'major-mode main-buffer) 'dired-mode))
          (kill-buffer main-buffer))
        ;; Make sure dashboard buffer exists, then switch to it
        (unless (get-buffer "*dashboard*")
          (dashboard-setup-startup-hook))
        (switch-to-buffer "*dashboard*")

        ;; Left panel: treemacs
        (require 'treemacs)
        (treemacs)
        (let ((ws (treemacs-current-workspace)))
          (dolist (p (treemacs-workspace->projects ws))
            (treemacs-do-remove-project-from-workspace p t nil)))
        (treemacs-add-project-to-workspace (expand-file-name dir))

        ;; Right panel: magit
        (require 'magit)
        (my/magit-status-panel-toggle)

        (my/hide-side-window-modelines)

        (when-let ((win (get-buffer-window "*dashboard*")))
          (select-window win))))

     ;; File arg: open the file normally + panels
     (file
      (let* ((dir (file-name-directory (expand-file-name file)))
             (main-buffer (current-buffer)))
        ;; Left panel: treemacs on the file's parent directory
        (require 'treemacs)
        (treemacs)
        (let ((ws (treemacs-current-workspace)))
          (dolist (p (treemacs-workspace->projects ws))
            (treemacs-do-remove-project-from-workspace p t nil)))
        (treemacs-add-project-to-workspace (expand-file-name dir))

        ;; Right panel: magit
        (require 'magit)
        (my/magit-status-panel-toggle)

        (my/hide-side-window-modelines)

        (when-let ((win (get-buffer-window main-buffer)))
          (select-window win))))

     ;; No args: show dashboard
     (t nil))))

(add-hook 'emacs-startup-hook #'my/startup-layout)
(add-hook 'window-configuration-change-hook #'my/hide-side-window-modelines)
