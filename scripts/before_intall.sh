#!/bin/bash

if [ -d /var/www/html/cityfinance/citifinance-node-api ]; then
  echo "Deleting /var/www/html/cityfinance/citifinance-node-api..."
  rm -rf /var/www/html/cityfinance/citifinance-node-api
fi
