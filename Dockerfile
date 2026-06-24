FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
# Probe the port the app actually binds ($PORT), falling back to 3000 — so a
# platform-injected PORT other than 3000 can't leave a healthy app failing its
# healthcheck (which would make the proxy stop routing and return 502).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/health" || exit 1
CMD ["node", "server.js"]
