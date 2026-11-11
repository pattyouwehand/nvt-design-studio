import type { BrandId } from '@/lib/brands'

export interface ProductOption {
  id: string
  name: string
}

interface BrandProductOptions {
  categories: ProductOption[]
  collections: ProductOption[]
  labels: ProductOption[]
}

export const productOptions: Record<BrandId, BrandProductOptions> = {
  t4c: {
    categories: [
      { id: 'ai-tech', name: 'AI & Technology' },
      { id: 'conspiracies', name: 'Conspiracies' },
      { id: 'science-reality', name: 'Science & Reality' },
      { id: 'health-society', name: 'Health & Society' }
    ],
    collections: [
      { id: 'fat-shaming', name: 'Fat Shaming Department' },
      { id: 'area-51', name: 'Area 51 Personnel Files' },
      { id: 'moon-landing', name: 'Moon Landing Film Crew' },
      { id: 'reality-exe', name: 'Reality.EXE' }
    ],
    labels: [
      { id: 'new', name: 'New' },
      { id: 'bestseller', name: 'Bestseller' },
      { id: 'limited-edition', name: 'Limited Edition' }
    ]
  },

  legends: {
    categories: [
      { id: 'gods-goddesses', name: 'Gods & Goddesses' },
      { id: 'mythical-creatures', name: 'Mythical Creatures' },
      { id: 'heroes-villains', name: 'Heroes & Villains' },
      { id: 'magic-mayhem', name: 'Magic & Mayhem' }
    ],
    collections: [
      { id: 'greek-mythology', name: 'Greek Gods Behaving Badly' },
      { id: 'norse-mythology', name: 'Vikings & Other Problems' },
      { id: 'monsters-myths', name: 'Monsters & Misfits' },
      { id: 'witchcraft', name: 'Witches, Curses & Bad Decisions' }
    ],
    labels: [
      { id: 'new', name: 'New' },
      { id: 'bestseller', name: 'Bestseller' },
      { id: 'limited-edition', name: 'Limited Edition' }
    ]
  },

  'little-monsters': {
    categories: [
      { id: 'baby', name: 'Baby' },
      { id: 'kids', name: 'Kids' },
      { id: 'creatures', name: 'Little Creatures' },
      { id: 'magic', name: 'Magic & Fantasy' },
      { id: 'family-matching', name: 'Family & Matching' }
    ],
    collections: [
      { id: 'baby-kraken', name: 'Baby Kraken Club' },
      { id: 'tiny-dragons', name: 'Tiny Dragons' },
      { id: 'monster-mischief', name: 'Monster Mischief' },
      { id: 'bedtime-rebels', name: 'Bedtime Rebels' },
      { id: 'mini-me', name: 'Mini Me Club' }
    ],
    labels: [
      { id: 'new', name: 'New' },
      { id: 'bestseller', name: 'Bestseller' },
      { id: 'limited-edition', name: 'Limited Edition' }
    ]
  },

  'everyday-originals': {
    categories: [
      { id: 'travel-adventure', name: 'Travel & Adventure' },
      { id: 'food-drinks', name: 'Food & Drinks' },
      { id: 'music-culture', name: 'Music & Culture' },
      { id: 'nature-outdoors', name: 'Nature & Outdoors' }
    ],
    collections: [
      { id: 'roadtrip-club', name: 'The Roadtrip Club' },
      { id: 'daily-essentials', name: 'Daily Essentials' },
      { id: 'good-vibrations', name: 'Good Vibrations' },
      { id: 'outside-the-lines', name: 'Outside the Lines' }
    ],
    labels: [
      { id: 'new', name: 'New' },
      { id: 'bestseller', name: 'Bestseller' },
      { id: 'limited-edition', name: 'Limited Edition' }
    ]
  }
}