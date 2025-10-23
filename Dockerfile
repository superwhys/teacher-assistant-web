# builder
FROM hoven-registry-cn-beijing.cr.volces.com/base/node:22-alpine AS build

WORKDIR /app

COPY . .

RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

# runner
FROM hoven-registry-cn-beijing.cr.volces.com/base/nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
