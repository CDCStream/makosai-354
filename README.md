# 🚀 ArbitrageAI - Real-time Crypto Arbitrage Scanner

**Real-time crypto arbitrage opportunities powered by AI - Make money while you sleep**

![ArbitrageAI Dashboard](https://via.placeholder.com/800x400/0a0e17/00d4ff?text=ArbitrageAI+Dashboard)

## ✨ Features

- **Real-time Scanning**: Monitors 5 major exchanges every second
- **Instant Alerts**: Telegram, Discord, and Email notifications
- **WebSocket Updates**: Live dashboard with real-time opportunities
- **Fee-Adjusted Profits**: All spreads calculated after trading fees
- **Lightning Fast**: Go backend for sub-millisecond latency

## 📊 Supported Exchanges

| Exchange | Fee | Status |
|----------|-----|--------|
| 🟡 Binance | 0.10% | ✅ Active |
| 🔵 Coinbase | 0.50% | ✅ Active |
| 🟣 Kraken | 0.26% | ✅ Active |
| 🟠 Bybit | 0.10% | ✅ Active |
| ⚪ OKX | 0.10% | ✅ Active |

## 🛠️ Tech Stack

### Backend (Go)
- **Fiber** - Fast HTTP framework
- **Goroutines** - Concurrent exchange scanning
- **WebSocket** - Real-time updates
- **PostgreSQL** - Historical data
- **Redis** - Price caching

### Frontend (Next.js 14)
- **React 19** - UI components
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **React Query** - Data fetching

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- Node.js 20+
- PostgreSQL (or Docker)
- Redis (or Docker)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/arbitrageai.git
cd arbitrageai

# Start all services
docker-compose up -d

# Access the dashboard
open http://localhost:3000
```

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Copy environment file
cp env.example .env

# Install dependencies
go mod tidy

# Run the server
go run cmd/api/main.go
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables (Backend)

```env
# Server
PORT=8080
ENVIRONMENT=development

# Database
DATABASE_URL=postgres://localhost:5432/arbitrage?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# Telegram Alerts
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Discord Alerts
DISCORD_WEBHOOK=your_webhook_url

# Arbitrage Settings
MIN_SPREAD_PERCENT=0.5
SCAN_INTERVAL_MS=1000
```

### Setting Up Telegram Alerts

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID via [@userinfobot](https://t.me/userinfobot)
3. Add tokens to `.env`

### Setting Up Discord Alerts

1. Go to Server Settings → Integrations → Webhooks
2. Create a new webhook
3. Copy the URL to `.env`

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/opportunities` | Get active opportunities |
| POST | `/api/v1/scan` | Trigger manual scan |
| GET | `/api/v1/exchanges` | List supported exchanges |
| GET | `/api/v1/pairs` | List trading pairs |
| WS | `/ws` | WebSocket connection |

## 📈 API Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": "arb_a1b2c3d4",
      "symbol": "BTC/USDT",
      "buy_exchange": "binance",
      "buy_price": 104250.50,
      "sell_exchange": "coinbase",
      "sell_price": 105150.75,
      "profit_percent": 0.26,
      "estimated_profit": 2.60,
      "detected_at": "2024-12-14T15:30:00Z",
      "status": "active"
    }
  ],
  "count": 1
}
```

## 🏗️ Project Structure

```
arbitrageai/
├── backend/
│   ├── cmd/api/          # Main entry point
│   ├── internal/
│   │   ├── arbitrage/    # Detection engine
│   │   ├── exchanges/    # Exchange clients
│   │   ├── alerts/       # Notification services
│   │   ├── models/       # Data models
│   │   └── websocket/    # WebSocket hub
│   └── pkg/config/       # Configuration
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── public/           # Static assets
├── docker-compose.yml
└── README.md
```

## 🎯 Roadmap

- [ ] **Phase 1**: MVP (Current)
  - [x] Real-time price fetching
  - [x] Arbitrage detection
  - [x] WebSocket updates
  - [x] Telegram/Discord alerts
  - [x] Dashboard UI

- [ ] **Phase 2**: Enhanced Features
  - [ ] Historical analytics
  - [ ] User authentication
  - [ ] Custom alert rules
  - [ ] More exchanges

- [ ] **Phase 3**: Pro Features
  - [ ] Auto-execution (API trading)
  - [ ] Backtesting
  - [ ] Portfolio tracking
  - [ ] Mobile app

## ⚠️ Disclaimer

This software is for educational and informational purposes only. Cryptocurrency trading involves substantial risk of loss. Past arbitrage opportunities do not guarantee future results. Always do your own research and never invest more than you can afford to lose.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

Built with ❤️ for crypto traders worldwide.

**ArbitrageAI.io** - *Make money while you sleep* 🚀

