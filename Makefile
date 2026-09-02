SHELL := /bin/bash

.PHONY: help build deploy

SERVER ?= ali-prod
NGINX_WWW ?= /etc/nginx/www
FOLDER ?= teacher.superwhys.top
DIST_DIR ?= dist
REMOTE_DIR = $(NGINX_WWW)/$(FOLDER)
STAGING_DIR = $(REMOTE_DIR).staging
OLD_DIR = $(REMOTE_DIR).old

help:
	@echo "用法："
	@echo "  make build"
	@echo "  make deploy FOLDER=你的目录名（必传）"
	@echo ""
	@echo "可选参数："
	@echo "  SERVER=hs-master"
	@echo "  NGINX_WWW=/etc/nginx/www"
	@echo "  DIST_DIR=dist"

build:
	pnpm run build

check_folder:
	@test -n "$(strip $(FOLDER))" || (echo "错误：请传递 FOLDER=xxx（将部署到 $(NGINX_WWW)/xxx/）" && exit 1)

deploy: check_folder build
	ssh $(SERVER) "rm -rf '$(STAGING_DIR)' && mkdir -p '$(STAGING_DIR)'"
	scp -r $(DIST_DIR)/* $(SERVER):'$(STAGING_DIR)/'
	ssh $(SERVER) "\
		set -e; \
		rm -rf '$(OLD_DIR)'; \
		if [ -e '$(REMOTE_DIR)' ]; then mv '$(REMOTE_DIR)' '$(OLD_DIR)'; fi; \
		if ! mv '$(STAGING_DIR)' '$(REMOTE_DIR)'; then \
			if [ -e '$(OLD_DIR)' ]; then mv '$(OLD_DIR)' '$(REMOTE_DIR)'; fi; \
			exit 1; \
		fi; \
		rm -rf '$(OLD_DIR)'"
	@printf "[%s] deploy ok: server=%s folder=%s remote=%s\n" "$$(date '+%F %T')" "$(SERVER)" "$(FOLDER)" "$(REMOTE_DIR)"