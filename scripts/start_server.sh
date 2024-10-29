#!/bin/bash
source /root/.bashrc
cd /var/www/html/cityfinance/cityfinance-node-api
npm install
# need to add env variables here
pm2 start cityfinance-backend 
