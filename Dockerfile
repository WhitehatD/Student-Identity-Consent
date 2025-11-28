FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY hardhat.config.ts ./
COPY foundry.toml ./

RUN npm ci

COPY contracts ./contracts
COPY ignition ./ignition
COPY scripts ./scripts
COPY shared ./shared
COPY start-hardhat.sh ./

# skip tests
RUN npx hardhat compile --force

RUN chmod +x start-hardhat.sh

EXPOSE 8545

CMD ["./start-hardhat.sh"]

