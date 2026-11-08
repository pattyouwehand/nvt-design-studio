import type { ProductType } from './types'

export const productCatalog: ProductType[] = [
  {
    id: 'classic-tee',
    name: 'Classic T-shirt',
    printArea: {
      left: 270,
      top: 250,
      width: 460,
      height: 550,
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      {
        id: 'black',
        name: 'Black',
        hex: '#202020',
        mockupTemplate: 'shirts/black.webp',
        sharedImages: {}
      }
    ]
  }
]

export function getProductType(id: string) {
  return productCatalog.find((product) => product.id === id)
}