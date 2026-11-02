# M.S. Enterprises Admin Frontend

Separate React and Vite application for the M.S. Enterprises staff admin workspace. It is intended to be deployed independently from the storefront while both frontends use the same Laravel backend and database.

## Run locally

```bash
npm install
npm run dev
```

For local development, start Laravel from `../msenterprises_backend` with `php artisan serve`; Laravel may select a port other than `8000` if that port is unavailable. Set `VITE_API_PROXY_TARGET` in a local `.env.local` file to the server's origin (for example, `VITE_API_PROXY_TARGET=http://127.0.0.1:8002`), then run this app with `npm run dev`. Restart Vite after changing the environment file. The proxy forwards `/api` and `/sanctum` requests to Laravel. Set `VITE_API_BASE_URL` when the frontend should call a remote API origin directly, such as in production.

Create a production build with `npm run build`, or preview it with `npm run preview`.

## Current status

Login, registration, logout, and password recovery use the Laravel session-auth API. New registrations do not grant staff access: they receive the default customer role, and an administrator must assign a staff role before the account can enter this panel. The role-specific navigation is only a usability layer; backend endpoints must enforce authorization for every protected action.

The dashboard metrics and management screens are placeholders until their shared Laravel API endpoints are implemented. Configure Laravel's session cookie and CORS/stateful domains for the admin and storefront origins before cross-subdomain deployment. Configure a real mail transport to deliver password-reset links; Laravel's local default mailer may only log them.

## Structure

- `src/App.jsx` — session loading, authentication state, and top-level screen selection.
- `src/components/Brand.jsx` — shared M.S. Enterprises brand mark.
- `src/components/auth/` — authentication screen, visual panel, and form.
- `src/components/dashboard/` — dashboard shell, sidebar, header, page heading, overview, and placeholder screens.
- `src/lib/adminConfig.js` — shared role labels, navigation, and overview metrics.
- `src/App.css` — responsive admin workspace styling.
- `src/lib/api.js` — Laravel CSRF/session API client.
- `src/index.css` — global styles.

The Laravel application remains a separate project in `../msenterprises_backend`; storefront code remains in `../msenterprise`.
