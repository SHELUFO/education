const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentPath = path.join(root, "data", "content.json");
const pdfManifestPath = path.join(root, "data", "exam-pdfs", "manifest.json");
const outDir = path.join(root, "data", "mysql");
const schemaPath = path.join(outDir, "schema.sql");
const dataPath = path.join(outDir, "data.sql");
const fullPath = path.join(outDir, "chem_web_mysql.sql");

const dbName = process.env.CHEM_MYSQL_DATABASE || "chem_web_internal";

function sqlString(value) {
  if (value === undefined || value === null) return "NULL";
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "\\'")}'`;
}

function sqlNumber(value) {
  if (value === undefined || value === null || value === "") return "NULL";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "NULL";
}

function json(value) {
  return value === undefined ? null : JSON.stringify(value);
}

function row(values) {
  return `(${values.join(", ")})`;
}

function insertRows(table, columns, rows) {
  if (!rows.length) return "";
  const chunks = [];
  const size = 100;
  for (let index = 0; index < rows.length; index += size) {
    const part = rows.slice(index, index + size);
    chunks.push(`INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES\n${part.join(",\n")};`);
  }
  return `${chunks.join("\n\n")}\n`;
}

function buildSchema() {
  return `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE \`${dbName}\`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS \`exam_pdfs\`;
DROP TABLE IF EXISTS \`questions\`;
DROP TABLE IF EXISTS \`knowledge_edges\`;
DROP TABLE IF EXISTS \`course_modules\`;
DROP TABLE IF EXISTS \`metadata\`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE \`metadata\` (
  \`key\` varchar(120) NOT NULL,
  \`value\` text NOT NULL,
  PRIMARY KEY (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE \`course_modules\` (
  \`id\` varchar(40) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`level\` varchar(120) DEFAULT NULL,
  \`target\` text,
  \`chain\` text,
  \`raw_json\` json NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE \`knowledge_edges\` (
  \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
  \`source\` varchar(255) NOT NULL,
  \`relation\` varchar(255) NOT NULL,
  \`target\` varchar(255) NOT NULL,
  \`topic\` varchar(255) DEFAULT NULL,
  \`use_text\` text,
  \`raw_json\` json NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_knowledge_edges_source\` (\`source\`),
  KEY \`idx_knowledge_edges_target\` (\`target\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE \`questions\` (
  \`id\` varchar(120) NOT NULL,
  \`module_id\` varchar(40) DEFAULT NULL,
  \`question_type\` varchar(60) NOT NULL,
  \`difficulty\` varchar(40) DEFAULT NULL,
  \`topic\` varchar(255) DEFAULT NULL,
  \`stem\` text NOT NULL,
  \`options_json\` json DEFAULT NULL,
  \`answer_index\` int DEFAULT NULL,
  \`answer_text\` text,
  \`accepted_answers_json\` json DEFAULT NULL,
  \`scoring_points_json\` json DEFAULT NULL,
  \`explain_text\` text,
  \`source_type\` varchar(120) DEFAULT NULL,
  \`source_name\` varchar(255) DEFAULT NULL,
  \`review_status\` varchar(120) DEFAULT NULL,
  \`commercial_batch\` varchar(120) DEFAULT NULL,
  \`raw_json\` json NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_questions_module\` (\`module_id\`),
  KEY \`idx_questions_type\` (\`question_type\`),
  KEY \`idx_questions_topic\` (\`topic\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE \`exam_pdfs\` (
  \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
  \`year\` int NOT NULL,
  \`paper\` varchar(120) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`page_url\` text,
  \`pdf_url\` text,
  \`pdf_name\` varchar(255) DEFAULT NULL,
  \`local_path\` text NOT NULL,
  \`bytes\` bigint DEFAULT NULL,
  \`sha256\` char(64) DEFAULT NULL,
  \`status\` varchar(80) NOT NULL,
  \`cached_at\` varchar(80) DEFAULT NULL,
  \`raw_json\` json NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_exam_pdfs_year_paper\` (\`year\`, \`paper\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;
}

function buildData(content, pdfManifest) {
  const statements = [`USE \`${dbName}\`;`, "SET NAMES utf8mb4;", "START TRANSACTION;"];

  statements.push(insertRows("metadata", ["key", "value"], [
    row([sqlString("app"), sqlString("Chem Web Internal Reference")]),
    row([sqlString("question_count"), sqlString(String(content.questions.length))]),
    row([sqlString("pdf_count"), sqlString(String((pdfManifest.items || []).length))])
  ]));

  statements.push(insertRows("course_modules", ["id", "title", "level", "target", "chain", "raw_json"], content.courseModules.map((module) => row([
    sqlString(module.id),
    sqlString(module.title),
    sqlString(module.level),
    sqlString(module.target),
    sqlString(module.chain),
    sqlString(json(module))
  ]))));

  statements.push(insertRows("knowledge_edges", ["source", "relation", "target", "topic", "use_text", "raw_json"], content.edges.map((edge) => row([
    sqlString(edge.from),
    sqlString(edge.relation),
    sqlString(edge.to),
    sqlString(edge.topic),
    sqlString(edge.use),
    sqlString(json(edge))
  ]))));

  statements.push(insertRows("questions", [
    "id", "module_id", "question_type", "difficulty", "topic", "stem",
    "options_json", "answer_index", "answer_text", "accepted_answers_json",
    "scoring_points_json", "explain_text", "source_type", "source_name",
    "review_status", "commercial_batch", "raw_json"
  ], content.questions.map((question) => row([
    sqlString(question.id),
    sqlString(question.moduleId),
    sqlString(question.questionType || question.type || "single_choice"),
    sqlString(question.difficulty),
    sqlString(question.topic),
    sqlString(question.stem),
    sqlString(json(question.options ?? null)),
    sqlNumber(question.answer),
    sqlString(question.answerText),
    sqlString(json(question.acceptedAnswers ?? null)),
    sqlString(json(question.scoringPoints ?? null)),
    sqlString(question.explain),
    sqlString(question.sourceType),
    sqlString(question.sourceName),
    sqlString(question.reviewStatus),
    sqlString(question.commercialBatch),
    sqlString(json(question))
  ]))));

  statements.push(insertRows("exam_pdfs", [
    "year", "paper", "title", "page_url", "pdf_url", "pdf_name",
    "local_path", "bytes", "sha256", "status", "cached_at", "raw_json"
  ], (pdfManifest.items || []).map((item) => row([
    sqlNumber(item.year),
    sqlString(item.paper),
    sqlString(item.title),
    sqlString(item.pageUrl),
    sqlString(item.pdfUrl),
    sqlString(item.pdfName),
    sqlString(item.localPath),
    sqlNumber(item.bytes),
    sqlString(item.sha256),
    sqlString(item.status),
    sqlString(item.cachedAt),
    sqlString(json(item))
  ]))));

  statements.push("COMMIT;");
  return `${statements.filter(Boolean).join("\n\n")}\n`;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const pdfManifest = fs.existsSync(pdfManifestPath)
    ? JSON.parse(fs.readFileSync(pdfManifestPath, "utf8"))
    : { items: [] };
  const schema = buildSchema();
  const data = buildData(content, pdfManifest);
  fs.writeFileSync(schemaPath, schema, "utf8");
  fs.writeFileSync(dataPath, data, "utf8");
  fs.writeFileSync(fullPath, `${schema}\n${data}`, "utf8");
  console.log(`Wrote ${path.relative(root, fullPath)}`);
}

main();
