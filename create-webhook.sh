#!/bin/sh

curl --location --request POST 'http://127.0.0.1:8084/token' --header 'Content-Type: application/json' --data-raw '{"uuid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
