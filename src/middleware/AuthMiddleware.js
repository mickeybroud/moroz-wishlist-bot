import UserService from '../services/UserService.js';
import logger from '../utils/Logger.js';

class AuthMiddleware {
    constructor(db, bot) {
        this.db = db;
        this.bot = bot;
        this.userService = new UserService(db);
    }

    async handle(chatId, username, text) {
        if (!username) {
            await this.bot.sendMessage(
                chatId,
                '⚠️ Для работы с ботом необходимо установить username в настройках Telegram.\n\n' +
                'Откройте: *Настройки → Редактировать профиль → Имя пользователя*'
            );
            return false;
        }

        const user = await this.userService.findByChatId(chatId);

        if (!user) {
            await this.registerNewUser(chatId, username);
        } else {
            if (user.username !== username) {
                await this.userService.updateUsername(chatId, username);
            }
        }

        return true;
    }

    async registerNewUser(chatId, username) {
        try {
            const existingUser = await this.userService.findByUsername(username);

            if (existingUser && existingUser.chat_id === null) {
                await this.userService.updateChatId(username, chatId);
            } else {
                await this.userService.create(chatId, username);
            }

            logger.info(`New user registered: ${username} (chat_id: ${chatId})`);

        } catch (error) {
            logger.error('Error registering user:', error);
            await this.bot.sendMessage(chatId, '⚠️ Ошибка при регистрации. Попробуйте позже.');
        }
    }
}

export default AuthMiddleware;