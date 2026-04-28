# PromptFeed Backend API

Backend API for the PromptFeed marketplace platform built with Node.js, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. **Setup database**
```bash
# Create PostgreSQL database
createdb promptfeed

# Run migrations
npm run prisma:migrate

# (Optional) Seed database with test data
npm run seed
```

5. **Start development server**
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── app.js           # Express app setup
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.js          # Seed data
├── tests/               # Test files
├── .env                 # Environment variables
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user
- `GET /api/users/:id` - Get user by ID

### Prompts
- `GET /api/prompts` - List prompts
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/:id` - Get prompt details
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt

### Marketplace
- `GET /api/marketplace/products` - List premium products
- `GET /api/marketplace/products/:id` - Get product details
- `POST /api/marketplace/purchase` - Purchase product

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments/transactions` - Get transactions

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `POST /api/subscriptions/subscribe` - Subscribe to plan
- `POST /api/subscriptions/cancel` - Cancel subscription

### Bounties
- `GET /api/bounties` - List bounties
- `POST /api/bounties` - Create bounty
- `POST /api/bounties/:id/submit` - Submit solution
- `POST /api/bounties/:id/award` - Award bounty

### Wallet
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/payout` - Request payout

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run seed         # Seed database
```

### Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `STRIPE_SECRET_KEY` - Stripe API key
- `FRONTEND_URL` - Frontend URL for CORS

## 🔒 Security

- JWT authentication
- bcrypt password hashing
- Helmet.js security headers
- Rate limiting
- Input validation with Zod
- SQL injection prevention (Prisma ORM)

## 📝 Database Schema

Main models:
- **User** - User accounts and authentication
- **Prompt** - User-created prompts
- **Product** - Premium prompts for sale
- **Transaction** - Purchase transactions
- **Subscription** - User subscriptions
- **Wallet** - User wallet and earnings
- **Bounty** - Bounty challenges
- **Review** - Product reviews

## 🚢 Deployment

### Docker
```bash
docker build -t promptfeed-backend .
docker run -p 5000:5000 promptfeed-backend
```

### Manual Deployment
1. Set `NODE_ENV=production`
2. Configure production database
3. Run migrations
4. Start with PM2: `pm2 start src/app.js`

## 📄 License

MIT

## 👥 Team

PromptFeed Development Team
