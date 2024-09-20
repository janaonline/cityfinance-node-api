#!/bin/bash
su ubuntu
cd /var/www/html/cityfinance/cityfinance-node-api
mv .env_copy .env
npm i
/usr/local/nvm/versions/node/v20.17.0/bin/pm2 pm2 start server.js --name cf-node-api