import TelegramBotAPI from 'node-telegram-bot-api';
import logger from '../utils/Logger.js';

class TelegramBot {
    constructor(token, options = {}) {
        this.bot = new TelegramBotAPI(token, {
            polling: false,
            ...options
        });
    }

    async setWebhook(url, secretToken) {
        try {
            const options = {
                url: url,
                drop_pending_updates: true
            };
            
            if (secretToken) {
                options.secret_token = secretToken;
            }
            
            const result = await this.bot.setWebHook(url, {
                secret_token: secretToken,
                drop_pending_updates: true
            });
            
            return result;
        } catch (error) {
            logger.error('Failed to set webhook:', error);
            return false;
        }
    }

    async getWebhookInfo() {
        try {
            return await this.bot.getWebHookInfo();
        } catch (error) {
            logger.error('Failed to get webhook info:', error);
            return null;
        }
    }

    async deleteWebhook() {
        try {
            return await this.bot.deleteWebHook();
        } catch (error) {
            logger.error('Failed to delete webhook:', error);
            return false;
        }
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            const defaultOptions = {
                parse_mode: 'HTML',
                ...options
            };

            await this.bot.sendMessage(chatId, text, defaultOptions);
            return true;
        } catch (error) {
            logger.error('Failed to send message:', error);
            return false;
        }
    }

    async sendLongMessage(chatId, text, options = {}) {
        const maxLength = 4096;

        if (text.length <= maxLength) {
            return this.sendMessage(chatId, text, options);
        }

        const chunks = [];
        for (let i = 0; i < text.length; i += maxLength) {
            chunks.push(text.slice(i, i + maxLength));
        }

        for (let i = 0; i < chunks.length; i++) {
            const chunkOptions = i === chunks.length - 1 ? options : {};
            await this.sendMessage(chatId, chunks[i], chunkOptions);
            
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return true;
    }

    async sendPhoto(chatId, photo, options = {}) {
        try {
            await this.bot.sendPhoto(chatId, photo, options);
            return true;
        } catch (error) {
            logger.error('Failed to send photo:', error);
            return false;
        }
    }

    async sendAudio(chatId, audio, options = {}) {
        try {
            await this.bot.sendAudio(chatId, audio, options);
            return true;
        } catch (error) {
            logger.error('Failed to send audio:', error);
            return false;
        }
    }

    async sendVideo(chatId, video, options = {}) {
        try {
            await this.bot.sendVideo(chatId, video, options);
            return true;
        } catch (error) {
            logger.error('Failed to send video:', error);
            return false;
        }
    }

    async sendDocument(chatId, document, options = {}) {
        try {
            await this.bot.sendDocument(chatId, document, options);
            return true;
        } catch (error) {
            logger.error('Failed to send document:', error);
            return false;
        }
    }

    async sendVoice(chatId, voice, options = {}) {
        try {
            await this.bot.sendVoice(chatId, voice, options);
            return true;
        } catch (error) {
            logger.error('Failed to send voice:', error);
            return false;
        }
    }

    async sendSticker(chatId, sticker, options = {}) {
        try {
            await this.bot.sendSticker(chatId, sticker, options);
            return true;
        } catch (error) {
            logger.error('Failed to send sticker:', error);
            return false;
        }
    }

    async sendAnimation(chatId, animation, options = {}) {
        try {
            await this.bot.sendAnimation(chatId, animation, options);
            return true;
        } catch (error) {
            logger.error('Failed to send animation:', error);
            return false;
        }
    }

    async sendMediaGroup(chatId, media, options = {}) {
        try {
            await this.bot.sendMediaGroup(chatId, media, options);
            return true;
        } catch (error) {
            logger.error('Failed to send media group:', error);
            return false;
        }
    }

    async deleteMessage(chatId, messageId) {
        try {
            await this.bot.deleteMessage(chatId, messageId);
            return true;
        } catch (error) {
            logger.error('Failed to delete message:', error);
            return false;
        }
    }

    async answerCallbackQuery(callbackQueryId, options = {}) {
        try {
            await this.bot.answerCallbackQuery(callbackQueryId, options);
            return true;
        } catch (error) {
            logger.error('Failed to answer callback query:', error);
            return false;
        }
    }


    async leaveChat(chatId) {
        try {
            await this.bot.leaveChat(chatId);
            return true;
        } catch (error) {
            logger.error('Failed to leave chat:', error);
            return false;
        }
    }
}

export default TelegramBot;