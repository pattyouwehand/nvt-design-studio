import 'server-only'
import type { BrandId } from '@/lib/brands'
import { productOptions } from '@/lib/productOptions'
import { getProductType } from '@/lib/catalog/products'
import type { ProductMetadata } from '@/lib/productMetadataTypes'

export function validateProductMetadata( brand: BrandId, value: unknown ): value is ProductMetadata {
  if (!value || typeof value !== 'object') return false

  const data = value as Record<string, unknown>
  const options = productOptions[brand]

  const productType =
  typeof data.productType === 'string'
    ? getProductType(data.productType)
    : undefined

  return (
    typeof data.title === 'string' &&
    data.title.length <= 150 &&

    typeof data.slug === 'string' &&
    (data.slug === '' ||
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) &&
    data.slug.length <= 180 &&

    typeof data.description === 'string' &&
    data.description.length <= 5000 &&

    typeof data.price === 'number' &&
      Number.isFinite(data.price) &&
      data.price >= 0 &&
      Math.abs(data.price * 100 - Math.round(data.price * 100)) < 0.000001 &&

    Array.isArray(data.sizes) &&
      data.sizes.every(
        (size) =>
          typeof size === 'string' &&
          productType?.sizes.includes(size)
      ) &&

    typeof data.category === 'string' &&
    (data.category === '' ||
      options.categories.some(
        (item) => item.id === data.category
      )) &&

    Array.isArray(data.collections) &&
    data.collections.every(
      (id) =>
        typeof id === 'string' &&
        options.collections.some((item) => item.id === id)
    ) &&

    Boolean(productType) &&

    Array.isArray(data.colors) &&
    data.colors.length > 0 &&
    data.colors.every(
      (color) =>
        typeof color === 'string' &&
        productType?.colors.some(
          (available) => available.id === color
        )
    ) &&

    (data.status === 'draft' || data.status === 'ready')
  )
}