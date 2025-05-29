#!/bin/sh

echo "Starting MongoDB..."
mongod --fork --logpath /var/log/mongodb.log

echo "Waiting for MongoDB to start..."
sleep 10

echo "Starting Node.js application..."
npm start 
