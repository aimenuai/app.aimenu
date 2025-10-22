# Local Development Setup with Supabase Secrets

This guide explains how to set up your local development environment to use Supabase secrets, including the CLAUDE_API_KEY.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Access to the Supabase project (project ref: `bbwgtnjbocypryekesyr`)

## Setup Steps

### 1. Install Supabase CLI (if not already installed)

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (via npm)
npm install -g supabase

# Or via npx (no installation needed)
npx supabase --help
```

### 2. Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate with your Supabase account.

### 3. Link Your Local Project to Supabase

```bash
# From the project root directory
supabase link --project-ref bbwgtnjbocypryekesyr
```

You'll be prompted to enter your database password. This links your local environment to the production Supabase project.

### 4. Verify Secrets are Accessible

```bash
# List all secrets
supabase secrets list

# You should see:
# - CLAUDE_API_KEY
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - SUPABASE_DB_URL
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

### 5. Start Local Supabase Services

```bash
# Start all Supabase services locally
supabase start
```

This will start:
- PostgreSQL database on port 54322
- API server on port 54321
- Studio on port 54323
- Edge Functions on port 54325

### 6. Serve Edge Functions Locally

To test Edge Functions locally with access to secrets:

```bash
# Serve all functions
supabase functions serve

# Or serve a specific function
supabase functions serve parse-menu-image
```

The Edge Functions will now have access to all Supabase secrets, including CLAUDE_API_KEY.

### 7. Update Your Frontend .env for Local Testing

When testing locally, your frontend should point to the local Supabase instance:

```bash
# .env.local (create this file for local development)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
```

To get the local anon key:
```bash
supabase status
```

Look for the `anon key` in the output.

## How It Works

### Production Environment
- Edge Functions deployed to Supabase automatically have access to secrets
- Secrets are accessed via `Deno.env.get("SECRET_NAME")`

### Local Development
- When you run `supabase functions serve`, the CLI fetches secrets from your linked project
- The same `Deno.env.get()` calls work seamlessly in both environments
- No need to maintain separate .env files for secrets

## Managing Secrets

### View Secrets
```bash
supabase secrets list
```

### Set a New Secret
```bash
supabase secrets set SECRET_NAME=value
```

### Update CLAUDE_API_KEY
```bash
supabase secrets set CLAUDE_API_KEY=sk-ant-api03-your-new-key-here
```

### Delete a Secret
```bash
supabase secrets unset SECRET_NAME
```

## Troubleshooting

### Edge Function Can't Access CLAUDE_API_KEY Locally

1. Ensure you're linked to the project:
   ```bash
   supabase link --project-ref bbwgtnjbocypryekesyr
   ```

2. Verify secrets are listed:
   ```bash
   supabase secrets list
   ```

3. Restart the functions server:
   ```bash
   supabase functions serve
   ```

### "Project not linked" Error

Run:
```bash
supabase link --project-ref bbwgtnjbocypryekesyr
```

### Database Password Required

If you don't know the database password:
1. Go to Supabase Dashboard
2. Navigate to Project Settings > Database
3. Reset the database password if needed

## Important Notes

- **Never commit secrets to git**: The `.env` file is in `.gitignore`
- **Production secrets are stored in Supabase**: Not in local files
- **Local testing uses the same secrets**: Via the Supabase CLI link
- **Secrets are encrypted**: Both in transit and at rest

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
