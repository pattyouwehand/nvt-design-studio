export interface ProductMetadata {
  title: string
  slug: string
  description: string
  price: number // Price in cents
  sizes: string[]
  category: string
  collections: string[]
  status: 'draft' | 'ready'
  productType: string
  colors: string[]
}

export const defaultProductMetadata: ProductMetadata = {
  title: '',
  slug: '',
  description: '',
  price: 0,
  sizes: [],
  category: '',
  collections: [],
  status: 'draft',
  productType: 'classic-tee',
  colors: ['black']
}

export const availableSizes = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL'
] as const
