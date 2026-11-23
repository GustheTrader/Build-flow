# Unfinished code, kept out of the build

`stripe-payments/` is a Stripe card-payment module that never compiled: it needs the `stripe`
package, used a different Redis wrapper API, and redeclared `Payment`/`Invoice` in
`src/models/types.ts`. The financial module (`src/services/invoice.service.ts`, `/api/v1/payments`
in `financial.routes.ts`) records payments without it. Move these files back under `src/` and
finish them when card payments are wanted.
