#!/bin/bash
export PATH="$PATH:/usr/local/nvm/versions/node/v20.17.0/bin/"
cd /var/www/html/cityfinance/cf-test-deploy-api
rm .env
mv .env_copy .env
npm i
/usr/local/nvm/versions/node/v20.17.0/bin/pm2 pm2 start server.js --name cf-node-api