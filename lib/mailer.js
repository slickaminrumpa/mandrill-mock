const nodemailer = require('nodemailer');

module.exports = async (config, logger) => {
    const transporter = nodemailer.createTransport(config.mailer);

    await transporter.verify(function(error, success) {
        if (error) {
            logger.error(error);
            return process.exit(1);
        } else {
            logger.info("Server is ready to take our messages");
        }
    });

    return {
        async sendMail(message) {
            await transporter.sendMail(message, (err, info) => {
                if (err) {
                    logger.error('Error occurred. ' + err.message);
                    return process.exit(1);
                }
                logger.debug('Message sent: %s', info.messageId);
            });
        }
    }
};