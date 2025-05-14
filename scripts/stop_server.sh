#!/bin/bash

export NVM_DIR="/.nvm"
export PATH="$NVM_DIR/versions/node/v20.18.0/bin:$PATH"
export PM2_HOME=/etc/.pm2
pm2 stop cityfinance-backend