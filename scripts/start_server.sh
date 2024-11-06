#!/bin/bash

export NVM_DIR="/.nvm"
export PATH="$NVM_DIR/versions/node/v20.18.0/bin:$PATH"
export PM2_HOME=/etc/.pm2

cd /var/www/html/cityfinance/cityfinance-node-api
npm install
# need to add env variables here
pm2 start --name cityfinance-backend 
