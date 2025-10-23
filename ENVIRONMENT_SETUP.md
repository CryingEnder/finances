# Environment Variables Setup

## Development

Your `.env.local` file is already set up with a secure JWT secret and is gitignored.

## Production Deployment

### Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `JWT_SECRET`: Generate a new secure secret (see below)
   - `NODE_ENV`: `production`

### Other Platforms (Railway, Render, etc.)

Set the environment variables in your platform's dashboard:

- `JWT_SECRET`: Your secure JWT secret
- `NODE_ENV`: `production`

## Generating Secure JWT Secrets

### Option 1: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option 2: Using OpenSSL

```bash
openssl rand -base64 32
```

### Option 3: Online Generator

Use a secure random string generator (32+ characters recommended)

## Environment File Priority

Next.js loads environment variables in this order:

1. `.env.local` (always loaded, gitignored)
2. `.env.development` (when NODE_ENV=development)
3. `.env.production` (when NODE_ENV=production)
4. `.env` (default)

## Security Notes

- Never commit `.env.local` or `.env.production` files
- Use different JWT secrets for each environment
- Rotate JWT secrets periodically in production
- Keep secrets at least 32 characters long
