# 🎅 Moroz Wishlist Bot

Telegram-бот для сбора новогодних желаний сотрудников с системой администрирования и рассылок.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Обратите внимание: проверка на X-Telegram-Bot-Api-Secret-Token вырезана из текущей версии и поддерживается только с node-telegram-bot-api версии 0.64 и выше.
Это будет реализована в будущих версиях.

## 📋 Возможности

### Для пользователей:
- 🎄 Рассказать стихотворение Деду Морозу
- 🎁 Загадать 3 новогодних желания
- ✏️ Изменить свои желания в любой момент
- 📝 Просмотреть список своих желаний

### Для администраторов:
- 👥 Управление пользователями (блокировка, права)
- 📊 Просмотр всех желаний и стихотворений
- 💬 Отправка сообщений в подключенные группы
- 📢 Массовая рассылка всем пользователям
- 🔐 Система прав доступа
- 📈 Статистика пользователей

## 🚀 Технологии

- **Node.js 18+** - серверная платформа
- **Express** - веб-фреймворк для webhook
- **MySQL** - база данных
- **node-telegram-bot-api** - библиотека для Telegram API
- **Winston** - логирование
- **PM2** - process manager для production

## 📦 Установка

### Требования

- Node.js 18 или выше
- MySQL 5.7+ или MariaDB 10.3+
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))
- HTTPS домен (для webhook)

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/mickeybroud/moroz-wishlist-bot.git
cd moroz-wishlist-bot
```

### Шаг 2: Установка зависимостей

```bash
npm install
```

### Шаг 3: Настройка базы данных

```bash
# Создание базы данных
mysql -u root -p

CREATE DATABASE moroz_wishlist_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE moroz_wishlist_bot;

# Применение миграций
source migrations/schema.sql;

EXIT;
```

### Шаг 4: Конфигурация

Создайте `.env` файл:

```bash
cp .env.example .env
nano .env
```

Заполните переменные окружения:

```env
# Telegram Bot
BOT_TOKEN=your_bot_token_here

# Webhook
WEBHOOK_URL=https://your-domain.com
WEBHOOK_SECRET=random-secret-key
WEBHOOK_SECRET_TOKEN=another-random-token

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=moroz_wishlist_bot
DB_USER=root
DB_PASSWORD=

# Environment
NODE_ENV=production
PORT=3000

# Logging
LOG_LEVEL=info

# Path
ENV_PATH=/home/dev/moroz-wishlist-bot/.env
```

### Шаг 5: Настройка webhook

Бот автоматически установит webhook при запуске. Убедитесь, что:
- У вас есть HTTPS домен
- Nginx настроен на проксирование на порт 3000

### Шаг 6: Запуск

#### Development:
```bash
npm run dev
```

#### Production (с PM2):
```bash
# Установка PM2
npm install -g pm2

# Запуск
pm2 start index.js --name moroz-wishlist-bot

# Автозапуск при перезагрузке
pm2 startup
pm2 save

# Логи
pm2 logs moroz-wishlist-bot

# Мониторинг
pm2 monit
```

## 📚 Команды бота

### Пользовательские команды:

| Команда | Описание |
|---------|----------|
| `/start` | Начало работы с ботом |
| `/wishes` | Показать свои желания |
| `/info` | Информация о боте |

### Админские команды:

| Команда | Описание |
|---------|----------|
| `/admin` | Показать админ-панель |
| `/wish` | Показать все желания пользователей |
| `/poem` | Показать все стихотворения |
| `/users` | Список пользователей |
| `/ban @username` | Заблокировать пользователя |
| `/unban @username` | Разблокировать пользователя |
| `/op @username` | Выдать админ-права |
| `/deop @username` | Забрать админ-права |
| `/talk` | Отправить сообщение в группу |
| `/talkall` | Массовая рассылка всем пользователям |

## 🏗️ Архитектура

```
moroz-wishlist-bot/
├── src/
│   ├── config/         # Конфигурация
│   ├── core/           # Ядро (Database, TelegramBot, Router)
│   ├── handlers/       # Обработчики команд и состояний
│   ├── services/       # Бизнес-логика
│   ├── middleware/     # Промежуточные обработчики
│   └── utils/          # Утилиты
├── migrations/         # SQL миграции
├── logs/              # Логи
├── index.js           # Точка входа
└── package.json       # Зависимости
```

## 🔒 Безопасность

- ✅ Prepared Statements для защиты от SQL-инъекций
- ✅ Whitelist для динамических запросов
- ✅ Секретный путь webhook
- ✅ Валидация всех входных данных
- ✅ Система прав доступа
- ✅ Защита добавления в группы (только админы)

## 📊 База данных

### Таблицы:

- **users** - пользователи бота
- **wishes** - желания и состояния FSM
- **command_logs** - логи команд
- **bot_chats** - подключенные группы
- **pending_broadcasts** - очередь рассылок

## 🔧 Разработка

### Структура проекта:

```javascript
// Пример добавления новой команды

// 1. В CommandHandler.js
async handleMyCommand(chatId, username, text, message) {
    // Ваша логика
}

// 2. В Router.js
registerCommands(handler) {
    this.commands.set('/mycommand', handler.handleMyCommand.bind(handler));
}
```

### Тестирование:

```bash
# Проверка синтаксиса
node --check index.js

# Запуск в dev-режиме
npm run dev

# Просмотр логов
tail -f logs/combined.log
```

## 📝 Workflow

1. **Разработка:** Код пишется в `/home/dev/moroz-wishlist-bot`
2. **Тестирование:** `npm run dev`
3. **Коммит:** `git commit -m "feature: ..."`
4. **Push:** `git push`
5. **Production:** `cd /var/www/moroz-wishlist-bot && git pull && pm2 restart`

## 🐛 Troubleshooting

### Бот не отвечает:
```bash
# Проверьте webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Проверьте логи
pm2 logs moroz-wishlist-bot
```

### Ошибки базы данных:
```bash
# Проверьте подключение
mysql -u root -p moroz_wishlist_bot

# Проверьте .env
cat .env | grep DB_
```

### Проблемы с PM2:
```bash
# Перезапуск
pm2 restart moroz-wishlist-bot

# Полный перезапуск
pm2 delete moroz-wishlist-bot
pm2 start index.js --name moroz-wishlist-bot
pm2 save
```

## 📄 Лицензия

MIT License

### Deployment:
```bash
cd /home/dev/moroz-wishlist-bot
git add .
git commit -m "feat: group protection, broadcast, README"
git push

cd /var/www/moroz-wishlist-bot
git pull
pm2 restart moroz-wishlist-bot
```

### Добавление первого админа (сначала нужно написать боту):
```bash
mysql -u root -p moroz_wishlist_bot
UPDATE users SET is_admin = 1 WHERE username = 'your_username';
EXIT;

```
