# Simple Node.js server for frontend
FROM node:18-alpine

WORKDIR /app

# Install express for serving static files
RUN npm init -y && npm install express

# Copy static files
COPY public/ ./public/
COPY src/ ./src/

# Copy server file
COPY server.js .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start server
CMD ["node", "server.js"]
