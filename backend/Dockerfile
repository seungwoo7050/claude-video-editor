FROM node:20-alpine

# Install FFmpeg and development libraries for native addon compilation
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++ \
    gcc \
    linux-headers

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install

# Build native addon
COPY ../native /app/native
WORKDIR /app/native
RUN npm install && npm run build

# Copy backend source
WORKDIR /app
COPY . .

EXPOSE 3001 3002

CMD ["npm", "run", "dev"]
