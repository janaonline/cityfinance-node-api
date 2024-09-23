#!/bin/bash
aws s3 cp s3://cf-code-deployment/default /etc/nginx/sites-available/default
service nginx restart