-- Run ONLY AFTER new code is installed and Prisma client regenerated,
-- AND after confirming the application builds against the new schema.
BEGIN;
ALTER TABLE "Artwork" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "metadata";
COMMIT;
