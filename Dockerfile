# Tahap 1: Build aplikasi React (Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Salin package.json dan install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Salin seluruh source code HRIS dan jalankan build
COPY . .
RUN npm run build

# Tahap 2: Jalankan sebagai Web Server ringan untuk Production
FROM node:20-alpine

WORKDIR /app

# Install 'serve' untuk menjalankan hasil build React (SPA)
RUN npm install -g serve

# Ambil hanya folder hasil build ('dist') dari Tahap 1
COPY --from=builder /app/dist ./dist

# Buka port 3000
EXPOSE 3000

# Jalankan web server (-s agar semua route React Router diarahkan ke index.html)
CMD ["serve", "-s", "dist", "-l", "3000"]
