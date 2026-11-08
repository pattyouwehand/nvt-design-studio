-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "filename" TEXT NOT NULL DEFAULT 'artwork.png',
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Artwork_brand_idx" ON "Artwork"("brand");
