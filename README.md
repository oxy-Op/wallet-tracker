# Wallet Tracker

A Solana wallet tracking application built with TypeScript, Express, and Prisma.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Yarn or npm

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Update the environment variables in `.env` with your configuration

5. Initialize Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Build the project:

```bash
npm run build
```

7. Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Project Structure

```
src/
├── lib/           # Shared libraries and utilities
├── services/      # Business logic and services
├── routes/        # API routes
├── types.ts       # Type definitions
├── utils.ts       # Utility functions
└── server.ts      # Main application file
```

## Features

- Express server with TypeScript
- Winston logging
- Morgan request logging
- Prisma ORM
- Solana web3.js integration
- Anchor framework integration
- CORS enabled
- Environment configuration
- Error handling middleware

## Current Capabilities

- Parses swap transactions through **Jupiter Aggregator**
- Displays trade history by route, slippage, impact, and platform (e.g., Jupiter, Raydium, Orca)
- Links directly to transaction details

## Contributing

This is an open source project! Contributions are welcome and appreciated. Feel free to open issues, suggest improvements, or add support for other aggregators/protocols.

## License

This project is provided under a custom license.

> **Note:** This project is **not intended for use in commercial or production-grade systems**. You may use and deploy it for personal or educational purposes.

## Contributors

Made with ❤️.

[![Contributors](https://contrib.rocks/image?repo=oxy-Op/wallet-tracker)](https://github.com/oxy-Op/wallet-tracker/graphs/contributors)
