# Copilot Instructions for black-swan-erp

## Project Architecture
- **Monorepo structure**: All main code is under `src/` (React, TypeScript), with supporting scripts in `scripts/` and database SQL in `src/database/`.
- **Component organization**: UI components are in `src/components/`, grouped by domain (e.g., `accounting/`, `assets/`, etc.).
- **Domain logic**: Business logic and service layers are in `src/domain/` and `src/services/`.
- **Data access**: Repositories for data access are in `src/repositories/` and `src/data/`.
- **Database**: SQL schema and migrations are in `src/database/` and `supabase/migrations/`.

## Developer Workflows
- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev` (see `dev-server` task)
- **Run tests**: `npm test` or `npx vitest`
- **Environment**: Use `.env.local` for secrets (e.g., `GEMINI_API_KEY`).

## Project Conventions
- **TypeScript**: All code is typed; shared types in `src/types.ts` and `src/shared/types.ts`.
- **React**: Functional components, hooks in `src/hooks/`, context in `src/Theme/ThemeContext.tsx` and `src/AppContext.tsx`.
- **Tailwind CSS**: Used for styling, config in `tailwind.config.js`.
- **Supabase**: Used for backend/database, client in `src/lib/supabase.ts`.
- **AI Integration**: AI services in `src/services/aiService.ts`.

## Integration & Data Flow
- **API/data**: Data flows from repositories → services → components.
- **Supabase**: All DB access via Supabase client; see `src/lib/supabase.ts` and `src/services/supabaseClient.ts`.
- **AI**: AI features use `aiService.ts` and require API key in `.env.local`.

## Examples
- **Add a new UI feature**: Place new component in `src/components/`, update context/providers if global state is needed.
- **Add a DB migration**: Place SQL in `supabase/migrations/`, update schema in `src/database/`.
- **Add a service**: Place logic in `src/services/`, expose via hooks or context if needed.

## Key Files/Directories
- `src/components/` — UI components
- `src/services/` — Service logic (AI, data, supabase)
- `src/repositories/` — Data access
- `src/domain/` — Business/domain logic
- `src/database/`, `supabase/` — SQL, migrations
- `src/hooks/` — React hooks
- `src/shared/types.ts` — Shared types

## Special Notes
- **No external dashboards**: All admin/dev is local.
- **Private/internal**: Do not expose code or data externally.
- **Owner**: Yasser Al-Zahrani

---
For more, see `README.md` and code comments in each directory.
