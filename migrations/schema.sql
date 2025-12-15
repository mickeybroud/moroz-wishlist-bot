CREATE TABLE `bot_chats` (
  `id` int UNSIGNED NOT NULL,
  `chat_id` bigint NOT NULL,
  `chat_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `added_by_user_id` bigint DEFAULT NULL,
  `added_by_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `added_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `command_logs` (
  `id` int UNSIGNED NOT NULL,
  `user_id` bigint NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `command` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pending_broadcasts` (
  `id` int UNSIGNED NOT NULL,
  `admin_chat_id` bigint NOT NULL,
  `message_data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `chat_id` bigint DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  `is_locked` tinyint(1) DEFAULT '0',
  `added_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wishes` (
  `id` int UNSIGNED NOT NULL,
  `chat_id` bigint NOT NULL,
  `poem` text COLLATE utf8mb4_unicode_ci,
  `wish1` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wish2` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wish3` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'start',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


ALTER TABLE `bot_chats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`),
  ADD KEY `idx_chat_id` (`chat_id`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_added_by` (`added_by_user_id`);

ALTER TABLE `command_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

ALTER TABLE `pending_broadcasts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_admin` (`admin_chat_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`),
  ADD KEY `idx_chat_id` (`chat_id`),
  ADD KEY `idx_username` (`username`);

ALTER TABLE `wishes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`),
  ADD KEY `idx_chat_id` (`chat_id`),
  ADD KEY `idx_state` (`state`);


ALTER TABLE `bot_chats`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `command_logs`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `pending_broadcasts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `wishes`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;


ALTER TABLE `wishes`
  ADD CONSTRAINT `wishes_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `users` (`chat_id`) ON DELETE CASCADE;
COMMIT;