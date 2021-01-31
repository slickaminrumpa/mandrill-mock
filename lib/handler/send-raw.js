

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

        let message = {
            from: sender,
            to: receiversTo,
            subject: parsed.subject,
            text: parsed.text,
            html: parsed.textAsHtml
        };

        if (receiversCc.length) {
            message.cc = receiversCc;
        }

        await mailer.sendMail(message);

        if (config.webhooksActive) {
            for (let receiver of receivers) {
                webhook.addReceiverToPayload(receiver);
            }
            webhook.setSubject(parsed.subject);
            webhook.setSender(sender);
            webhook.setTags([]); // TODO: set real tags
        }

        res.json([
            {
                "email": "recipient.email@example.com",
                "status": "sent",
                "reject_reason": "hard-bounce",
                "_id": "abc123abc123abc123abc123"
            }
        ]);
    };
};