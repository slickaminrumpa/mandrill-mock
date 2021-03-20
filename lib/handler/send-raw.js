const crypto = require("crypto");

module.exports = (config, logger, simpleParser, mailer, webhook) => {

    function generateResults(sender, subject, receivers, subaccount) {
        return receivers.map((receiver) => {
            const baseData = {
                receiver,
                sender,
                subject,
                tags: [], // TODO: set real tags
                metadata: {
                    user_id: 111
                },
                subaccount,
                _id: crypto.randomBytes(20).toString('hex')
            };
            if (receiver.startsWith(config.behavior.deferralPrefix)) {
                return {
                    ...baseData,
                    event: 'deferral',
                    state: 'deferred',
                    smtp_events: [{
                        destination_ip: '127.0.0.1',
                        diag: '451 4.3.5 Temporarily unavailable, try again later.',
                        source_ip: '127.0.0.1',
                        ts: Date.now(),
                        type: 'deferred',
                        size: 0
                    }]
                }
            }
            if (receiver.startsWith(config.behavior.softBouncePrefix)) {
                return {
                    ...baseData,
                    event: 'soft_bounce',
                    state: 'soft-bounced',
                    bounce_description: 'mailbox_full',
                    bgtools_code: 22,
                    diag: 'smtp;552 5.2.2 Over Quota'
                }
            }
            if (receiver.startsWith(config.behavior.hardBouncePrefix)) {
                return {
                    ...baseData,
                    event: 'hard_bounce',
                    state: 'bounced',
                    bounce_description: "bad_mailbox",
                    bgtools_code: 10,
                    diag: "smtp;550 5.1.1 The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos or unnecessary spaces."
                }
            }
            if (receiver.startsWith(config.behavior.rejectPrefix)) {
                return {
                    ...baseData,
                    event: 'reject',
                    state: 'rejected'
                }
            }
            return {
                ...baseData,
                event: 'send',
                state: 'sent'
            }
        });
    }

    function generateMessages(mimeMail, receiversTo, receiversCc, receiversBcc, receivers) {
        const sender = mimeMail.from.value[0].address;
        const attachments = mimeMail.attachments;

        let message = {
            from: sender,
            to: receiversTo,
            subject: mimeMail.subject,
            text: mimeMail.text,
            html: mimeMail.textAsHtml
        };

        if (attachments && attachments.length) {
            message.attachments = attachments.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType
            }));
        }

        if (receiversCc.length) {
            message.cc = receiversCc;
        }

        if (receiversBcc.length) {
            message.bcc = receiversBcc;
        }

        if (config.behavior.spreadReceivers) {
            return receivers.filter((receiver) => {
                return !(receiver.startsWith(config.behavior.softBouncePrefix)
                    || receiver.startsWith(config.behavior.hardBouncePrefix)
                    || receiver.startsWith(config.behavior.rejectPrefix))
            }).map(() => {
                return message;
            });
        }

        return [message];
    }

    return async (req, res) => {
        if (!req.body.raw_message) {
            return res.sendStatus(400);
        }
        let mimeMail = await simpleParser(req.body.raw_message);
        const receiversTo = mimeMail.to.value.map((entry) => entry.address);
        const receiversCc = (mimeMail.cc && mimeMail.cc.value) ? mimeMail.cc.value.map((entry) => entry.address) : [];
        const receiversBcc = (mimeMail.bcc && mimeMail.bcc.value) ? mimeMail.bcc.value.map((entry) => entry.address) : [];
        const receivers = [...receiversTo, ...receiversCc, ...receiversBcc];
        const sender = mimeMail.from.value[0].address;
        let subaccount = null;

        if (mimeMail.headers.has('x-mc-subaccount')) {
            subaccount = mimeMail.headers.get('x-mc-subaccount');
        }

        let messages = generateMessages(mimeMail, receiversTo, receiversCc, receiversBcc, receivers);

        for (const message of messages) {
            await mailer.sendMail(message);
        }

        let results = generateResults(sender, mimeMail.subject, receivers, subaccount);
        webhook.addResults(results);
        res.json(results.map((result) => {
            let entry = {
                email: result.receiver,
                status: result.state,
                _id: result._id
            };
            switch(result.event) {
                case 'send':
                    break;
                case 'deferral':
                    break;
                case 'soft_bounce':
                    entry.reject_reason = 'soft_bounce';
                    break;
                case 'hard_bounce':
                    entry.reject_reason = 'hard_bounce';
                    break;
                case 'reject':
                    break;
            }
            return entry;
        }));
    };
};