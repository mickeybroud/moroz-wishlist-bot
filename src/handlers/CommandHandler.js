import UserService from '../services/UserService.js';
import WishService from '../services/WishService.js';
import ValidationService from '../services/ValidationService.js';
import Messages from '../utils/Messages.js';

class CommandHandler {
    constructor(db, bot) {
        this.db = db;
        this.bot = bot;
        this.userService = new UserService(db);
        this.wishService = new WishService(db);
        this.validator = new ValidationService();
    }

    async handleStart(chatId, username, text, message) {
        if (await this.userService.isAdmin(chatId)) {
            return this.handleAdmin(chatId, username, text, message);
        }
        
        const wishes = await this.wishService.getAllWishes(chatId);
        
        if (wishes && wishes.poem) {
            if (await this.wishService.hasWishes(chatId)) {
                return this.handleWishes(chatId, username, text, message);
            } else {
                await this.bot.sendMessage(
                    chatId,
                    '🎄 Я помню, ты уже рассказал мне стишок!\n\n' +
                    'Теперь расскажи мне свои желания. Напиши первое желание:'
                );
                await this.wishService.setUserState(chatId, 'waiting_for_wish1');
                return;
            }
        }

        await this.wishService.initializeWishes(chatId);
        
        await this.bot.sendMessage(chatId, Messages.WELCOME);
        await this.bot.sendMessage(chatId, 'Расскажи мне стишок, чтобы я мог продолжить! ⤵️');
    }

    async handleWishes(chatId, username, text, message) {
        try {
            const wishes = await this.wishService.getAllWishes(chatId);
            
            if (!wishes || !await this.wishService.hasWishes(chatId)) {
                await this.bot.sendMessage(
                    chatId,
                    'Пока что ты ничего не просил у Дедушки Мороза, но у тебя еще есть время успеть! Напиши /start'
                );
                return;
            }
            
            const message = this.wishService.formatWishesForDisplay(wishes);
            const keyboard = this.wishService.getChangeWishesKeyboard();
            
            await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
            
        } catch (error) {
            console.error('Error in handleWishes:', error);
            await this.bot.sendMessage(chatId, 'Произошла ошибка. Попробуй позже.');
        }
    }

    async handleWish(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        try {
            const users = await this.wishService.getAllUsersWithWishes();
            
            if (users.length === 0) {
                await this.bot.sendMessage(chatId, '❓ Нет зарегистрированных пользователей');
                return;
            }
            
            let outputMessage = '📋 <b>Список всех желаний:</b>\n\n';
            
            for (const user of users) {
                const wishes = [];
                if (user.wish1) wishes.push(`1️⃣ ${this.validator.escapeHtml(user.wish1)}`);
                if (user.wish2) wishes.push(`2️⃣ ${this.validator.escapeHtml(user.wish2)}`);
                if (user.wish3) wishes.push(`3️⃣ ${this.validator.escapeHtml(user.wish3)}`);
                
                const wishesText = wishes.length > 0 ? wishes.join('\n') : '<i>Нет желаний</i>';
                const usernameText = user.username ? `@${user.username}` : `ID: ${user.chat_id}`;
                
                outputMessage += `👤 ${usernameText}\n${wishesText}\n\n`;
            }
            
            await this.bot.sendLongMessage(chatId, outputMessage.trim());
            
        } catch (error) {
            console.error('Error in handleWish:', error);
            await this.bot.sendMessage(chatId, '⚠️ Ошибка при получении данных.');
        }
    }

    async handlePoem(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        try {
            const users = await this.wishService.getAllUsersWithWishes();
            
            if (users.length === 0) {
                await this.bot.sendMessage(chatId, '❓ Нет зарегистрированных пользователей');
                return;
            }
            
            let outputMessage = '📜 <b>Стихотворения:</b>\n\n';
            
            for (const user of users) {
                const usernameText = user.username ? `@${user.username}` : `ID: ${user.chat_id}`;
                const poem = user.poem 
                    ? this.validator.escapeHtml(user.poem) 
                    : '<i>Нет стихотворения</i>';
                
                outputMessage += `👤 ${usernameText}\n${poem}\n\n`;
            }
            
            await this.bot.sendLongMessage(chatId, outputMessage.trim());
            
        } catch (error) {
            console.error('Error in handlePoem:', error);
            await this.bot.sendMessage(chatId, '⚠️ Ошибка при получении данных.');
        }
    }

    async handleInfo(chatId, username, text, message) {
        await this.bot.sendMessage(
            chatId,
            `Здесь ты можешь написать о своих желаниях Деду Морозу. Иногда чудеса случаются, помни об этом 😉\n\n` +
            `<b>Список твоих желаний: /wishes</b>\n\n` +
            `Автор: @cape0town\n` +
            `Этот бот - проект с открытым исходным кодом на NodeJS\n` +
            `https://github.com/mickeybroud/moroz-wishlist-bot`
        );
    }

    async handleAdmin(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        await this.bot.sendMessage(chatId, Messages.ADMIN_COMMANDS);
    }

