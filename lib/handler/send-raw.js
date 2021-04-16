const common = require('./common');

module.exports = (config, logger, simpleParser, mailer, webhook) => {
    const { generateResults } = common(config);

    function generateMessages(mimeMail, receiversTo, receiversCc, receiversBcc, receivers) {
        const sender = mimeMail.from.value[0].address;
        const attachments = mimeMail.attachments;

        let message = {
            from: sender,
            to: receiversTo,
            subject: mimeMail.subject,
            text: mimeMail.text,
            html: mimeMail.html
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

        if (sender.startsWith(config.behavior.errorPrefix)) {
            return res.status(500).json({});
        }

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