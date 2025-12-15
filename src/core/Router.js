import logger from '../utils/Logger.js';

class Router {
    constructor(db, bot) {
        this.db = db;
        this.bot = bot;
        this.commands = new Map();
        this.stateHandler = null;
    }

    registerCommands(commandHandler) {
        this.commands.set('/start', commandHandler.handleStart.bind(commandHandler));
        this.commands.set('/wishes', commandHandler.handleWishes.bind(commandHandler));
        this.commands.set('/wish', commandHandler.handleWish.bind(commandHandler));
        this.commands.set('/poem', commandHandler.handlePoem.bind(commandHandler));
        this.commands.set('/info', commandHandler.handleInfo.bind(commandHandler));
        this.commands.set('/admin', commandHandler.handleAdmin.bind(commandHandler));
        this.commands.set('/ban', commandHandler.handleBan.bind(commandHandler));
        this.commands.set('/unban', commandHandler.handleUnban.bind(commandHandler));
        this.commands.set('/op', commandHandler.handleOp.bind(commandHandler));
        this.commands.set('/deop', commandHandler.handleDeop.bind(commandHandler));
        this.commands.set('/users', commandHandler.handleUsers.bind(commandHandler));
        this.commands.set('/talk', commandHandler.handleTalk.bind(commandHandler));
        this.commands.set('/talkall', commandHandler.handleTalkAll.bind(commandHandler));
    }

    registerStateHandler(stateHandler) {
        this.stateHandler = stateHandler;
    }

    async handle(chatId, username, text, message) {
        if (!text) return;

        const command = this.extractCommand(text);

        if (command && this.commands.has(command)) {
            // Выполнение команды
            await this.executeCommand(command, chatId, username, text, message);
        } else if (this.stateHandler) {
            // Обработка состояния
            await this.stateHandler.handle(chatId, username, text);
        }
    }

    extractCommand(text) {
        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase();
        return command.startsWith('/') ? command : null;
    }

    async executeCommand(command, chatId, username, text, message) {
        try {
            await this.logCommand(chatId, username, text);

            const handler = this.commands.get(command);
            await handler(chatId, username, text, message);

        } catch (error) {
            logger.error(`Command execution error [${command}]:`, error);
            await this.bot.sendMessage(chatId, '⚠️ Ошибка выполнения команды.');
        }
    }

    async logCommand(chatId, username, command) {
        try {
            await this.db.query(
                'INSERT INTO command_logs (user_id, username, command, created_at) VALUES (?, ?, ?, NOW())',
                [chatId, username || 'unknown', command]
            );
        } catch (error) {
            logger.error('Failed to log command:', error);
        }
    }
}

export default Router;