    async handleBan(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const parts = text.split(' ');
        
        if (parts.length !== 2) {
            await this.bot.sendMessage(chatId, '❌ Неправильный формат команды.\nИспользуйте: `/ban @username`');
            return;
        }
        
        const targetUsername = parts[1].replace('@', '');
        const targetUser = await this.userService.findByUsername(targetUsername);
        
        if (!targetUser) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не найден в списке`);
            return;
        }
        
        if (targetUser.is_locked) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} уже заблокирован`);
            return;
        }
        
        await this.userService.ban(targetUser.chat_id);
        await this.bot.sendMessage(chatId, `✅ @${targetUsername} заблокирован`);
    }

    async handleUnban(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const parts = text.split(' ');
        
        if (parts.length !== 2) {
            await this.bot.sendMessage(chatId, '❌ Неправильный формат команды.\nИспользуйте: `/unban @username`');
            return;
        }
        
        const targetUsername = parts[1].replace('@', '');
        const targetUser = await this.userService.findByUsername(targetUsername);
        
        if (!targetUser) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не найден в списке`);
            return;
        }
        
        if (!targetUser.is_locked) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не заблокирован`);
            return;
        }
        
        await this.userService.unban(targetUser.chat_id);
        await this.bot.sendMessage(chatId, `✅ @${targetUsername} разблокирован`);
    }

    async handleOp(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const parts = text.split(' ');
        
        if (parts.length !== 2) {
            await this.bot.sendMessage(chatId, '❌ Неправильный формат команды.\nИспользуйте: `/op @username`');
            return;
        }
        
        const targetUsername = parts[1].replace('@', '');
        const targetUser = await this.userService.findByUsername(targetUsername);
        
        if (!targetUser) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не найден в списке`);
            return;
        }
        
        if (targetUser.is_admin) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} уже является администратором`);
            return;
        }
        
        await this.userService.grantAdmin(targetUser.chat_id);
        await this.bot.sendMessage(chatId, `✅ @${targetUsername} теперь является администратором`);
        
        if (targetUser.chat_id) {
            await this.bot.sendMessage(targetUser.chat_id, '✅ Вам выданы админ-права!');
        }
    }

    async handleDeop(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const parts = text.split(' ');
        
        if (parts.length !== 2) {
            await this.bot.sendMessage(chatId, '❌ Неправильный формат команды.\nИспользуйте: `/deop @username`');
            return;
        }
        
        const targetUsername = parts[1].replace('@', '');
        const targetUser = await this.userService.findByUsername(targetUsername);
        
        if (!targetUser) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не найден в списке`);
            return;
        }
        
        if (!targetUser.is_admin) {
            await this.bot.sendMessage(chatId, `❌ @${targetUsername} не является администратором`);
            return;
        }
        
        await this.userService.revokeAdmin(targetUser.chat_id);
        await this.bot.sendMessage(chatId, `✅ @${targetUsername} больше не является администратором`);
    }

    async handleUsers(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        try {
            const users = await this.userService.getAllUsers();
            
            if (users.length === 0) {
                await this.bot.sendMessage(chatId, '❓ Нет зарегистрированных пользователей');
                return;
            }
            
            let outputMessage = '👥 <b>Список пользователей:</b>\n\n';
            let counter = 1;
            
            for (const user of users) {
                const date = new Date(user.added_at);
                const formattedDate = date.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const adminStatus = user.is_admin ? '✅' : '❌';
                const lockStatus = user.is_locked ? '🔒 Заблокирован' : '';
                const usernameText = user.username ? `@${user.username}` : `ID: ${user.chat_id}`;
                
                outputMessage += `${counter}. ${usernameText}\n`;
                outputMessage += `   Админ: ${adminStatus} ${lockStatus}\n`;
                outputMessage += `   Присоединился: ${formattedDate}\n\n`;
                
                counter++;
            }
            
            await this.bot.sendLongMessage(chatId, outputMessage.trim());
            
        } catch (error) {
            console.error('Error in handleUsers:', error);
            await this.bot.sendMessage(chatId, '⚠️ Ошибка при получении списка пользователей.');
        }
    }

    async handleTalk(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const ChatService = (await import('../services/ChatService.js')).default;
        const chatService = new ChatService(this.db);
        
        const chats = await chatService.getActiveChats();
        
        if (chats.length === 0) {
            await this.bot.sendMessage(
                chatId,
                '❌ Нет доступных чатов.\n\nДобавьте бота в групповой чат, чтобы отправлять туда сообщения.'
            );
            return;
        }
        
        const keyboard = {
            inline_keyboard: chats.map(chat => [{
                text: `${this.getChatIcon(chat.chat_type)} ${chat.chat_title || `ID: ${chat.chat_id}`}`,
                callback_data: `talk_select_${chat.chat_id}`
            }])
        };
        
        await this.bot.sendMessage(
            chatId,
            '📢 Выберите чат для отправки сообщения:',
            { reply_markup: keyboard }
        );
    }

    async handleTalkAll(chatId, username, text, message) {
        if (!await this.userService.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, Messages.NO_PERMISSION);
            return;
        }
        
        const WishService = (await import('../services/WishService.js')).default;
        const wishService = new WishService(this.db);

        await wishService.setUserState(chatId, 'talkall_waiting');
        
        await this.bot.sendMessage(
            chatId,
            `📢 <b>Режим массовой рассылки</b>\n\n` +
            `Отправьте сообщение, которое будет отправлено всем пользователям бота.\n\n` +
            `Вы можете отправить:\n` +
            `• Текст\n` +
            `• Фото (с подписью или без)\n` +
            `• Видео (с подписью или без)\n` +
            `• Документ\n\n` +
            `⚠️ <b>Внимание:</b> Сообщение будет отправлено ВСЕМ пользователям!\n\n` +
            `Напишите /cancel для отмены.`
        );
    }

    getChatIcon(chatType) {
        const icons = {
            'group': '👥',
            'supergroup': '👥',
            'channel': '📢',
            'private': '👤'
        };
        return icons[chatType] || '💬';
    }
}

export default CommandHandler;