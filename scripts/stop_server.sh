#!/bin/bash
#export PATH="$PATH:/usr/local/nvm/versions/node/v20.18.0/bin/"
cd /var/www/html/cityfinance/cityfinance-node-api
npm i 
/usr/local/nvm/versions/node/v20.18.0/bin/pm2 stop all