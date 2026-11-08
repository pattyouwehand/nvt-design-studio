export interface ProductColor {
  id: string
  name: string
  hex: string
  mockupTemplate: string
  sharedImages: {
    back?: string
    fabric?: string
    sizeChart?: string
  }
}

export interface PrintArea {
  left: number
  top: number
  width: number
  height: number
}

export interface ProductType {
  id: string
  name: string
  sizes: string[]
  colors: ProductColor[]
  printArea: PrintArea
}