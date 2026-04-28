# Prompt Marketplace — Project Context

## Project Summary
AI-powered prompt marketplace (StackOverflow + Twitter for prompts).
Users create, share, run, vote, comment, and benchmark prompts across multiple AI models.

## Tech Stack
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- Cache: Custom hash-based (Redis migration in progress)
- Queue: RabbitMQ
- Auth: JWT (refresh token implementation pending)
- Logging: AiLog model

## Database Models
User, Prompt, Vote, Comment, Skill, Bounty, ApiCache, AiLog

## Current Priority — Work Through This Order

### CRITICAL (This Week)
- [ ] Redis: rate limit counters, token blacklist, AI response cache
- [ ] Global unhandled rejection handler
- [ ] DB indexes: votes, ai_logs, prompts tables
- [ ] Health check endpoint /health

### HIGH (This Month)
- [ ] Remove semantic cache → hash-only Redis cache
- [ ] Isolate benchmark workers via RabbitMQ
- [ ] PgBouncer connection pooling
- [ ] Sentry error monitoring (free tier)

### BEFORE GO-LIVE
- [ ] JWT refresh token + blacklist
- [ ] AiLog monthly partitioning
- [ ] Separate escrowStatus → own Bounty/Payment table
- [ ] Load test with k6 (100 concurrent users)
- [ ] Graceful shutdown for RabbitMQ workers

## Architecture Rules
- Never block the main Express process with heavy AI calls
- All AI processing goes through RabbitMQ workers
- Benchmark jobs must be isolated from API process
- Read queries → future read replica, writes → master only

## Code Standards
- Always use async/await, never raw callbacks
- Wrap all DB calls in try/catch
- Never log raw user input
- All new endpoints must have rate limiting middleware

## Common Commands
```bash
npm run dev             # Start dev server
npx prisma migrate dev  # Run migrations
npx prisma studio       # DB GUI
docker-compose up       # Start PostgreSQL + RabbitMQ
```

## Known Technical Debt
- escrowStatus in Prompt table is temporary → will move to Bounty table
- cacheHits/costSaved will be aggregated from ApiCache, not stored in Prompt
- Semantic similarity cache will be removed → Redis hash cache replaces it
- Rate limit counters currently in-memory → moving to Redis

## Rules For Gemini
- Before changing any file, show what you're about to change and why
- Ask for the relevant file content before editing — do not assume structure
- One task at a time — complete and confirm before moving to next
- No refactoring unrelated code
- Always show exact code, no pseudocode
- If unsure about existing implementation, ask instead of guessing