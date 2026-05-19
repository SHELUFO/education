# 贡献指南

感谢您对 Education 项目的关注！本文档将指导您如何为项目做出贡献。

## 开发环境准备

### 系统要求

- Node.js >= 18
- npm >= 8
- Git

### 安装步骤

1. 克隆项目仓库
```bash
git clone https://github.com/your-username/education.git
cd education
```

2. 安装依赖
```bash
npm install
```

3. 启动化学模块
```bash
npm run start:chem
```

## 项目结构

```
education/
├── chem/          # 化学模块
├── math/          # 数学模块
├── docs/          # 项目文档
└── scripts/       # 构建脚本
```

## 开发规范

### 代码风格

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 Airbnb JavaScript 风格指南

### 提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链更新

### 分支管理

- `main`: 主分支，用于生产环境
- `develop`: 开发分支
- `feature/*`: 功能分支
- `bugfix/*`: 修复分支
- `release/*`: 发布分支

## 提交流程

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 开发指南

### 化学模块开发

```bash
# 进入化学模块目录
cd chem

# 验证项目
npm run verify

# 启动开发服务器
npm start

# 构建数据
npm run build:data

# 生成MySQL脚本
npm run mysql:dump
```

### 数据管理

- 主数据文件：`chem/data/content.json`
- 前端数据文件：`chem/public/preview-data.js`
- 修改数据后运行：`npm run build:data:chem`

### 测试

```bash
# 运行所有测试
npm test

# 运行化学模块测试
npm run test:chem
```

## 文档贡献

- 产品文档：`PRODUCT.md`
- 架构文档：`ARCHITECTURE.md`
- 变更日志：`CHANGELOG.md`

## 问题反馈

- 使用 GitHub Issues 报告bug
- 使用 GitHub Discussions 进行讨论
- 使用 GitHub Pull Requests 提交代码

## 行为准则

- 尊重所有参与者
- 接受建设性批评
- 专注于对社区最有利的事情
- 对他人表示同理心

## 许可证

通过贡献您同意您的贡献将在项目许可证下获得许可。