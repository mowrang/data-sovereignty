#!/bin/bash

# Environment Manager Script
# Helps switch between dev, staging, and prod environments

set -e

ENV=${1:-dev}
COMPOSE_FILE="docker-compose.${ENV}.yml"
ENV_FILE=".env.${ENV}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_usage() {
    echo "Usage: $0 [dev|staging|prod] [command]"
    echo ""
    echo "Commands:"
    echo "  up          - Start all services"
    echo "  down        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  logs        - Show logs"
    echo "  build       - Build images"
    echo "  ps          - Show running containers"
    echo "  shell       - Open shell in web-ui container"
    echo "  db:shell    - Open PostgreSQL shell"
    echo "  db:init     - Initialize database schema"
    echo ""
    echo "Examples:"
    echo "  $0 dev up          - Start development environment"
    echo "  $0 staging logs    - Show staging logs"
    echo "  $0 prod down       - Stop production environment"
}

function check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}Warning: $ENV_FILE not found. Creating from template...${NC}"
        if [ -f ".env.full.example" ]; then
            cp .env.full.example "$ENV_FILE"
            echo -e "${GREEN}Created $ENV_FILE. Please update it with your configuration.${NC}"
        else
            echo -e "${RED}Error: .env.full.example not found. Cannot create $ENV_FILE${NC}"
            exit 1
        fi
    fi
}

function docker_compose() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

case "$ENV" in
    dev|staging|prod)
        check_env_file
        
        case "${2:-up}" in
            up)
                echo -e "${GREEN}Starting ${ENV} environment...${NC}"
                docker_compose up -d
                echo -e "${GREEN}${ENV} environment started!${NC}"
                echo ""
                echo "Services:"
                docker_compose ps
                ;;
            down)
                echo -e "${YELLOW}Stopping ${ENV} environment...${NC}"
                docker_compose down
                echo -e "${GREEN}${ENV} environment stopped.${NC}"
                ;;
            restart)
                echo -e "${YELLOW}Restarting ${ENV} environment...${NC}"
                docker_compose restart
                echo -e "${GREEN}${ENV} environment restarted.${NC}"
                ;;
            logs)
                docker_compose logs -f
                ;;
            build)
                echo -e "${GREEN}Building ${ENV} images...${NC}"
                docker_compose build --no-cache
                echo -e "${GREEN}Build complete!${NC}"
                ;;
            ps)
                docker_compose ps
                ;;
            shell)
                CONTAINER="resume-agent-web-ui-${ENV}"
                echo -e "${GREEN}Opening shell in ${CONTAINER}...${NC}"
                docker exec -it "$CONTAINER" /bin/sh
                ;;
            db:shell)
                CONTAINER="data-sovereignty-postgres-${ENV}"
                echo -e "${GREEN}Opening PostgreSQL shell in ${CONTAINER}...${NC}"
                docker exec -it "$CONTAINER" psql -U langgraph -d "langgraph_${ENV}"
                ;;
            db:init)
                CONTAINER="data-sovereignty-web-ui-${ENV}"
                echo -e "${GREEN}Initializing database schema in ${ENV}...${NC}"
                docker exec -it "$CONTAINER" npm run db:init
                ;;
            *)
                echo -e "${RED}Unknown command: $2${NC}"
                print_usage
                exit 1
                ;;
        esac
        ;;
    *)
        echo -e "${RED}Unknown environment: $ENV${NC}"
        print_usage
        exit 1
        ;;
esac
