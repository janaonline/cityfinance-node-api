#!/bin/bash

if [ -d /var/www/html/cityfinance/cityfinance-node-api ]; then
  echo "Deleting /var/www/html/cityfinance/cityfinance-node-api..."
  rm -rf /var/www/html/cityfinance/cityfinance-node-api
fi
