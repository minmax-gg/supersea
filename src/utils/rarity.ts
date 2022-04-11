import { useEffect, useState } from 'react'

export const RARITY_TYPES = [
  {
    top: 0.001,
    tier: 1,
    name: 'Legendary' as const,
    color: { light: 'orange.200', dark: 'orange.500' },
  },
  {
    top: 0.01,
    tier: 2,
    name: 'Epic' as const,
    color: { light: 'purple.200', dark: 'purple.500' },
  },
  {
    top: 0.1,
    tier: 3,
    name: 'Rare' as const,
    color: { light: 'blue.200', dark: 'blue.500' },
  },
  {
    top: 0.5,
    tier: 4,
    name: 'Uncommon' as const,
    color: { light: 'green.200', dark: 'green.500' },
  },
  {
    top: Infinity,
    tier: 5,
    name: 'Common' as const,
    color: { light: 'gray.200', dark: 'gray.500' },
  },
]

export type RarityTier = typeof RARITY_TYPES[number]
export type RarityName = RarityTier['name']
export type Rarity = {
  isRanked: boolean
  tokenCount: number
  rank: number
  type: typeof RARITY_TYPES[number]
}

const TRAIT_COUNT_EXCLUDED_STORAGE_KEY = 'excludeTraitCount'

export const determineRarityType = (rank: number, tokenCount: number) => {
  return rank === 1
    ? RARITY_TYPES[0]
    : RARITY_TYPES.find(({ top }) => rank / tokenCount <= top)!
}

export const useTraitCountExcluded = (address: string | null) => {
  const [traitCountExcluded, setTraitCountExcluded] = useState<boolean | null>(
    null,
  )
  const storageKey = `${TRAIT_COUNT_EXCLUDED_STORAGE_KEY}:${address}`

  useEffect(() => {
    if (!address || !chrome.storage) return

    const listener: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area === 'sync' && changes[storageKey]) {
        setTraitCountExcluded(Boolean(changes[storageKey].newValue || false))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    chrome.storage.sync.get([storageKey], (res) => {
      setTraitCountExcluded(res[storageKey] ?? false)
    })

    return () => chrome.storage.onChanged.removeListener(listener)
  }, [storageKey, address])

  return [
    traitCountExcluded,
    (exclude: boolean) => {
      if (exclude) {
        chrome.storage.sync.set({
          [storageKey]: true,
        })
      } else {
        chrome.storage.sync.remove(storageKey)
      }
      setTraitCountExcluded(exclude)
    },
  ] as const
}

export const useAllTraitCountExcluded = () => {
  const [allTraitCountExcluded, setAllTraitCountExcluded] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    if (!chrome.storage) return

    const listener: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      const traitCountExcludedKeys = Object.keys(changes).filter((key) =>
        key.startsWith(TRAIT_COUNT_EXCLUDED_STORAGE_KEY),
      )
      if (area === 'sync' && traitCountExcludedKeys.length) {
        setAllTraitCountExcluded((all) => {
          return {
            ...all,
            ...traitCountExcludedKeys.reduce<Record<string, boolean>>(
              (acc, key) => {
                acc[key.replace(`${TRAIT_COUNT_EXCLUDED_STORAGE_KEY}:`, '')] =
                  Boolean(changes[key].newValue) || false
                return acc
              },
              {},
            ),
          }
        })
      }
    }
    chrome.storage.onChanged.addListener(listener)
    chrome.storage.sync.get(null, (res) => {
      const traitCountExcludedKeys = Object.keys(res).filter((key) =>
        key.startsWith(TRAIT_COUNT_EXCLUDED_STORAGE_KEY),
      )
      setAllTraitCountExcluded(
        traitCountExcludedKeys.reduce<Record<string, boolean>>((acc, key) => {
          acc[key.replace(`${TRAIT_COUNT_EXCLUDED_STORAGE_KEY}:`, '')] =
            Boolean(res[key]) || false
          return acc
        }, {}),
      )
    })

    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return allTraitCountExcluded
}

export const getActiveRarity = (
  rarity:
    | (Rarity & { noTraitCountRank: number; noTraitCountType: RarityTier })
    | null,
  traitCountExcluded: boolean | null,
) => {
  if (!rarity) return null
  return {
    isRanked: rarity.isRanked,
    tokenCount: rarity.tokenCount,
    rank: traitCountExcluded ? rarity.noTraitCountRank : rarity.rank,
    type: traitCountExcluded ? rarity.noTraitCountType : rarity.type,
  }
}
