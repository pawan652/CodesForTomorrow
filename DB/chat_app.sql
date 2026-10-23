-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 23, 2026 at 07:37 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chat_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` int(11) NOT NULL,
  `user_low_id` int(11) NOT NULL,
  `user_high_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `chats`
--

INSERT INTO `chats` (`id`, `user_low_id`, `user_high_id`, `created_at`) VALUES
(1, 4, 6, '2026-10-23 16:35:00'),
(2, 4, 5, '2026-10-23 16:35:06'),
(3, 4, 7, '2026-10-23 16:35:08'),
(4, 4, 8, '2026-10-23 16:36:45'),
(5, 5, 6, '2026-10-23 16:36:51'),
(6, 5, 7, '2026-10-23 16:36:52'),
(7, 5, 8, '2026-10-23 16:36:53'),
(8, 6, 7, '2026-10-23 16:37:15');

-- --------------------------------------------------------

--
-- Table structure for table `chat_members`
--

CREATE TABLE `chat_members` (
  `id` int(11) NOT NULL,
  `chat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_members`
--

INSERT INTO `chat_members` (`id`, `chat_id`, `user_id`, `created_at`) VALUES
(1, 1, 4, '2026-10-23 16:35:00'),
(2, 1, 6, '2026-10-23 16:35:00'),
(3, 2, 4, '2026-10-23 16:35:06'),
(4, 2, 5, '2026-10-23 16:35:06'),
(5, 3, 4, '2026-10-23 16:35:08'),
(6, 3, 7, '2026-10-23 16:35:08'),
(7, 4, 4, '2026-10-23 16:36:45'),
(8, 4, 8, '2026-10-23 16:36:45'),
(9, 5, 5, '2026-10-23 16:36:51'),
(10, 5, 6, '2026-10-23 16:36:51'),
(11, 6, 5, '2026-10-23 16:36:52'),
(12, 6, 7, '2026-10-23 16:36:52'),
(13, 7, 5, '2026-10-23 16:36:53'),
(14, 7, 8, '2026-10-23 16:36:53'),
(15, 8, 6, '2026-10-23 16:37:15'),
(16, 8, 7, '2026-10-23 16:37:15');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `created_at`, `email`, `password_hash`, `is_online`) VALUES
(4, 'Pawan', '2026-10-23 16:23:48', 'pawan@gmail.com', '$2a$10$mRmtXdqCFYqTn7QFg7lGiOTeQHbUtue0kyxJWOjD5vUlORZGjLDeK', 1),
(5, 'Aman', '2026-10-23 16:23:48', 'aman@gmail.com', '$2a$10$290dDI1KnndtbgQ3jyw37O3.kecyc9m2o4jIuqP2Ce4psWvBvK/c.', 0),
(6, 'Akshay', '2026-10-23 16:23:48', 'akshay@gmail.com', '$2a$10$ZlcrlXC6uDoajJTzoASwo.khFL23XRIweB0x139jq1LmCfzBjgrxG', 1),
(7, 'Amar', '2026-10-23 16:23:48', 'amar@gmail.com', '$2a$10$tx8nE7/vsWGVIxpRoP0k9O0Nwn5xl2uC3m4QVkYBDyC.1ksTVwOiO', 0),
(8, 'Ram', '2026-10-23 16:23:48', 'ram@gmail.com', '$2a$10$WDi7quiOrD6liHiZA5uR2ecu.Ntly.UXEeBL0g.oDP7i8pYJC2tiW', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chat_user_pair` (`user_low_id`,`user_high_id`),
  ADD KEY `fk_chats_user_high` (`user_high_id`);

--
-- Indexes for table `chat_members`
--
ALTER TABLE `chat_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chat_member` (`chat_id`,`user_id`),
  ADD KEY `idx_chat_members_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_members`
--
ALTER TABLE `chat_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `fk_chats_user_high` FOREIGN KEY (`user_high_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chats_user_low` FOREIGN KEY (`user_low_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_members`
--
ALTER TABLE `chat_members`
  ADD CONSTRAINT `fk_chat_members_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
