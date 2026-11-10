-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtitle" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_artworkId_idx" ON "Product"("artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brand_slug_key" ON "Product"("brand", "slug");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
