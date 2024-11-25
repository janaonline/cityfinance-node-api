#!/bin/bash

export NVM_DIR="/.nvm"
export PATH="$NVM_DIR/versions/node/v20.18.0/bin:$PATH"
export PM2_HOME=/etc/.pm2


cd /var/www/html/cityfinance/cityfinance-node-api
npm install
aws secretsmanager get-secret-value --secret-id "test_cityfinance" --query SecretString --output text | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env && echo ".env file created successfully."
pm2 start server.js --name cityfinance-backend 
