import mysql from 'mysql2/promise';
import getConfig from '../config/config.js';  // ИЗМЕНИТЬ ЭТУ СТРОКУ
import logger from '../utils/Logger.js';

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            // ПОЛУЧИТЬ конфиг внутри метода
            const config = getConfig();  // ДОБАВИТЬ ЭТУ СТРОКУ
            
            this.pool = mysql.createPool({
                host: config.database.host,  // теперь config - локальная переменная
                port: config.database.port,
                user: config.database.user,
                password: config.database.password,
                database: config.database.database,
                charset: config.database.charset,
                waitForConnections: config.database.waitForConnections,
                connectionLimit: config.database.connectionLimit,
                queueLimit: config.database.queueLimit,
                enableKeepAlive: config.database.enableKeepAlive,
                keepAliveInitialDelay: config.database.keepAliveInitialDelay
            });

            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            logger.info('Database connection established');
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Database query error:', { sql, error: error.message });
            throw error;
        }
    }

    async queryOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0] || null;
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            logger.info('Database connection closed');
        }
    }
}

export default Database;