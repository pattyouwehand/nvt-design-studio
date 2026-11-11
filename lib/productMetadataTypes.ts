export interface ProductMetadata {
  title: string
  slug: string
  subtitle: string
  description: string
  price: number
  sizes: string[]
  category: string
  collections: string[]
  label: string
  status: 'draft' | 'ready'
  productType: string
  colors: string[]
}

export const defaultProductMetadata: ProductMetadata = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  price: 0,
  sizes: [],
  category: '',
  collections: [],
  label: '',
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