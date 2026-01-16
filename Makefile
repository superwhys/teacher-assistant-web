SHELL := /bin/bash

.PHONY: help build deploy

SERVER ?= hs-master
NGINX_WWW ?= /etc/nginx/www
FOLDER ?=
DIST_DIR ?= dist
REMOTE_DIR = $(NGINX_WWW)/$(FOLDER)

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
	ssh $(SERVER) "mkdir -p $(REMOTE_DIR)/"
	scp -r $(DIST_DIR)/* $(SERVER):$(REMOTE_DIR)/
	@printf "[%s] deploy ok: server=%s folder=%s remote=%s\n" "$$(date '+%F %T')" "$(SERVER)" "$(FOLDER)" "$(REMOTE_DIR)"