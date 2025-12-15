import UserService from '../services/UserService.js';
import WishService from '../services/WishService.js';
import ValidationService from '../services/ValidationService.js';

class StateHandler {
    constructor(db, bot) {
        this.db = db;
        this.bot = bot;
        this.userService = new UserService(db);
        this.wishService = new WishService(db);
        this.validator = new ValidationService();
    }

    async handle(chatId, username, text) {
        if (text === '/cancel') {
            const state = await this.wishService.getUserState(chatId);
            if (state && (state.startsWith('talk_waiting_') || state.startsWith('changing_wish_'))) {
                await this.wishService.resetUserState(chatId);
                await this.bot.sendMessage(chatId, '❌ Действие отменено.');
                return;
            }
        }
        
        const state = await this.wishService.getUserState(chatId);

        if (state.startsWith('changing_wish_')) {
            await this.handleChangingWish(chatId, username, text, state);
            return;
        }

        switch (state) {
            case 'waiting_for_poem':
                await this.handlePoemInput(chatId, text);
                break;
            case 'waiting_for_wish1':
                await this.handleWishInput(chatId, text, 1);
                break;
            case 'waiting_for_wish2':
                await this.handleWishInput(chatId, text, 2);
                break;
            case 'waiting_for_wish3':
                await this.handleWishInput(chatId, text, 3);
                break;
        }
    }

    async handleChangingWish(chatId, username, text, state) {
        const match = state.match(/changing_wish_(\d)/);
        if (!match) return;

        const wishNumber = parseInt(match[1]);

        if (![1, 2, 3].includes(wishNumber)) {
            await this.bot.sendMessage(chatId, '⚠️ Некорректный номер желания.');
            return;
        }

        const oldWish = await this.wishService.getWish(chatId, wishNumber);

        await this.wishService.updateWish(chatId, wishNumber, text);

        await this.notifyAdminsAboutWishChange(username, oldWish, text);

        await this.bot.sendMessage(chatId, '✅ Хорошо, я учел твое новое желание!');

        await this.wishService.resetUserState(chatId);
    }

    async handlePoemInput(chatId, text) {
        if (!this.validator.isPoem(text)) {
            await this.bot.sendMessage(
                chatId,
                'Это совсем не похоже на стих, давай попробуем еще раз ⤵️'
            );
            return;
        }

        await this.wishService.savePoem(chatId, text);
        await this.wishService.setUserState(chatId, 'waiting_for_wish1');

        await this.bot.sendMessage(
            chatId,
            'Какое твое первое желание? (Пожалуйста, используй любой сервис для сокращения длинной ссылки) ⤵️'
        );
    }

    async handleWishInput(chatId, text, wishNumber) {
        await this.wishService.updateWish(chatId, wishNumber, text);

        const nextStates = {
            1: 'waiting_for_wish2',
            2: 'waiting_for_wish3',
            3: 'wishes_collected'
        };

        const messages = {
            1: 'Какое твое второе желание? ⤵️',
            2: 'Какое твое третье желание? ⤵️',
            3: '🎅 Дедушка подумает над твоими желаниями и может быть, свершится магия и ты получишь один из подарков!\n\n' +
               'P.S. Посмотреть свои желания и поменять их ты можешь командой /wishes'
        };

        await this.wishService.setUserState(chatId, nextStates[wishNumber]);
        await this.bot.sendMessage(chatId, messages[wishNumber]);
    }

    async notifyAdminsAboutWishChange(username, oldWish, newWish) {
        const admins = await this.getAdmins();

        const notification = 
            `🎁 @${username || 'unknown'} поменял свое желание\n` +
            `с "${oldWish || 'не задано'}"\n` +
            `на "${newWish}"`;

        for (const adminChatId of admins) {
            await this.bot.sendMessage(adminChatId, notification);
        }
    }

    async getAdmins() {
        const admins = await this.db.query('SELECT chat_id FROM users WHERE is_admin = 1');
        return admins.map(admin => admin.chat_id);
    }
}

export default StateHandler;