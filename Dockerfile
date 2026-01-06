FROM ghcr.io/puppeteer/puppeteer:21.5.0

WORKDIR /usr/src/app

# 1. Setup permissions on the folder FIRST (while empty)
USER root
RUN chown -R pptruser:pptruser /usr/src/app

# 2. Switch user NOW (before installing anything)
USER pptruser

# 3. Copy files with ownership already set
COPY --chown=pptruser:pptruser package*.json ./

# 4. Install dependencies (Fast, because no permission fixing needed later)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci

# 5. Generate Prisma
COPY --chown=pptruser:pptruser prisma ./prisma
RUN npx prisma generate

# 6. Copy code
COPY --chown=pptruser:pptruser . .

EXPOSE 3000
CMD ["node", "src/server.js"]
