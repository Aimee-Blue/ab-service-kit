#!/bin/bash

if [[ 'v1.4.x' =~ ^(master|alpha|beta|v[0-9]+\.x$|v[0-9]+\.x\.x$|v[0-9]+\.[0-9]+\.x)$ ]]; then
  echo 'YES';
else
  echo 'NO';
fi
