# Education 教育项目

Education 是一个教育类项目，包含化学和数学两个学科的网页应用，旨在为学生提供知识学习、练习题库和智能组卷等功能。

## 项目结构

```
education/
├── chem/          # 化学模块
├── math/          # 数学模块
└── docs/          # 项目文档
```

## 快速开始

### 化学模块

```bash
cd chem
npm install
npm run verify
npm start
```

访问 http://localhost:5188/

### 数学模块

开发中...

## 功能特性

### 化学模块
- 化学知识网络可视化
- 多种题型练习（选择、判断、填空等）
- 智能组卷和PDF导出
- 学习档案和进度跟踪
- 每日练习和阶段报告

### 数学模块
- 数学知识展示（规划中）
- 数学题目练习（规划中）

## 文档

- [产品文档](docs/PRODUCT.md) - 产品功能、用户场景、技术栈
- [架构文档](docs/ARCHITECTURE.md) - 系统架构、目录结构、数据流
- [变更日志](docs/CHANGELOG.md) - 版本更新记录
- [贡献指南](docs/CONTRIBUTING.md) - 如何参与项目开发
- [项目总结](docs/PROJECT_SUMMARY.md) - 项目整体概述

## 技术栈

- 前端：HTML5 + CSS3 + JavaScript
- 后端：Node.js
- 数据库：MySQL（生产环境）
- 数据存储：JSON（开发环境）

## 许可证

私有项目，仅供内部使用