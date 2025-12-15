class UserService {
    constructor(db) {
        this.db = db;
    }

    async findByChatId(chatId) {
        return await this.db.queryOne(
            'SELECT * FROM users WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
    }

    async findByUsername(username) {
        return await this.db.queryOne(
            'SELECT * FROM users WHERE username = ? LIMIT 1',
            [username]
        );
    }

    async create(chatId, username) {
        await this.db.query(
            'INSERT INTO users (chat_id, username, added_at) VALUES (?, ?, NOW())',
            [chatId, username]
        );
    }

    async updateChatId(username, chatId) {
        await this.db.query(
            'UPDATE users SET chat_id = ? WHERE username = ?',
            [chatId, username]
        );
    }

    async updateUsername(chatId, username) {
        await this.db.query(
            'UPDATE users SET username = ? WHERE chat_id = ?',
            [username, chatId]
        );
    }

    async isAdmin(chatId) {
        const user = await this.db.queryOne(
            'SELECT is_admin FROM users WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
        return user?.is_admin === 1;
    }

    async isLocked(chatId) {
        const user = await this.db.queryOne(
            'SELECT is_locked FROM users WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
        return user?.is_locked === 1;
    }

    async ban(chatId) {
        await this.db.query(
            'UPDATE users SET is_locked = 1, is_admin = 0 WHERE chat_id = ?',
            [chatId]
        );
    }

    async unban(chatId) {
        await this.db.query(
            'UPDATE users SET is_locked = 0 WHERE chat_id = ?',
            [chatId]
        );
    }

    async grantAdmin(chatId) {
        await this.db.query(
            'UPDATE users SET is_admin = 1 WHERE chat_id = ?',
            [chatId]
        );
    }

    async revokeAdmin(chatId) {
        await this.db.query(
            'UPDATE users SET is_admin = 0 WHERE chat_id = ?',
            [chatId]
        );
    }

    async getAllUsers() {
        return await this.db.query(
            'SELECT chat_id, username, is_admin, is_locked, added_at FROM users ORDER BY added_at DESC'
        );
    }

    async getUserCount() {
        const result = await this.db.queryOne('SELECT COUNT(*) as count FROM users');
        return result?.count || 0;
    }

    async getAdminCount() {
        const result = await this.db.queryOne('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
        return result?.count || 0;
    }

    async getBlockedCount() {
        const result = await this.db.queryOne('SELECT COUNT(*) as count FROM users WHERE is_locked = 1');
        return result?.count || 0;
    }
}

export default UserService;