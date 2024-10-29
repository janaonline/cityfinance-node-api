#!/bin/bash

rm -rf /var/www/html/cityfinance/cityfinance-node-api/
mkdir -p /var/www/html/cityfinance/cityfinance-node-api/

mv /var/www/html/cityfinance/node-api-deploy/.* /var/www/html/cityfinance/cityfinance-node-api/ 2>/dev/null
mv /var/www/html/cityfinance/node-api-deploy/* /var/www/html/cityfinance/cityfinance-node-api/

rm -rf /var/www/html/cityfinance/node-api-deploy/