const axios = require('axios');
const crypto = require("crypto");

class Webhook {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.webhookResults = [];
    }

    generateWebhookPayload(results) {
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

        return results.map(
            (result) => {
                let entry = {
                    ts: Date.now(),
                    event: result.event,
                    _id: crypto.randomBytes(20).toString('hex'),
                    msg: {
                        ts: Date.now(),
                        subject: result.subject,
                        email: result.receiver,
                        sender: result.sender,
                        tags: result.tags,
                        state: result.state,
                        _id: result._id
                    }
                };
                if (result.subaccount) {
                    entry.msg.subaccount = result.subaccount;
                }
                switch(result.event) {
                    case 'send':
                        break;
                    case 'deferral':
                        entry.msg.smtp_events = result.smtp_events;
                        break;
                    case 'soft_bounce':
                        entry.msg.bounce_description = result.bounce_description;
                        entry.msg.bgtools_code = result.bgtools_code;
                        entry.msg.diag = result.diag;
                        break;
                    case 'hard_bounce':
                        entry.msg.bounce_description = result.bounce_description;
                        entry.msg.bgtools_code = result.bgtools_code;
                        entry.msg.diag = result.diag;
                        break;
                    case 'reject':
                        break;
                }
                return entry;
            }
        );
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
        if (!this.webhookResults.length) {
            this.logger.trace('no webhook payload - nothing to do');
            return;
        }

        const webhookPayload = this.generateWebhookPayload(this.webhookResults);



        const params = new URLSearchParams()
        params.append('mandrill_events', JSON.stringify(webhookPayload));

        for (let webhook of this.config.webhooks) {
            try {
                await axios.post(webhook.url, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Mandrill-Signature': this.generateWebhookSignature(webhook.key, webhook.url, {mandrill_events: webhookPayload})
                    }
                });
                this.logger.debug('webhook sent');
                this.resetData();
            } catch (e) {
                this.logger.error(e);
            }
        }
    }

    addResults(results) {
        this.webhookResults = [...this.webhookResults, ...results];
    }

    resetData() {
        this.webhookResults = [];
    }
}

module.exports = Webhook;