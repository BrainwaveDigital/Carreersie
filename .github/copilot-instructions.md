# Careersie Codebase Guide for AI Agents

<!-- cSpell:words Careersie -->

## Architecture Overview

This is a **Turborepo monorepo** (v2.6.0) with pnpm workspaces managing multiple Next.js applications and shared packages. Key structure:

```
apps/
  ├─ web/        # Main Next.js app (port 3000) - Careersie platform UI
  └─ docs/       # Next.js documentation app (port 3001)
packages/
  ├─ ui/         # Shared React component library (@repo/ui)
  ├─ eslint-config/  # ESLint configurations for monorepo
  └─ typescript-config/  # Shared TypeScript configs
```

## Critical Workflows

### Development
```bash
pnpm install              # Install all dependencies
turbo dev                 # Start all apps in dev mode
turbo dev --filter=web    # Start only web app (http://localhost:3000)
turbo dev --filter=docs   # Start only docs app (http://localhost:3001)
```

### Building & Validation
```bash
turbo build       # Build all apps (Next.js output to .next/)
turbo lint        # Run ESLint across monorepo
turbo check-types # TypeScript validation
pnpm format       # Format with Prettier (ts, tsx, md files)
```

### Adding Components
- **Shared components**: Add to `packages/ui/src/` (exported via `./src/*.tsx`)
- **App-specific components**: Add to `apps/{web|docs}/src/components/`
- Use TypeScript interfaces for props (see `packages/ui/src/button.tsx` for examples)
- Mark client-side components with `"use client"` directive

## Project-Specific Patterns

### Monorepo Dependency Model
- **Workspace references**: Use `"workspace:*"` in package.json (e.g., `@repo/ui`)
- **Path aliasing**: Apps use `@/*` → `./src/*` (see `apps/web/tsconfig.json`)
- **Turborepo task dependencies**: `"build"` tasks depend on `^build` (carets = dependencies)
- **No build caching for dev**: `dev` task has `"cache": false` and `"persistent": true`

### Component Library (@repo/ui)
- Simple re-export module: Exports React components as named exports
- No CSS framework in package itself—apps apply styling independently
- Components must export TypeScript interfaces for props (required by consumers)
- Example pattern in `packages/ui/src/button.tsx`:
  ```tsx
  "use client";
  export interface ButtonProps { children: ReactNode; appName: string; }
  export const Button = ({ children, appName }: ButtonProps) => { ... }
  ```

### Styling Approach
- **Web app**: Tailwind CSS (3.4.18) + shadcn UI patterns (CVA variants)
- **Shadcn pattern**: Use `cva()` (class-variance-authority) for variant-based styling
- **Web imports**: `@repo/ui` components; style override via `className` prop
- See `apps/web/src/components/ui/button.tsx` for shadcn component with CVA

### TypeScript Configuration
- Base config: `@repo/typescript-config/base.json` (extended by all)
- **Next.js apps** extend `nextjs.json` (adds Next.js plugin, JSX preservation)
- **Packages** (like `@repo/ui`) extend `base.json`
- Module resolution: `"Bundler"`, `"jsx": "preserve"` for Next.js

### ESLint/Formatting
- **Shared config**: `@repo/eslint-config` with flat config (eslint.config.js)
- **Apps inherit**: Import from `@repo/eslint-config/next-js`
- **Rules**: Turbo env-vars checked; only-warn plugin prevents build failures
- **Prettier integration**: No separate config needed; ESLint includes prettier-config
- **Format command**: `pnpm format` (3.6.2)

## Integration Points

### Inter-App Communication
- Apps do **not directly import** from each other
- Shared logic/components go through `@repo/ui` (packages/ui)
- Each app has independent styling/branding (e.g., Tailwind configs per app)

### Environment & Build
- **Node requirement**: ≥18 (package.json engines)
- **Package manager**: pnpm 9.0.0 (strict enforcement)
- **Inputs to build cache**: `$TURBO_DEFAULT$` + `.env*` files
- **Build outputs**: `.next/**` (excluded: `.next/cache/**`)

## Common AI Agent Tasks

1. **Add feature to web app**: Modify `apps/web/app/` or `apps/web/src/components/`; use `@/` path aliases
2. **Create shared component**: Add to `packages/ui/src/`, export TypeScript interface, import in apps
3. **Fix linting errors**: Run `turbo lint --filter={package}` to isolate issues
4. **Update styling**: Modify `tailwind.config.cjs` or component `className` props in apps/web
5. **Cross-monorepo impact**: Changes to `packages/ui` rebuild dependencies; use `turbo build --filter=...` to test

## Supabase Integration

### Authentication & Database
- **Service**: Supabase provides PostgreSQL + Auth + Realtime
- **Server client** (`@repo/ui/src/lib/supabase.ts`): Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS, server-only)
- **Client client**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (respects RLS policies, browser-safe)
- **Environment vars**: See `apps/web/.env.example` for setup

### Server-Side Operations (API Routes)
- Use `supabaseServer` from `@/lib/supabase` in `app/api/**/route.ts`
- Safe to bypass RLS with service role key when handling sensitive operations
- Example: `apps/web/app/api/profiles/route.ts` creates/fetches user profiles
- Always validate input and catch errors:
  ```ts
  const { data, error } = await supabaseServer
    .from('profiles')
    .insert({ user_id, name })
    .select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  ```

### Client-Side Operations
- Use `supabaseClient` for browser-side auth and queries
- RLS policies control access—don't trust client-side validation
- Example auth flow:
  ```ts
  const { user } = await supabase.auth.signInWithPassword({ email, password })
  ```

### Authentication Pages
- **Login page**: `apps/web/app/login/page.tsx` — Email/password + OAuth (Google, GitHub)
- **OAuth callback**: `apps/web/app/auth/callback/page.tsx` — Handles Supabase redirect after social login
- **Dashboard**: `apps/web/app/dashboard/page.tsx` — Protected page (checks `getUser()`, redirects to login if unauth)
- **OAuth flow**: signInWithOAuth() → Supabase redirects to auth/callback → checks auth → redirects to dashboard

### Best Practices
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code** (build will warn if `NEXT_PUBLIC_*` prefix added)
- **API routes are the gateway**: Client → API route (auth) → Supabase
- **Environment variables**: Copy `apps/web/.env.example` to `.env.local` with real values
- **Error handling**: Log errors server-side; return safe messages to client
- **OAuth setup**: Configure callback URL in Supabase Auth → URL Configuration (local: `http://localhost:3000/auth/callback`, production: `https://your-domain.com/auth/callback`)

