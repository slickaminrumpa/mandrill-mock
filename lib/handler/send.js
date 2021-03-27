const common = require('./common');

module.exports = (config, logger, mailer, webhook) => {
    const { generateResults } = common(config);

    function generateMessages(msg) {
        let message = {
            from: msg.from_email,
            to: msg.to.filter((receiver) => receiver.type === 'to').map((receiver) => receiver.email),
            subject: msg.subject,
            text: msg.text,
            html: msg.html
        };

        if (msg.attachments && msg.attachments.length) {
            message.attachments = msg.attachments.map((attachment) => ({
                filename: attachment.name,
                content: attachment.content,
                contentType: attachment.type,
                encoding: 'base64'
            }));
        }

        const receiversCc = msg.to
            .filter((receiver) => receiver.type === 'cc')
            .map((receiver) => receiver.email);
        if (receiversCc.length) {
            message.cc = receiversCc;
        }

        const receiversBcc = msg.to
            .filter((receiver) => receiver.type === 'bcc')
            .map((receiver) => receiver.email);
        if (receiversBcc.length) {
            message.bcc = receiversBcc;
        }

        if (config.behavior.spreadReceivers) {
            return msg.to.filter((receiver) => {
                return !(receiver.email.startsWith(config.behavior.softBouncePrefix)
                    || receiver.email.startsWith(config.behavior.hardBouncePrefix)
                    || receiver.email.startsWith(config.behavior.rejectPrefix))
            }).map(() => {
                return message;
            });
        }

        return [message];
    }

    return async (req, res) => {
        if (!req.body.message) {
            return res.sendStatus(400);
        }

        // let payload = {
        //     "key": "",
        //     "message": {
        //         "html": "",
        //         "text": "",
        //         "subject": "",
        //         "from_email": "",
        //         "from_name": "",
        //         "to": [],
        //         "headers": {},
        //         "tags": [],
        //         "subaccount": "",
        //         "attachments": []
        //     }
        // };

        let messages = generateMessages(req.body.message);

        for (const message of messages) {
            await mailer.sendMail(message);
        }

        let results = generateResults(
            req.body.message.from_email,
            req.body.message.subject,
            req.body.message.to.map((receiver) => receiver.email),
            req.body.message.subaccount
        );
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