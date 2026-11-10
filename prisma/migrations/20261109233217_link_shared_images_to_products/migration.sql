-- CreateTable
CREATE TABLE "ProductSharedImage" (
    "productId" TEXT NOT NULL,
    "sharedImageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSharedImage_pkey" PRIMARY KEY ("productId","sharedImageId")
);

-- AddForeignKey
ALTER TABLE "ProductSharedImage" ADD CONSTRAINT "ProductSharedImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSharedImage" ADD CONSTRAINT "ProductSharedImage_sharedImageId_fkey" FOREIGN KEY ("sharedImageId") REFERENCES "SharedImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
