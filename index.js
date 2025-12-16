import dotenv from 'dotenv';

dotenv.config({ 
    path: process.env.ENV_PATH || '/home/dev/moroz-wishlist-bot/.env' 
});

import express from 'express';
import getConfig from './src/config/config.js';
import TelegramBot from './src/core/TelegramBot.js';
import Database from './src/core/Database.js';
import Router from './src/core/Router.js';
import CommandHandler from './src/handlers/CommandHandler.js';
import StateHandler from './src/handlers/StateHandler.js';
import { AuthMiddleware, SecurityMiddleware } from './src/middleware/index.js';
import logger from './src/utils/Logger.js';

class SantaBot {
    constructor() {
        this.app = express();
        this.bot = null;
        this.db = null;
        this.router = null;
        this.webhookPath = `/bot/${process.env.WEBHOOK_SECRET}`;
    }

    async init() {
        try {
            logger.info('🎅 Starting Santa Bot with Webhook...');

            const config = getConfig();
            config.validate();

            this.db = new Database();
            await this.db.connect();
            logger.info('✅ Database connected');

            this.bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
            logger.info('✅ Telegram Bot initialized');

            this.setupExpress();

            this.setupRouter();

            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                logger.info(`🚀 Server running on port ${port}`);
                logger.info(`📝 Webhook path: ${this.webhookPath}`);
                logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            });

