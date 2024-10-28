#!/bin/bash
cd /var/www/html/cityfinance/cityfinance-node-api
npm install
# need to add env variables here
pm2 restart cityfinance-backend