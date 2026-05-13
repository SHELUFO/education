# Chem Web

独立版化学连接学习网页应用，从 `Chem` 小程序项目的本地预览页提纯而来，面向内部学习、评审和题库整理。

## 功能

- 化学知识网络：焦点节点、关联知识点、总览缩放和滚轮缩放。
- 课程学习：折叠式课程内容、相关知识点跳转、相关课程跳转。
- 练习题库：选择、判断、填空、简答、计算、实验、推断、流程题等题型。
- 智能组卷：自定义知识点权重、题型结构和总分分配。
- PDF 导出：通过浏览器打印生成试卷、答题卡和答案解析。
- 本地题图：实验装置图、推断关系图、工艺流程图等。
- 学习档案：本地记录答题数、正确率、错题和课程完成状态。
- 每日练：按薄弱模块、错题模块和基础保分题生成练习。
- 阶段报告：汇总正确率、薄弱模块和复习入口。
- 内部参考资料：缓存高考化学 PDF 原卷/解析，用于后续拆题和校对。

## 运行

```powershell
npm run verify
npm start
```

默认访问：

```text
http://localhost:5188/
```

## MySQL 数据库

本项目发布包使用 MySQL，不再依赖 SQLite。

生成 MySQL 建库脚本：

```powershell
npm run mysql:dump
```

输出文件：

```text
data/mysql/schema.sql
data/mysql/data.sql
data/mysql/chem_web_mysql.sql
```

默认数据库名：

```text
chem_web_internal
```

发布包中可双击 `导入MySQL数据库.bat` 或 `IMPORT_MYSQL.bat` 导入数据库。

## 目录

```text
Chem-Web/
  data/
    content.json
    mysql/
      schema.sql
      data.sql
      chem_web_mysql.sql
    exam-pdfs/
      manifest.json
      *.pdf
  public/
    index.html
    styles.css
    js/
    preview-data.js
    assets/
  scripts/
    build-data.js
    create-mysql-dump.js
    build-release.js
    verify.js
  docs/
    commercialization-plan.md
  server.js
  package.json
```

## 维护

- 源数据在 `data/content.json`。
- 浏览器加载数据在 `public/preview-data.js`，修改源数据后运行 `npm run build:data`。
- MySQL SQL 由 `scripts/create-mysql-dump.js` 生成。
- 页面逻辑在 `public/js/`，样式在 `public/styles.css`。
- 学习记录保存在浏览器 `localStorage`，可在资料页导出或导入。
- 修改后运行 `npm run verify`。
