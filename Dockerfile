# builder
FROM node:22-alpine AS build

WORKDIR /app

COPY . .

RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

# runner
FROM nginx:1.27-alpine

COPY --from=build /app/dist /etc/nginx/www/teacher.superwhys.top
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
