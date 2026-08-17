# Markets Forge frontend

React + Vite app for auth flows (Cognito) and future trading UI.

## Setup

```bash
npm install
cp .env.example .env
# Fill Cognito User Pool ID and App Client ID
npm run dev
```

Open http://localhost:5173/login

Production (S3 + CloudFront): copy `.env.production.example` to `.env.production`, then `.\scripts\deploy-cloudfront.ps1`. See [../DEPLOY.md](../DEPLOY.md).

CI/CD (tests + auto-deploy): [CI.md](CI.md).

## Tests

```bash
npm test
```

## Routes

| Path | Status |
|------|--------|
| `/login` | Complete (Cognito sign-in) |
| `/register` | Complete (Cognito signUp) |
| `/confirm-email` | Email verification code (after sign up) |
| `/forgot-password` | Placeholder |
| `/change-password` | Placeholder (redirect target for forced new password) |
| `/home` | Protected after login |

## Cognito app client

- Type: **Public client** (no secret) for SPA
- Enable username/password auth
- Callback URLs not required if using custom UI (not Hosted UI)
