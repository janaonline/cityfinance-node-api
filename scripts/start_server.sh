#!/bin/bash

rm -rf /var/www/html/cityfinance/cityfinance-node-api/
mkdir -p /var/www/html/cityfinance/cityfinance-node-api/

mv /var/www/html/cityfinance/node-api-deploy/.* /var/www/html/cityfinance/cityfinance-node-api/ 2>/dev/null
mv /var/www/html/cityfinance/node-api-deploy/* /var/www/html/cityfinance/cityfinance-node-api/

rm -rf /var/www/html/cityfinance/node-api-deploy/

export NVM_DIR="/.nvm"
export PATH="$NVM_DIR/versions/node/v20.18.0/bin:$PATH"
export PM2_HOME=/etc/.pm2

cd /var/www/html/cityfinance/cityfinance-node-api
npm install
# need to add env variables here
pm2 start cityfinance-backend 
