.PHONY: help install dev prod build clean test deploy

help: ## Show this help message
	@echo "Petroverse Analytics Platform - Makefile Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing dependencies..."
	cd apps/web && npm install
	cd services/analytics && pip install -r requirements.txt

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose up -d postgres
	cd services/analytics && uvicorn main:app --reload --port 8000 &
	cd apps/web && npm run dev

prod: ## Start production environment with Docker
	@echo "Starting production environment..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose build

clean: ## Clean up containers and volumes
	@echo "Cleaning up..."
	docker-compose down -v
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
	rm -rf services/analytics/__pycache__

test: ## Run tests
	@echo "Running tests..."
	cd services/analytics && python -m pytest
	cd apps/web && npm test

deploy: ## Deploy to production
	@echo "Deploying to production..."
	git pull origin master
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	docker-compose exec postgres psql -U postgres -d petroverse_analytics -f /docker-entrypoint-initdb.d/01-schema.sql

db-setup: ## Setup database
	@echo "Setting up database..."
	docker-compose up -d postgres
	sleep 5
	docker-compose exec postgres psql -U postgres -c "CREATE DATABASE petroverse_analytics;"
	docker-compose exec postgres psql -U postgres -d petroverse_analytics -f /docker-entrypoint-initdb.d/01-schema.sql
	python database/setup_database.py

db-backup: ## Backup database
	@echo "Backing up database..."
	docker-compose exec postgres pg_dump -U postgres petroverse_analytics > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore database from backup
	@echo "Restoring database from backup..."
	docker-compose exec postgres psql -U postgres -d petroverse_analytics < $(BACKUP_FILE)

logs: ## Show logs
	docker-compose logs -f

status: ## Show container status
	docker-compose ps

stop: ## Stop all containers
	docker-compose stop

restart: ## Restart all containers
	docker-compose restart