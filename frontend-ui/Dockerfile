FROM node:20-alpine

WORKDIR /workspace

COPY shared/ ./shared/

WORKDIR /workspace/frontend-ui

COPY frontend-ui/package*.json ./

RUN npm ci

COPY frontend-ui/ .

RUN chmod +x start-frontend.sh

ARG VITE_RPC_URL=http://localhost:8545
ENV VITE_RPC_URL=${VITE_RPC_URL}

EXPOSE 5173

CMD ["./start-frontend.sh"]

