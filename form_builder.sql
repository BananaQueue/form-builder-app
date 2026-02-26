-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 26, 2026 at 07:22 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `form_builder`
--

-- --------------------------------------------------------

--
-- Table structure for table `answers`
--

CREATE TABLE `answers` (
  `id` int(11) NOT NULL,
  `response_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_text` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `created_at`) VALUES
(1, 'General', '2026-02-24 09:16:11'),
(2, 'External', '2026-02-24 09:16:11'),
(3, 'Internal', '2026-02-24 09:16:11');

-- --------------------------------------------------------

--
-- Table structure for table `forms`
--

CREATE TABLE `forms` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `category_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `forms`
--

INSERT INTO `forms` (`id`, `title`, `description`, `created_at`, `category_id`) VALUES
(1, 'Test Form', 'This is a test form', '2026-02-11 01:18:13', 1),
(2, 'Test Form from HTML', 'This is a test', '2026-02-24 01:15:42', 1),
(3, 'Test Three', 'Three Test', '2026-02-24 06:04:45', 1),
(4, 'Webinar Feedback', 'Feedback on Webinar', '2026-02-25 09:41:49', 3);

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` varchar(50) NOT NULL,
  `position` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`id`, `form_id`, `question_text`, `question_type`, `position`) VALUES
(1, 1, 'What is your favorite color?', 'multiple_choice', 0),
(2, 2, 'What is your name?', 'text', 0),
(3, 2, 'What is your favorite color?', 'multiple_choice', 1),
(4, 3, 'What?', 'text', 0),
(5, 3, 'Who?', 'checkbox', 1),
(6, 3, 'Where?', 'multiple_choice', 2),
(7, 4, 'Section/Unit/Section', 'checkbox', 0),
(8, 4, 'Full name:', 'text', 1),
(9, 4, 'Select all that apply', 'multiple_choice', 2);

-- --------------------------------------------------------

--
-- Table structure for table `question_options`
--

CREATE TABLE `question_options` (
  `id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_text` varchar(255) NOT NULL,
  `position` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `question_options`
--

INSERT INTO `question_options` (`id`, `question_id`, `option_text`, `position`) VALUES
(1, 1, 'Red', 0),
(2, 1, 'Blue', 1),
(3, 1, 'Green', 2),
(4, 3, 'Red', 0),
(5, 3, 'Blue', 1),
(6, 3, 'Green', 2),
(7, 5, 'Me', 0),
(8, 5, 'U', 1),
(9, 6, 'Here', 0),
(10, 6, 'There', 1),
(11, 6, 'Everywhere', 2),
(12, 7, 'FAD', 0),
(13, 7, 'CPD', 1),
(14, 7, 'EMED', 2),
(15, 7, 'ORD', 3),
(16, 9, 'Orange', 0),
(17, 9, 'Lemon', 1),
(18, 9, 'Grape', 2),
(19, 9, 'Apple', 3),
(20, 9, 'Watermelon', 4),
(21, 9, 'Starfruit', 5),
(22, 9, 'Kiwi', 6),
(23, 9, 'Apple Mango', 7);

-- --------------------------------------------------------

--
-- Table structure for table `responses`
--

CREATE TABLE `responses` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `answers`
--
ALTER TABLE `answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `response_id` (`response_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `forms`
--
ALTER TABLE `forms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `form_id` (`form_id`);

--
-- Indexes for table `question_options`
--
ALTER TABLE `question_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `responses`
--
ALTER TABLE `responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `form_id` (`form_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `answers`
--
ALTER TABLE `answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `forms`
--
ALTER TABLE `forms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `question_options`
--
ALTER TABLE `question_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `responses`
--
ALTER TABLE `responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `answers`
--
ALTER TABLE `answers`
  ADD CONSTRAINT `answers_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `responses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `forms`
--
ALTER TABLE `forms`
  ADD CONSTRAINT `forms_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `question_options`
--
ALTER TABLE `question_options`
  ADD CONSTRAINT `question_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `responses`
--
ALTER TABLE `responses`
  ADD CONSTRAINT `responses_ibfk_1` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
