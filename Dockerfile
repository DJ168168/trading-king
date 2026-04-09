FROM node:22-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 安装依赖（允许 lockfile 不完全匹配）
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY . .

# 构建前端和后端
RUN pnpm run build

# 生产镜像
FROM node:22-alpine AS runner

RUN npm install -g pnpm@10.4.1

WORKDIR /app

# 复制构建产物和必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# 前端构建产物在 dist/public 目录（由 vite.config.ts 中的 outDir 决定）
# 已包含在 /app/dist 中

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
