#!/bin/sh
while true
do
    npx squid-typeorm-migration apply \
        && npm run processor:start \
        && break
done
