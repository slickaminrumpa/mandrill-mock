const crypto = require("crypto");

module.exports = (config) => {
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

    return {
        generateResults
    }
};