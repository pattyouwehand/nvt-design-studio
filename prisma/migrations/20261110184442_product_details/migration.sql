-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "collections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "colors" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sizes" JSONB NOT NULL DEFAULT '[]';
