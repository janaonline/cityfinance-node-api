#!/bin/bash
cd /var/www/html/cityfinance/cityfinance-node-api
npm install
pm2 restart cityfinance-backend