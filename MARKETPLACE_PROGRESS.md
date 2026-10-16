# CounselNexus Marketplace implementation progress

## Repository audit

- Angular 19 standalone frontend under `app/`.
- ASP.NET Core 10 API under `Api/CounselNexus.Api`.
- Existing data access uses stored procedures through `IDataLayer` / `DataLayer`; no EF migration project was found.
- Existing practice-management modules and authentication routes are preserved.
- Existing SQL is additive/idempotent script-based migration under `Database/`.

## Completed in this slice

- Added `Database/MarketplaceFoundation.sql` with the initial `Marketplace` schema, verified public practitioner query and legal request creation procedure.
- Added marketplace DTOs and `MarketplaceController` API endpoints.
- Added Angular marketplace homepage with responsive public discovery, categories and verified-profile empty state.
- Added four-step legal request wizard with a real POST to the API and request reference confirmation.
- Preserved the existing public site on `/about`, `/services`, `/contact` and practice-management routes.
- Applied `Database/MarketplaceFoundation.sql` to the configured `CounselNexus` database on 13 October 2026. Verification confirmed all five marketplace tables, both stored procedures and 12 seeded practice areas. No organisations or legal requests were changed or created.

## Next safe slices

1. Add authenticated client request listing/details and document consent records.
2. Add practitioner onboarding, verification records, service areas and availability.
3. Add deterministic matching and auditable quotation workflows.
4. Add engagements and idempotent practice-management conversion.
5. Add appointments, messaging, notifications, administration, payments and subscriptions.
6. Add integration tests, API documentation, ERD and deployment checklist.

## Outstanding dependencies

- The database migration is applied to the configured database; it must still be applied separately to any other environment.
- Existing API authentication middleware/JWT wiring is incomplete in `Program.cs`; authenticated marketplace flows must not be enabled until that is resolved.
- Payment provider, email/SMS delivery and SignalR configuration require approved credentials and regulatory decisions.
