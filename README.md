[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/slickaminrumpa/mandrill-mock)

# mandrill-mock

mocks endpoints `/messages/send.json` and `/messages/send-raw.json` of mandrill api.

delivers messages to mailhog for inspection.

can send webhook calls if configured.

## local development

### requirements

node >= 14.x

### setup 

`npm install`

### configuration

see config.js for defaults.

create config.local.js to customize config.

### how to run

`npm run start`

to spin up all docker containers in docker-compose files

`npm run docker-up-all` 

## deploy via docker  

see docker-compose.yml and docker-compose.webhook.yml for example setup.

### docker image available

https://hub.docker.com/r/slickaminrumpa/mandrill-mock

### use config env vars for docker deployment

```
MANDRILL-MOCK_mailer__host=smtp.myserver.com
MANDRILL-MOCK_mailer__port=25
MANDRILL-MOCK_webhook1__url=http://webhook:80/xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MANDRILL-MOCK_webhook1__key=abc123
```
