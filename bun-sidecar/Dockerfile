# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Build Tailwind CSS
RUN bun run build:css

# Production stage
FROM base AS production
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app .

# Expose the port (Railway will set the PORT env variable)
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/server.ts"]
