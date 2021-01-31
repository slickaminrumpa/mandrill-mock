const axios = require('axios');
const crypto = require("crypto");

class Webhook {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.webhookReceivers = [];
        this.webhookSubject = '';
        this.webhookSender = '';
        this.webhookTags = [];
    }

    generateWebhookPayload(event, subject, receivers, sender, tags, state) {
        /*
            {
              "mandrill_events": [
                {
                  "event": "open",
                  "msg": {
                    "ts": 1365109999,
                    "subject": "Roses Are Red, Violets Are On Sale",
                    "email": "flowerfriend@example.com",
                    "sender": "hello@eiffelflowers.biz",
                    "tags": ["violets"],
                    "state": "sent",
                    "metadata": {
                      "user_id": 111
                    },
                    "_id": "7761629",
                    "_version": "123"
                    # trimmed for brevity
                  }
                }
              ]
            }
        */

        let payloadEvents = [];
        for (let receiver of receivers) {
            payloadEvents.push({
                event: event,
                msg: {
                    ts: Date.now(),
                    subject,
                    email: receiver,
                    sender,
                    tags,
                    state,
                    _id: crypto.randomBytes(20).toString('hex'),

                }
            });
        }
        return {mandrill_events: payloadEvents};
    }

    generateWebhookSignature(webhookKey, url, params) {
        let signedData = url;
        const paramKeys = Object.keys(params);
        paramKeys.sort();
        paramKeys.forEach(function (key) {
            signedData += key + params[key];
        });

        let hmac = crypto.createHmac('sha1', webhookKey);
        hmac.update(signedData);
        return hmac.digest('base64');
    }

    async sendWebhooks() {
        if (!this.webhookReceivers.length) {
            this.logger.debug('no webhook payload - nothing to do');
            return;
        }

        const webhookPayload = this.generateWebhookPayload(
            'send',
            this.webhookSubject,
            this.webhookReceivers,
            this.webhookSender,
            this.webhookTags,
            'sent');

        this.resetData();

        for (let webhook of this.config.webhooks) {
            try {
                let result = await axios.post(webhook.url, webhookPayload, {
                    headers: {
                        'X-Mandrill-Signature': this.generateWebhookSignature(webhook.key, webhook.url, webhookPayload)
                    }
                });
                this.logger.debug('webhook sent');
            } catch (e) {
                this.logger.error(e);
            }
        }
    }

    addReceiverToPayload(receiver) {
        this.webhookReceivers.push(receiver);
    }

    setSubject(subject) {
        this.webhookSubject = subject;
    }

    setSender(sender) {
        this.webhookSender = sender;
    }

    setTags(tags) {
        this.webhookTags = tags;
    }

    resetData() {
        this.webhookReceivers = [];
        this.webhookSubject = '';
        this.webhookSender = '';
        this.webhookTags = [];
    }
}

module.exports = Webhook;