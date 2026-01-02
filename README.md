# PAJ Ramp Microservice

Node.js service that wraps the PAJ Ramp SDK for use with the Rust backend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your PAJ API key
```

3. Start the service:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Rates
- `GET /rates` - Get all exchange rates
- `POST /rates/calculate` - Calculate rate for specific amount

### Session Management
- `POST /session/initiate` - Send OTP to customer
- `POST /session/verify` - Verify OTP and create session

### Banks
- `GET /banks` - List supported banks (requires session token)
- `POST /banks/resolve` - Verify bank account details

### Orders
- `POST /orders/onramp` - Create onramp order (fiat → crypto)
- `POST /orders/offramp` - Create offramp order (crypto → fiat)

### Transactions
- `GET /transactions/:orderId` - Get order status

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAJ_SERVICE_PORT` | Service port | 3001 |
| `PAJ_BUSINESS_API_KEY` | PAJ Ramp business API key | - |
| `PAJ_ENVIRONMENT` | Environment (production/staging) | production |
| `USDC_MINT` | USDC token mint address | EPjF... |

## Docker Support

```bash
docker build -t paj-ramp-service .
docker run -p 3001:3001 --env-file .env paj-ramp-service
```

## Architecture

The Rust backend communicates with this service via HTTP:

```
┌─────────────┐     HTTP      ┌──────────────────┐     SDK     ┌─────────────┐
│ Rust Backend│ ────────────> │ PAJ Ramp Service │ ──────────> │ PAJ Ramp API│
└─────────────┘               └──────────────────┘             └─────────────┘
```

This approach allows us to use the JavaScript SDK without mixing Node.js into the Rust codebase.
