.PHONY: install start stop clean test lint format build deploy

# Install dependencies
install:
	npm install

# Start development server
start:
	npm run start:chem

# Stop all containers
stop:
	docker-compose down

# Clean build artifacts
clean:
	rm -rf node_modules
	rm -rf chem/node_modules
	rm -rf dist
	rm -rf build

# Run tests
test:
	npm test

# Lint code
lint:
	npm run lint

# Format code
format:
	npm run format

# Build for production
build:
	cd chem && npm run release:build

# Deploy with Docker
deploy:
	docker-compose up -d

# View logs
logs:
	docker-compose logs -f

# Backup database
backup:
	docker-compose exec db mysqldump -u root -p chem_web_internal > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Restore database
restore:
	docker-compose exec -T db mysql -u root -p chem_web_internal < $(FILE)

# Generate MySQL dump
mysql-dump:
	npm run mysql:dump:chem

# Verify project
verify:
	npm run verify:chem

# Build data
build-data:
	npm run build:data:chem

# Help
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  start       - Start development server"
	@echo "  stop        - Stop all containers"
	@echo "  clean       - Clean build artifacts"
	@echo "  test        - Run tests"
	@echo "  lint        - Lint code"
	@echo "  format      - Format code"
	@echo "  build       - Build for production"
	@echo "  deploy      - Deploy with Docker"
	@echo "  logs        - View logs"
	@echo "  backup      - Backup database"
	@echo "  restore     - Restore database (FILE=backup.sql)"
	@echo "  mysql-dump  - Generate MySQL dump"
	@echo "  verify      - Verify project"
	@echo "  build-data  - Build data"
	@echo "  help        - Show this help"