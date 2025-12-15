// src/services/ChatService.js

class ChatService {
    constructor(db) {
        this.db = db;
    }

    async saveChat(chatId, chatType, chatTitle = null, addedByUserId = null, addedByUsername = null) {
        await this.db.query(
            `INSERT INTO bot_chats (chat_id, chat_type, chat_title, added_by_user_id, added_by_username, added_at) 
             VALUES (?, ?, ?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE 
             chat_type = VALUES(chat_type),
             chat_title = VALUES(chat_title),
             updated_at = NOW()`,
            [chatId, chatType, chatTitle, addedByUserId, addedByUsername]
        );
    }

    async getActiveChats() {
        return await this.db.query(
            `SELECT 
                bc.*,
                u.username as admin_username,
                u.is_admin
             FROM bot_chats bc
             LEFT JOIN users u ON bc.added_by_user_id = u.chat_id
             WHERE bc.is_active = 1 
             ORDER BY bc.chat_title, bc.added_at DESC`
        );
    }

    async getChatById(chatId) {
        return await this.db.queryOne(
            'SELECT * FROM bot_chats WHERE chat_id = ? LIMIT 1',
            [chatId]
        );
    }

    async deactivateChat(chatId) {
        await this.db.query(
            'UPDATE bot_chats SET is_active = 0 WHERE chat_id = ?',
            [chatId]
        );
    }
}

export default ChatService;