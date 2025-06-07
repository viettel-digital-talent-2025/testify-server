# ------- Stage 1: Build -------
FROM node:22-alpine AS builder


# Set the working directory inside the container
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and package-lock.json to the working directory
COPY package.json pnpm-lock.yaml ./

# Install the application dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Prisma
RUN pnpm dlx prisma generate

# Build the NestJS application
RUN pnpm run build

# ------- Stage 2: Final runtime -------
FROM node:22-alpine AS runner

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./

# Expose the application port
EXPOSE 3000

# Set the environment variable
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "dist/main"]
