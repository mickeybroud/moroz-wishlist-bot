class ValidationService {
    constructor() {
        this.MIN_POEM_LENGTH = 20;
        this.MAX_WISH_LENGTH = 500;
        this.MIN_USERNAME_LENGTH = 5;
        this.MAX_USERNAME_LENGTH = 32;
        
        this.CYRILLIC_PATTERN = /[а-яёА-ЯЁ]/g;
        this.USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,32}$/;
    }

    isPoem(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const cyrillicOnly = (text.match(this.CYRILLIC_PATTERN) || []).join('');
        
        return cyrillicOnly.length >= this.MIN_POEM_LENGTH;
    }

    isValidWish(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const trimmed = text.trim();
        return trimmed.length > 0 && trimmed.length <= this.MAX_WISH_LENGTH;
    }

    sanitizeText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text.trim().replace(/\s+/g, ' ');
    }

    isValidUsername(username) {
        if (!username || typeof username !== 'string') {
            return false;
        }
        
        return this.USERNAME_PATTERN.test(username);
    }

    isValidChatId(chatId) {
        return Number.isInteger(chatId) && chatId > 0;
    }

    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    escapeMarkdown(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const specialChars = [
            '_', '*', '[', ']', '(', ')', 
            '~', '`', '>', '#', '+', '-', 
            '=', '|', '{', '}', '.', '!'
        ];
        
        let escaped = text;
        
        for (const char of specialChars) {
            escaped = escaped.replace(
                new RegExp(`\\${char}`, 'g'), 
                `\\${char}`
            );
        }
        
        return escaped;
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return text.replace(/[&<>"']/g, char => htmlEntities[char]);
    }

    isValidLength(text, minLength = 0, maxLength = Infinity) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const length = text.trim().length;
        return length >= minLength && length <= maxLength;
    }

    containsForbiddenContent(text, forbiddenWords = []) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const lowerText = text.toLowerCase();
        
        return forbiddenWords.some(word => 
            lowerText.includes(word.toLowerCase())
        );
    }

    isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    extractUsername(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        const cleaned = text.trim().replace(/^@/, '');
        
        return this.isValidUsername(cleaned) ? cleaned : null;
    }

    isSpam(text, threshold = 0.5) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const chars = text.split('');
        const charCounts = {};
        
        for (const char of chars) {
            charCounts[char] = (charCounts[char] || 0) + 1;
        }
        
        const maxCount = Math.max(...Object.values(charCounts));
        const ratio = maxCount / chars.length;
        
        return ratio > threshold;
    }

    truncate(text, maxLength = 100, suffix = '...') {
        if (!text || typeof text !== 'string') {
            return '';
        }

        if (text.length <= maxLength) {
            return text;
        }

        return text.slice(0, maxLength - suffix.length) + suffix;
    }

    formatDate(date, locale = 'ru-RU') {
        if (!date) {
            return '';
        }

        const dateObj = date instanceof Date ? date : new Date(date);
        
        return dateObj.toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

export default ValidationService;