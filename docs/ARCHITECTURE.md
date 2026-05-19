# Education 项目架构文档

## 系统架构概述

Education 项目采用前后端分离的架构，前端为纯静态网页，后端为 Node.js 服务器，数据存储支持 JSON 文件和 MySQL 数据库两种方式。

## 目录结构

```
education/
├── chem/                    # 化学模块
│   ├── data/                # 数据文件
│   │   ├── content.json     # 主数据文件
│   │   ├── mysql/           # MySQL 相关脚本
│   │   └── exam-pdfs/       # 考试 PDF 文件
│   ├── public/              # 前端静态文件
│   │   ├── index.html       # 主页面
│   │   ├── styles.css       # 样式文件
│   │   ├── js/              # JavaScript 文件
│   │   └── assets/          # 静态资源
│   ├── scripts/             # 构建脚本
│   ├── server.js            # Node.js 服务器
│   └── package.json         # 项目配置
├── math/                    # 数学模块
│   └── README.md            # 模块说明
├── PRODUCT.md               # 产品文档
└── ARCHITECTURE.md          # 架构文档
```

## 技术架构

### 1. 前端架构

- **技术栈**：原生 HTML5 + CSS3 + JavaScript
- **模块化**：按功能划分 JS 模块
- **数据渲染**：客户端渲染，数据通过 JSON 文件加载
- **状态管理**：使用 localStorage 存储用户学习记录

### 2. 后端架构

- **服务器**：Node.js HTTP 服务器
- **端口**：默认 5188
- **静态文件服务**：直接提供 public 目录下的静态文件
- **API 接口**：当前为纯静态文件服务，无 REST API

### 3. 数据架构

#### 3.1 开发环境
- **数据源**：`data/content.json`
- **数据库**：无需数据库，直接读取 JSON 文件
- **数据构建**：通过 `npm run build:data` 生成前端数据

#### 3.2 生产环境
- **数据库**：MySQL
- **数据库名**：`chem_web_internal`
- **数据导入**：通过 SQL 脚本导入
- **数据导出**：通过 `npm run mysql:dump` 生成 SQL 脚本

## 核心模块

### 1. 数据管理模块

- **数据源管理**：维护 `content.json` 主数据文件
- **数据构建**：将源数据转换为前端可用格式
- **数据同步**：支持 MySQL 数据库导入导出

### 2. 前端渲染模块

- **知识网络**：可视化展示化学知识点关联
- **课程展示**：折叠式课程内容展示
- **题库系统**：多种题型的展示和交互
- **学习记录**：本地存储学习进度和成绩

### 3. 试卷生成模块

- **智能组卷**：根据知识点和题型自动组卷
- **PDF 导出**：生成标准试卷格式
- **答案解析**：配套答案和解析文档

## 构建和部署

### 开发环境

```bash
# 安装依赖
npm install

# 验证项目
npm run verify

# 启动开发服务器
npm start
```

### 生产部署

```bash
# 构建发布版本
npm run release:build

# 生成 MySQL 数据库脚本
npm run mysql:dump

# 导入数据库（Windows）
导入MySQL数据库.bat
```

## 数据流

```
content.json → build-data.js → preview-data.js → 前端渲染
     ↓
create-mysql-dump.js → MySQL 数据库
```

## 安全设计

1. **本地访问**：服务器仅监听本地端口
2. **数据隔离**：用户数据存储在浏览器本地
3. **访问控制**：通过 `X-Robots-Tag` 禁止搜索引擎索引
4. **路径安全**：防止目录遍历攻击

## 扩展性设计

1. **模块化**：化学和数学模块独立，便于扩展新学科
2. **数据格式**：JSON 格式便于数据迁移和扩展
3. **数据库支持**：支持从 JSON 迁移到 MySQL
4. **题型扩展**：题库系统支持添加新题型