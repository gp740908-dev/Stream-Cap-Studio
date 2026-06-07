FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
