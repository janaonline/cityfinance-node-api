#!/bin/bash
su ubuntu
cd /var/www/html/cityfinance/cityfinance-node-api
pm2 start server.js --name cf-node-api