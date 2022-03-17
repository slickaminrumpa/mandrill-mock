const createMailer = require('./lib/mailer');
const express = require('express');
const bodyParser = require('body-parser');
const simpleParser = require('mailparser').simpleParser;
const cron = require('node-cron');
const config = require('./config');
const createSendRawHandler = require('./lib/handler/send-raw');
const createSendHandler = require('./lib/handler/send');
const Webhook = require('./lib/webhook');
const pino = require('pino');

const logger = pino(config.logger);

(async () => {
    const mailer = await createMailer(config, logger);
    const webhook = new Webhook(config, logger);
    const app = express();
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
    app.use(bodyParser.json({limit: '50mb'}));

    app.post('/api/1.0/messages/send-raw\.json', createSendRawHandler(config, logger, simpleParser, mailer, webhook));
    app.post('/api/1.0/messages/send\.json', createSendHandler(config, logger, mailer, webhook));
    app.get('/health', (req, res) => { res.status(200).send('Ok'); });

    app.listen(config.server.port, () => {
        logger.info(`Started server at http://localhost:${config.server.port}`);
    });

    if (config.webhooksActive) {
        cron.schedule(config.webhookCronPattern, async () => {
            logger.trace('running webhook task');
           await webhook.sendWebhooks();
        });
    }
})().catch((err) => {
    logger.error(err);
})