import UserService from '../services/UserService.js';
import logger from '../utils/Logger.js';

class SecurityMiddleware {
    constructor(db) {
        this.db = db;
        this.userService = new UserService(db);
    }

    async handle(chatId, username, text) {
        const user = await this.userService.findByChatId(chatId);

        if (!user) {
            return true;
        }

        if (user.is_locked) {
            await this.logBlockedAttempt(chatId, username, text);
            return false;
        }

        return true;
    }

    async logBlockedAttempt(chatId, username, text) {
        try {
            await this.db.query(
                'INSERT INTO command_logs (user_id, username, command, created_at) VALUES (?, ?, ?, NOW())',
                [chatId, username || 'unknown', `[BLOCKED] ${text}`]
            );
        } catch (error) {
            logger.error('Failed to log blocked attempt:', error);
        }
    }
}

export default SecurityMiddleware;