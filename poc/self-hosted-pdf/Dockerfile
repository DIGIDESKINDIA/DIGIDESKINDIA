FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    qpdf \
    poppler-utils \
    ghostscript \
    libreoffice-nogui \
    zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY worker.mjs ./worker.mjs

EXPOSE 8080

CMD ["node", "worker.mjs"]