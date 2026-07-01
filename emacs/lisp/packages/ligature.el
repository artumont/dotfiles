;;; ligature.el --- Programming ligatures via HarfBuzz composition  -*- lexical-binding: t; -*-

(use-package ligature
  :straight (ligature :type git :host github :repo "mickeynp/ligature.el")
  :demand t
  :config
  (ligature-set-ligatures 'prog-mode
    '("|||>" "<|||" "<==>" "<!--" "####" "~~>" "==>" "-->" "->>" "=>" "->"
      "==" "===" "====" "=>=" "<=>" "<=" "<==" "<====" "##" "###" "####"
      "{-" "-}" "::" ":::" ":=" "!=" "!==" "!!" "?:" "?." "::=" "=:=" "=:="
      "&&" "&&&" "||" "|||" "++" "+++" "[|" "|]" "{|" "|}" "++="
      "/=" "/==" "_|_" "/*" "*/" "///" "<-" "<<-" "<~" "<~~" "~>" "~~"
      "<>" "<<" ">>" "<<<" ">>>" "<<=" ">>=" "<->" "..." ".." "..<"))

  (global-ligature-mode t))

(provide 'packages/ligature)
