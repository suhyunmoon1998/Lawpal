#!/bin/zsh
set -euo pipefail

cd "/Users/soohyunmun/lawpel-app"
/opt/homebrew/bin/npm run worker:email-import
