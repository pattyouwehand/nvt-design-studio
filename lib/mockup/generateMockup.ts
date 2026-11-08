import 'server-only'
import sharp from 'sharp'
import path from 'node:path'
import type { BrandId } from '@/lib/brands'
import { getProductType } from '@/lib/catalog/products'
import {
  getArtworkImage,
  uploadArtworkMockup
} from '@/lib/artworkStorage'

const OUTPUT = {
  width: 1000,
  height: 1200,
  quality: 85
}

export async function generateMockup(
  brand: BrandId,
  id: string,
  productTypeId = 'classic-tee',
  colorId = 'black'
) {
  const productType = getProductType(productTypeId)

  if (!productType) {
    throw new Error(`Unknown product type: ${productTypeId}`)
  }

  const color = productType.colors.find(
    (item) => item.id === colorId
  )

  if (!color) {
    throw new Error(
      `Color "${colorId}" is not available for ${productTypeId}`
    )
  }

  const shirtPath = path.join(
    process.cwd(),
    'assets',
    'mockups',
    color.mockupTemplate
  )

  const filename = `${productTypeId}-${colorId}-front.webp`
  const printArea = productType.printArea

  // Download original artwork from Supabase Storage.
  const originalArtwork = await getArtworkImage(brand, id)

  // Prepare the garment template.
  const shirt = await sharp(shirtPath)
    .resize(OUTPUT.width, OUTPUT.height, {
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .ensureAlpha()
    .png()
    .toBuffer()

  // Fit artwork inside the print area.
  const artwork = await sharp(originalArtwork)
    .trim({
      background: '#00000000',
      threshold: 5
    })
    .resize(printArea.width, printArea.height, {
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .png()
    .toBuffer()

  // Combine artwork and garment.
  const mockupBuffer = await sharp(shirt)
    .composite([
      {
        input: artwork,
        left: printArea.left,
        top: printArea.top
      }
    ])
    .webp({ quality: OUTPUT.quality })
    .toBuffer()

  // Upload generated mockup to Supabase Storage.
  const storagePath = await uploadArtworkMockup(
    brand,
    id,
    filename,
    mockupBuffer
  )

  return {
    storagePath,
    filename,
    productType: productTypeId,
    color: colorId
  }
}