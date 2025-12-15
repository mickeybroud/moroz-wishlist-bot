class WishService {
    constructor(db) {
        this.db = db;
        
        this.WISH_COLUMNS = {
            1: 'wish1',
            2: 'wish2',
            3: 'wish3'
        };
    }

    async getUserState(chatId) {
        const result = await this.db.queryOne(
            'SELECT state FROM wishes WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
        return result?.state || 'start';
    }

    async setUserState(chatId, state) {
        await this.db.query(
            'UPDATE wishes SET state = ? WHERE chat_id = ?',
            [state, chatId]
        );
    }

    async resetUserState(chatId) {
        await this.setUserState(chatId, 'wishes_collected');
    }

    async initializeWishes(chatId) {
        await this.db.query(
            `INSERT INTO wishes (chat_id, state, created_at) 
             VALUES (?, 'waiting_for_poem', NOW()) 
             ON DUPLICATE KEY UPDATE state = 'waiting_for_poem'`,
            [chatId]
        );
    }

    async savePoem(chatId, poem) {
        await this.db.query(
            "UPDATE wishes SET poem = ?, state = 'waiting_for_wish1' WHERE chat_id = ?",
            [poem, chatId]
        );
    }

    async getWish(chatId, wishNumber) {
        if (!this.WISH_COLUMNS[wishNumber]) {
            throw new Error(`Invalid wish number: ${wishNumber}`);
        }

        const column = this.WISH_COLUMNS[wishNumber];
        const result = await this.db.queryOne(
            `SELECT ${column} as wish FROM wishes WHERE chat_id = ? LIMIT 1`,
            [chatId]
        );
        
        return result?.wish || null;
    }

    async updateWish(chatId, wishNumber, wish) {
        if (!this.WISH_COLUMNS[wishNumber]) {
            throw new Error(`Invalid wish number: ${wishNumber}`);
        }

        const column = this.WISH_COLUMNS[wishNumber];
        
        await this.db.query(
            `UPDATE wishes SET ${column} = ? WHERE chat_id = ?`,
            [wish, chatId]
        );
    }

    async getAllWishes(chatId) {
        return await this.db.queryOne(
            'SELECT wish1, wish2, wish3, state, poem FROM wishes WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
    }

    async getAllUsersWithWishes() {
        return await this.db.query(`
            SELECT 
                u.chat_id,
                u.username, 
                u.added_at, 
                u.is_admin,
                u.is_locked,
                w.wish1, 
                w.wish2, 
                w.wish3,
                w.poem,
                w.state
            FROM users u 
            LEFT JOIN wishes w ON u.chat_id = w.chat_id
            ORDER BY u.added_at DESC
        `);
    }

    async hasWishes(chatId) {
        const wishes = await this.getAllWishes(chatId);
        
        if (!wishes) {
            return false;
        }
        
        return !!(wishes.wish1 || wishes.wish2 || wishes.wish3);
    }

    formatWishesForDisplay(wishes) {
        let message = '🎄 Твои желания:\n\n';
        message += `1️⃣ ${wishes.wish1 || 'Не задано'}\n`;
        message += `2️⃣ ${wishes.wish2 || 'Не задано'}\n`;
        message += `3️⃣ ${wishes.wish3 || 'Не задано'}\n`;
        return message;
    }

    getChangeWishesKeyboard() {
        return {
            inline_keyboard: [
                [{ text: '1️⃣ Поменять 1 желание', callback_data: 'change_wish_1' }],
                [{ text: '2️⃣ Поменять 2 желание', callback_data: 'change_wish_2' }],
                [{ text: '3️⃣ Поменять 3 желание', callback_data: 'change_wish_3' }]
            ]
        };
    }

    async getWishesStats() {
        const totalUsers = await this.db.queryOne(
            'SELECT COUNT(DISTINCT chat_id) as count FROM wishes'
        );
        
        const withPoems = await this.db.queryOne(
            'SELECT COUNT(*) as count FROM wishes WHERE poem IS NOT NULL'
        );
        
        const withWishes = await this.db.queryOne(
            'SELECT COUNT(*) as count FROM wishes WHERE wish1 IS NOT NULL OR wish2 IS NOT NULL OR wish3 IS NOT NULL'
        );
        
        const completed = await this.db.queryOne(
            "SELECT COUNT(*) as count FROM wishes WHERE state = 'wishes_collected'"
        );

        return {
            totalUsers: totalUsers?.count || 0,
            withPoems: withPoems?.count || 0,
            withWishes: withWishes?.count || 0,
            completed: completed?.count || 0
        };
    }
}

export default WishService;