-- DANGEROUS: Run ONLY in the intended NVT Studio development Supabase project.
-- All Artwork, Product, PublishedProduct and their join rows are confirmed dummy data.
-- Category, Collection, Label, SharedImage, Customer, Order and Auth are untouched.
BEGIN;
DELETE FROM "PublishedProduct";
DELETE FROM "ProductSharedImage";
DELETE FROM "Product";
DELETE FROM "Artwork";
COMMIT;
-- Existing Storage objects are NOT removed by SQL. See README.
