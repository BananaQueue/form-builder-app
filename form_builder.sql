-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 30, 2026 at 05:25 AM
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

--
-- Dumping data for table `answers`
--

INSERT INTO `answers` (`id`, `response_id`, `question_id`, `answer_text`) VALUES
(17, 7, 60, 'Permanent'),
(18, 7, 61, ' Project Development Officer I'),
(20, 9, 92, 'Test 2,Test 3'),
(21, 9, 93, '1'),
(22, 9, 94, ''),
(23, 10, 57, 'DENR'),
(24, 10, 58, ''),
(25, 11, 57, 'EMB'),
(26, 11, 58, 'ORD');

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
(18, 'Conditional Test', 'Testing Conditional Question', '2026-03-11 02:30:56', 1),
(21, 'EMPLOYMENT', 'Nkl;dsf;kog', '2026-03-12 02:00:57', 3),
(22, 'Rating Test', 'Testing rating type', '2026-03-12 05:31:39', 2),
(23, 'Test', 'Test Test', '2026-03-25 08:34:42', 1);

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `form_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` varchar(50) NOT NULL,
  `rating_scale` varchar(50) DEFAULT NULL,
  `number_min` decimal(10,2) DEFAULT NULL,
  `number_max` decimal(10,2) DEFAULT NULL,
  `number_step` varchar(10) DEFAULT NULL,
  `datetime_type` varchar(20) DEFAULT NULL,
  `position` int(11) DEFAULT 0,
  `is_required` tinyint(1) DEFAULT 1,
  `condition_question_id` int(11) DEFAULT NULL,
  `condition_type` varchar(50) DEFAULT 'equals',
  `condition_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`id`, `form_id`, `question_text`, `question_type`, `rating_scale`, `number_min`, `number_max`, `number_step`, `datetime_type`, `position`, `is_required`, `condition_question_id`, `condition_type`, `condition_value`) VALUES
(57, 18, 'Bureau', 'checkbox', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, 'equals', NULL),
(58, 18, 'Division', 'text', NULL, NULL, NULL, NULL, NULL, 1, 1, 57, 'equals', 'EMB'),
(60, 21, 'What is your current employment status? ', 'checkbox', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, 'equals', NULL),
(61, 21, 'What is your Job Title?', 'multiple_choice', NULL, NULL, NULL, NULL, NULL, 1, 1, 60, 'equals', 'Permanent'),
(78, 22, 'How many percent', 'text', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, 'equals', NULL),
(79, 22, 'Do you agree?', 'rating', NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 'equals', NULL),
(80, 22, 'Are you lying?', 'text', NULL, NULL, NULL, NULL, NULL, 2, 1, 78, 'is_answered', NULL),
(92, 23, 'Test', 'multiple_choice', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, 'equals', NULL),
(93, 23, '2 Test', 'checkbox', NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 'equals', NULL),
(94, 23, 'Seret', 'text', NULL, NULL, NULL, NULL, NULL, 2, 1, 92, 'equals', 'Test 1');

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
(130, 57, 'DENR', 0),
(131, 57, 'EMB', 1),
(135, 60, 'Permanent', 0),
(136, 60, 'Job Order', 1),
(137, 60, 'Contract of Service', 2),
(138, 61, 'Data Controller I', 0),
(139, 61, ' Data Controller II', 1),
(140, 61, ' Project Development Officer I', 2),
(141, 61, 'Planning Officer I', 3),
(142, 61, 'Planning Officer II', 4),
(193, 79, 'Strongly Disagree', 0),
(194, 79, 'Disagree', 1),
(195, 79, 'Neutral', 2),
(196, 79, 'Agree', 3),
(197, 79, 'Strongly Agree', 4),
(210, 92, 'Test 1', 0),
(211, 92, 'Test 2', 1),
(212, 92, 'Test 3', 2),
(213, 93, '1', 0),
(214, 93, '2', 1),
(215, 93, '3', 2);

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
-- Dumping data for table `responses`
--

INSERT INTO `responses` (`id`, `form_id`, `submitted_at`) VALUES
(7, 21, '2026-03-12 02:10:01'),
(8, 22, '2026-03-12 05:32:18'),
(9, 23, '2026-03-30 00:00:07'),
(10, 18, '2026-03-30 00:00:36'),
(11, 18, '2026-03-30 00:00:48');

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
  ADD KEY `form_id` (`form_id`),
  ADD KEY `fk_condition_question` (`condition_question_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `forms`
--
ALTER TABLE `forms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `question_options`
--
ALTER TABLE `question_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=216;

--
-- AUTO_INCREMENT for table `responses`
--
ALTER TABLE `responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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
  ADD CONSTRAINT `fk_condition_question` FOREIGN KEY (`condition_question_id`) REFERENCES `questions` (`id`) ON DELETE SET NULL,
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
