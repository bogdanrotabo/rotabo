# Edge functions

These are the Supabase edge functions Rotabo runs. The ones that decide something
that cannot be taken back are kept here; the rest still live only in the
project and should be brought across the same way.

| function | in this folder | what it does |
|---|---|---|
| `create-listing` | yes | writes a private listing, after the emailed code |
| `create-company` | yes | writes a company registration, after the emailed code |
| `notify` | yes | the owner's bell: one email per payment on any of the three sites, and per registration here |
| `verify-email` | not yet | sends the 6-digit code, verifies it, turns a verified address into an account |
| `stripe-webhook` | yes | fulfils a paid checkout: a listing, viewer access, or a sponsorship |
| `create-sponsor` | not yet | writes a sponsor row, then sends the browser to Stripe |
| `admin-listings` | not yet | the admin page's reader |
| `claim-listings` | not yet | attaches old listings to a new account |
| `vapid-check`, `push-test` | not yet | push notification plumbing |

A copy here is not deployed. To deploy, upload the file to the project --
the version in Supabase is what actually runs, and these were last kept in
step by hand on 2026-09-04. If they ever disagree, the project is right and
this folder is stale.

The reason they are here at all: `create-listing` and `create-company` are
the only two places that decide what goes into the two tables, including the
rule that one address belongs to one side of the site. Losing the project
would have meant losing that rule with no copy of it anywhere.