            await this.bot.deleteWebhook();
            await this.setupWebhook();

        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    setupExpress() {

        this.app.use((req, res, next) => {
            logger.info(`📥 ${req.method} ${req.originalUrl}`);
            next();
        });

        this.app.use(express.json());

        this.app.post(this.webhookPath, async (req, res) => {
            try {
                const update = req.body;
                res.sendStatus(200);
                await this.handleUpdate(update);
                
            } catch (error) {
                logger.error('Error processing webhook:', error);
                res.sendStatus(500);
            }
        });

        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });

        this.app.use((req, res) => {
            res.status(404).send('Not Found');
        });
    }

    setupRouter() {
        const authMiddleware = new AuthMiddleware(this.db, this.bot);
        const securityMiddleware = new SecurityMiddleware(this.db);

        this.router = new Router(this.db, this.bot);
        
        const commandHandler = new CommandHandler(this.db, this.bot);
        const stateHandler = new StateHandler(this.db, this.bot);
        
        this.router.registerCommands(commandHandler);
        this.router.registerStateHandler(stateHandler);

        this.authMiddleware = authMiddleware;
        this.securityMiddleware = securityMiddleware;
    }

    async handleUpdate(update) {
        try {
            if (!update) return;

            if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
                return;
            }

            if (update.my_chat_member) {
                await this.handleChatMemberUpdate(update.my_chat_member);
                return;
            }

            const message = update.message;
            if (!message) return;

            if (message.chat.type !== 'private') {
                const ChatService = (await import('./src/services/ChatService.js')).default;
                const chatService = new ChatService(this.db);
                
                await chatService.saveChat(
                    message.chat.id,
                    message.chat.type,
                    message.chat.title
                );
                return;
            }

            const chatId = message.chat.id;
            const username = message.from?.username;
            const text = message.text;

            const authPassed = await this.authMiddleware.handle(chatId, username, text);
            if (!authPassed) return;

            const securityPassed = await this.securityMiddleware.handle(chatId, username, text);
            if (!securityPassed) return;

            const state = await this.getWishServiceState(chatId);

            if (state && state === 'talkall_waiting') {
                await this.handleTalkAllMessage(chatId, message);
                return;
            }
            
            if (state && state.startsWith('talk_waiting_')) {
                await this.handleTalkMediaMessage(chatId, message, state);
                return;
            }

            await this.router.handle(chatId, username, text, message);

        } catch (error) {
            logger.error('Error processing update:', error);
            
            if (update?.message?.chat?.id) {
                await this.bot.sendMessage(
                    update.message.chat.id,
                    '⚠️ Произошла внутренняя ошибка. Администраторы уведомлены.'
                );
            }
        }
    }

    async handleTalkAllMessage(chatId, message) {
        try {
            if (message.text === '/cancel') {
                await this.resetUserState(chatId);
                await this.bot.sendMessage(chatId, '❌ Рассылка отменена.');
                return;
            }

            const users = await this.db.query(
                'SELECT DISTINCT chat_id FROM users WHERE chat_id IS NOT NULL'
            );

            if (users.length === 0) {
                await this.bot.sendMessage(chatId, '❌ Нет пользователей для рассылки.');
                await this.resetUserState(chatId);
                return;
            }

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Да, отправить всем', callback_data: 'talkall_confirm' },
                        { text: '❌ Отмена', callback_data: 'talkall_cancel' }
                    ]
                ]
            };

            await this.db.query(
                `INSERT INTO pending_broadcasts (admin_chat_id, message_data, created_at) 
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE message_data = VALUES(message_data), created_at = NOW()`,
                [chatId, JSON.stringify(message)]
            );

            await this.bot.sendMessage(
                chatId,
                `📊 <b>Подтверждение рассылки</b>\n\n` +
                `Сообщение будет отправлено <b>${users.length} пользователям</b>.\n\n` +
                `Вы уверены?`,
                { reply_markup: keyboard }
            );

        } catch (error) {
            logger.error('Error in handleTalkAllMessage:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при подготовке рассылки.');
        }
    }

    async getWishServiceState(chatId) {
        try {
            const result = await this.db.queryOne(
                'SELECT state FROM wishes WHERE chat_id = ? LIMIT 1',
                [chatId]
            );
            return result?.state || null;
        } catch (error) {
            logger.error('Error getting user state:', error);
            return null;
        }
    }

    async handleTalkMediaMessage(chatId, message, state) {
        logger.info('Processing talk media message:', {
            chatId,
            state,
            hasText: !!message.text,
            hasPhoto: !!message.photo,
            hasVideo: !!message.video,
            hasAudio: !!message.audio,
            hasVoice: !!message.voice,
            hasDocument: !!message.document
        });

        const targetChatId = state.replace('talk_waiting_', '');
        
        try {
            const ChatService = (await import('./src/services/ChatService.js')).default;
            const chatService = new ChatService(this.db);
            const targetChat = await chatService.getChatById(targetChatId);
            
            if (!targetChat) {
                await this.bot.sendMessage(chatId, '❌ Чат не найден.');
                return;
            }

            let sent = false;

            if (message.text) {
                if (message.text === '/cancel') {
                    await this.resetUserState(chatId);
                    await this.bot.sendMessage(chatId, '❌ Отправка сообщения отменена.');
                    return;
                }
                
                await this.bot.sendMessage(targetChatId, message.text);
                sent = true;
            }
            
            if (message.photo) {
                const photo = message.photo[message.photo.length - 1]; // Лучшее качество
                await this.bot.sendPhoto(targetChatId, photo.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }
            
            if (message.video) {
                await this.bot.sendVideo(targetChatId, message.video.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }
            
            if (message.audio) {
                await this.bot.sendAudio(targetChatId, message.audio.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }
            
            if (message.voice) {
                await this.bot.sendVoice(targetChatId, message.voice.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }
            
            if (message.document) {
                await this.bot.sendDocument(targetChatId, message.document.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }
            
            if (message.sticker) {
                await this.bot.sendSticker(targetChatId, message.sticker.file_id);
                sent = true;
            }
            
            if (message.animation) {
                await this.bot.sendAnimation(targetChatId, message.animation.file_id, {
                    caption: message.caption || ''
                });
                sent = true;
            }

            if (sent) {
                await this.bot.sendMessage(chatId, '✅ Сообщение успешно отправлено в чат "' + targetChat.chat_title + '"!');
                await this.resetUserState(chatId);
            } else {
                await this.bot.sendMessage(chatId, '❌ Неподдерживаемый тип сообщения.');
            }
            
        } catch (error) {
            logger.error('Failed to send media message to chat:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Не удалось отправить сообщение. Возможно бот был удалён из чата.'
            );
        }
    }

    async resetUserState(chatId) {
        try {
            await this.db.query(
                "UPDATE wishes SET state = 'wishes_collected' WHERE chat_id = ?",
                [chatId]
            );
        } catch (error) {
            logger.error('Error resetting user state:', error);
        }
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;
        
        await this.bot.answerCallbackQuery(callbackQuery.id);

        if (data === 'talkall_confirm') {
            await this.bot.deleteMessage(chatId, messageId);
            await this.executeBroadcast(chatId);
            return;
        }

        if (data === 'talkall_cancel') {
            await this.bot.deleteMessage(chatId, messageId);
            await this.resetUserState(chatId);
            await this.db.query('DELETE FROM pending_broadcasts WHERE admin_chat_id = ?', [chatId]);
            await this.bot.sendMessage(chatId, '❌ Рассылка отменена.');
            return;
        }
        
        if (data.startsWith('talk_select_')) {
            const targetChatId = data.replace('talk_select_', '');
            
            const WishService = (await import('./src/services/WishService.js')).default;
            const wishService = new WishService(this.db);
            await wishService.setUserState(chatId, `talk_waiting_${targetChatId}`);
            
            await this.bot.deleteMessage(chatId, messageId);
            
            const ChatService = (await import('./src/services/ChatService.js')).default;
            const chatService = new ChatService(this.db);
            const targetChat = await chatService.getChatById(targetChatId);
            
            await this.bot.sendMessage(
                chatId,
                `📝 Отправьте сообщение для чата "${targetChat.chat_title}":\n\n` +
                `Вы можете отправить:\n` +
                `• Текст\n` +
                `• Фото (с подписью или без)\n` +
                `• Видео (с подписью или без)\n` +
                `• Аудио\n` +
                `• Документ\n\n` +
                `Напишите /cancel для отмены.`
            );
        }

        if (data.startsWith('change_wish_')) {
            const wishNumber = parseInt(data.replace('change_wish_', ''));
            
            const WishService = (await import('./src/services/WishService.js')).default;
            const wishService = new WishService(this.db);
            
            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendMessage(chatId, `Введите новое желание для позиции ${wishNumber}:`);
            await wishService.setUserState(chatId, `changing_wish_${wishNumber}`);
        }
    }

    async executeBroadcast(adminChatId) {
        try {
            const broadcast = await this.db.queryOne(
                'SELECT message_data FROM pending_broadcasts WHERE admin_chat_id = ?',
                [adminChatId]
            );

            if (!broadcast) {
                await this.bot.sendMessage(adminChatId, '❌ Сообщение для рассылки не найдено.');
                return;
            }

            const message = JSON.parse(broadcast.message_data);

            const users = await this.db.query(
                'SELECT DISTINCT chat_id FROM users WHERE chat_id IS NOT NULL'
            );

            await this.bot.sendMessage(
                adminChatId,
                `🚀 Начинаю рассылку ${users.length} пользователям...`
            );

            let successCount = 0;
            let failCount = 0;

            for (const user of users) {
                try {
                    if (user.chat_id === adminChatId) {
                        continue;
                    }

                    if (message.text) {
                        await this.bot.sendMessage(user.chat_id, message.text);
                    } else if (message.photo) {
                        const photo = message.photo[message.photo.length - 1];
                        await this.bot.sendPhoto(user.chat_id, photo.file_id, {
                            caption: message.caption || ''
                        });
                    } else if (message.video) {
                        await this.bot.sendVideo(user.chat_id, message.video.file_id, {
                            caption: message.caption || ''
                        });
                    } else if (message.document) {
                        await this.bot.sendDocument(user.chat_id, message.document.file_id, {
                            caption: message.caption || ''
                        });
                    }

                    successCount++;

                    await new Promise(resolve => setTimeout(resolve, 50));

                } catch (error) {
                    logger.error(`Failed to send broadcast to ${user.chat_id}:`, error);
                    failCount++;
                }
            }

            await this.bot.sendMessage(
                adminChatId,
                `✅ Рассылка завершена!\n\n` +
                `📤 Отправлено: ${successCount}\n` +
                `❌ Ошибок: ${failCount}\n\n` +
                `🚦 Администраторам сообщения не отправляются.`
            );

            await this.resetUserState(adminChatId);
            await this.db.query('DELETE FROM pending_broadcasts WHERE admin_chat_id = ?', [adminChatId]);

        } catch (error) {
            logger.error('Error executing broadcast:', error);
            await this.bot.sendMessage(adminChatId, '❌ Ошибка при выполнении рассылки.');
        }
    }

    async handleChatMemberUpdate(chatMember) {
        const ChatService = (await import('./src/services/ChatService.js')).default;
        const UserService = (await import('./src/services/UserService.js')).default;
        
        const chatService = new ChatService(this.db);
        const userService = new UserService(this.db);
        
        const chat = chatMember.chat;
        const newStatus = chatMember.new_chat_member.status;
        const addedByUser = chatMember.from;
        
        if (newStatus === 'member' || newStatus === 'administrator') {

            const isAdmin = await userService.isAdmin(addedByUser.id);
            
            if (!isAdmin) {
                logger.warn(`Non-admin user @${addedByUser.username} (${addedByUser.id}) tried to add bot to chat: ${chat.title} (${chat.id})`);

                try {
                    await this.bot.leaveChat(chat.id);
                    logger.info(`Bot left unauthorized chat: ${chat.title} (${chat.id})`);

                    try {
                        await this.bot.sendMessage(
                            addedByUser.id,
                            `⛔ У вас нет прав для добавления бота в группы.\n\n` +
                            `Только администраторы бота могут добавлять его в чаты.`
                        );
                    } catch (e) {
                        logger.error('Failed to notify user about insufficient rights:', e);
                    }
                    
                } catch (error) {
                    logger.error('Failed to leave unauthorized chat:', error);
                }
                
                return;
            }

            await chatService.saveChat(
                chat.id,
                chat.type,
                chat.title,
                addedByUser.id,
                addedByUser.username
            );
            
            logger.info(`Bot added to chat: ${chat.title} (${chat.id}) by admin @${addedByUser.username}`);

            await this.bot.sendMessage(
                chat.id,
                `🎅 Привет! Я Дед Мороз.\n\n` +
                `Скоро придёт Новый год и я принимаю ваши пожелания теперь в электронном формате. Пишите мне лично в сообщения и возможно чудо случится!`
            );

            await this.bot.sendMessage(
                addedByUser.id,
                `✅ Бот успешно добавлен в чат "${chat.title}"`
            );
            
        } else if (newStatus === 'left' || newStatus === 'kicked') {
            await chatService.deactivateChat(chat.id);
            logger.info(`Bot removed from chat: ${chat.title} (${chat.id})`);
        }
    }

    async setupWebhook() {
        try {
            const webhookUrl = `${process.env.WEBHOOK_URL}${this.webhookPath}`;
            
            logger.info(`Setting webhook: ${webhookUrl}`);
            
            const result = await this.bot.setWebhook(webhookUrl, {
                secret_token: process.env.WEBHOOK_SECRET_TOKEN
            });
            
            if (result) {
                logger.info('✅ Webhook set successfully');
                
                const info = await this.bot.getWebhookInfo();
                logger.info('Webhook info:', info);
            } else {
                logger.error('❌ Failed to set webhook');
            }
            
        } catch (error) {
            logger.error('Error setting webhook:', error);
        }
    }

    async shutdown() {
        logger.info('Shutting down Santa Bot...');
        
        if (this.bot) {
            await this.bot.deleteWebhook();
        }
        
        if (this.db) {
            await this.db.disconnect();
        }
        
        logger.info('Santa Bot stopped');
        process.exit(0);
    }
}

const santaBot = new SantaBot();

process.on('SIGINT', () => santaBot.shutdown());
process.on('SIGTERM', () => santaBot.shutdown());

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    santaBot.shutdown();
});

santaBot.init();