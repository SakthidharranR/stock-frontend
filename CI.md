# Frontend CI/CD

GitHub Actions in this repo:

1. **`test`** — `npm ci`, `npm test`, `npm run build`. Required to merge.
2. **`deploy`** — only on push to `main`/`master` after `test` passes. Builds with production `VITE_*` secrets, uploads to S3, invalidates CloudFront.

## Secrets

Repo → **Settings → Secrets and variables → Actions**. Add:

| Secret | Value |
|--------|--------|
| `AWS_ACCESS_KEY_ID` | IAM user that can write the SPA bucket and invalidate CloudFront |
| `AWS_SECRET_ACCESS_KEY` | Matching secret |
| `VITE_COGNITO_REGION` | `us-east-1` |
| `VITE_COGNITO_USER_POOL_ID` | Same as local `.env.production` |
| `VITE_COGNITO_CLIENT_ID` | Same |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI host, no `https://` |
| `VITE_COGNITO_OAUTH_REDIRECT_URI` | `https://d376knhcx5j7c7.cloudfront.net/auth/callback` |
| `VITE_COGNITO_OAUTH_SCOPES` | `openid email` |
| `VITE_IDENTITY_API_URL` | `https://54-85-138-59.sslip.io/identity` |
| `VITE_MARKET_API_URL` | `https://54-85-138-59.sslip.io/market` |
| `VITE_PORTFOLIO_API_URL` | `https://54-85-138-59.sslip.io/portfolio` |

Do not commit `.env.production`.

## Branch protection (merge gate)

After the first Actions run appears:

1. GitHub → this repo → **Settings → Rules → Rulesets → New ruleset → Branch ruleset**
2. Target pattern: `main` (and `master` if you use it)
3. **Require a pull request before merging**
4. **Require status checks to pass** → add **`test`**
5. Save

Until this is on, people can still merge with failing tests.

## IAM (minimum)

Allow `s3:ListBucket` on `arn:aws:s3:::stock-app-spa-sakthi-211125434900`, `s3:GetObject` / `PutObject` / `DeleteObject` on `arn:aws:s3:::stock-app-spa-sakthi-211125434900/*`, and `cloudfront:CreateInvalidation` on distribution `E3ODP6EPFAJSK1`.
