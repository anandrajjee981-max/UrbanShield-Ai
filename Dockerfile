# ==========================================
# Stage 1: Build Frontend
# ==========================================

FROM node:20-alpine AS frontend_builder

WORKDIR /app/frontend

COPY ./frontend/package*.json ./

RUN npm install

COPY ./frontend ./

RUN npm run build


# ==========================================
# Stage 2: Build & Run Backend
# ==========================================

FROM node:20-alpine

WORKDIR /app

COPY ./backend/package*.json ./

RUN npm install

COPY ./backend ./

RUN npm run build

# Copy frontend production build
# into backend's public directory

COPY --from=frontend_builder /app/frontend/dist ./public

EXPOSE 4000

CMD ["npm", "start"]





