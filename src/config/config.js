// src/config/config.js
export default function getConfig() {
  return {
    bot: {
      token: process.env.BOT_TOKEN,
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      }
    },

    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    },

    admin: {
      groupChatId: process.env.ADMIN_GROUP_CHAT_ID
    },

    limits: {
      wishLength: 500,
      poemLength: 20,
      giftPrice: 3000
    },

    logging: {
      level: process.env.LOG_LEVEL || 'info',
      console: process.env.NODE_ENV !== 'production',
      files: {
        error: 'logs/error.log',
        combined: 'logs/combined.log'
      }
    },

    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,

    validate() {
      const required = [
        'BOT_TOKEN',
        'DB_HOST',
        'DB_NAME',
        'DB_USER'
      ];

      const missing = required.filter(key => !process.env[key]);

      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missing.join(', ')}\n` +
          'Please check your .env file.'
        );
      }

      return true;
    }
  };
}