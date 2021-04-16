const fs = require('fs')

const localConfigFile = './config.local.js';

function parseWebhooks(config) {
    let webhooks = [];
    const pattern = /webhook\d+/;
    for (let key in config) {
        if (config.hasOwnProperty(key) && key.match(pattern)
            && typeof config[key] === 'object' && config[key] !== null && config[key] !== '' ) {
            webhooks.push(config[key]) && delete config[key];
        }
    }
    config.webhooksActive = (webhooks.length) ? config.webhooksActive || true : false;
    config.webhooks = webhooks;
    return config;
}

module.exports = parseWebhooks(require('rc')(require('./package.json').name, {
    server: {
        port: 8080
    },
    logger: {
        level: 'debug',
        prettyPrint: {
            colorize: true,
            translateTime: true
        }
    },
    mailer: {
        host: "localhost",
        port: 1025,
        secure: false
    },
    behavior: {
        spreadReceivers: true,
        deferralPrefix: 'sim.deferral@',
        softBouncePrefix: 'sim.softbounce@',
        hardBouncePrefix: 'sim.hardbounce@',
        rejectPrefix: 'sim.reject@',
        errorPrefix: 'sim.error@',
    },
    webhookCronPattern: '* * * * *',
    webhook1: {
        url: '',
        key: ''
    },
    ...(fs.existsSync(localConfigFile) ? require(localConfigFile) : {})
}));