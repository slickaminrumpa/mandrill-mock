const crypto = require("crypto");

module.exports = (config, logger, simpleParser, mailer, webhook) => {

    return async (req, res) => {
        if (!req.body.raw_message) {
            return res.sendStatus(400);
        }
        let parsed = await simpleParser(req.body.raw_message);
        const receiversTo = parsed.to.value.map((entry) => entry.address);
        const receiversCc = parsed.cc.value.map((entry) => entry.address);
        const receivers = receiversTo.concat(receiversCc);
        const sender = parsed.from.value[0].address;
        const attachments = parsed.attachments;

        let message = {
            from: sender,
            to: receiversTo,
            subject: parsed.subject,
            text: parsed.text,
            html: parsed.textAsHtml
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

        await mailer.sendMail(message);

        let results = [];

        for (let receiver of receivers) {
            results.push({
                receiver,
                sender,
                state: 'sent',
                rejectReason: '',
                subject: parsed.subject,
                tags: [], // TODO: set real tags
                _id: crypto.randomBytes(20).toString('hex')
            });
        }

        webhook.addResults(results);

        res.json(results.map((entry) => ({
            email: entry.receiver,
            status: entry.state,
            reject_reason: entry.rejectReason,
            _id: entry._id
        })));
    };
};