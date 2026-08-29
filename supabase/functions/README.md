# Edge functions

These are the Supabase edge functions Rotabo runs. Only the two that write
listings and companies are kept here so far; the others still live only in the
project and should be brought across the same way.

| function | in this folder | what it does |
|---|---|---|
| `create-listing` | yes | writes a private listing, after the emailed code |
| `create-company` | yes | writes a company registration, after the emailed code |
| `verify-email` | not yet | sends the 6-digit code, verifies it, turns a verified address into an account |
| `stripe-webhook` | not yet | grants viewer access when a payment lands |
| `create-sponsor` | not yet | writes a sponsor row, then sends the browser to Stripe |
| `admin-listings` | not yet | the admin page's reader |
| `claim-listings` | not yet | attaches old listings to a new account |
| `vapid-check`, `push-test` | not yet | push notification plumbing |

A copy here is not deployed. To deploy, upload the file to the project --
the version in Supabase is what actually runs, and these two were kept in
step by hand on 2026-08-29. If they ever disagree, the project is right and
this folder is stale.

The reason they are here at all: `create-listing` and `create-company` are
the only two places that decide what goes into the two tables, including the
rule that one address belongs to one side of the site. Losing the project
would have meant losing that rule with no copy of it anywhere.
