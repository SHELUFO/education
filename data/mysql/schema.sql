CREATE DATABASE IF NOT EXISTS `chem_web_internal` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `chem_web_internal`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `exam_pdfs`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `knowledge_edges`;
DROP TABLE IF EXISTS `course_modules`;
DROP TABLE IF EXISTS `metadata`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `metadata` (
  `key` varchar(120) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `course_modules` (
  `id` varchar(40) NOT NULL,
  `title` varchar(255) NOT NULL,
  `level` varchar(120) DEFAULT NULL,
  `target` text,
  `chain` text,
  `raw_json` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `knowledge_edges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `source` varchar(255) NOT NULL,
  `relation` varchar(255) NOT NULL,
  `target` varchar(255) NOT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `use_text` text,
  `raw_json` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_knowledge_edges_source` (`source`),
  KEY `idx_knowledge_edges_target` (`target`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `questions` (
  `id` varchar(120) NOT NULL,
  `module_id` varchar(40) DEFAULT NULL,
  `question_type` varchar(60) NOT NULL,
  `difficulty` varchar(40) DEFAULT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `stem` text NOT NULL,
  `options_json` json DEFAULT NULL,
  `answer_index` int DEFAULT NULL,
  `answer_text` text,
  `accepted_answers_json` json DEFAULT NULL,
  `scoring_points_json` json DEFAULT NULL,
  `explain_text` text,
  `source_type` varchar(120) DEFAULT NULL,
  `source_name` varchar(255) DEFAULT NULL,
  `review_status` varchar(120) DEFAULT NULL,
  `commercial_batch` varchar(120) DEFAULT NULL,
  `raw_json` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_questions_module` (`module_id`),
  KEY `idx_questions_type` (`question_type`),
  KEY `idx_questions_topic` (`topic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `exam_pdfs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `paper` varchar(120) NOT NULL,
  `title` varchar(255) NOT NULL,
  `page_url` text,
  `pdf_url` text,
  `pdf_name` varchar(255) DEFAULT NULL,
  `local_path` text NOT NULL,
  `bytes` bigint DEFAULT NULL,
  `sha256` char(64) DEFAULT NULL,
  `status` varchar(80) NOT NULL,
  `cached_at` varchar(80) DEFAULT NULL,
  `raw_json` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_exam_pdfs_year_paper` (`year`, `paper`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
