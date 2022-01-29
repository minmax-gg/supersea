import DataLoader from 'dataloader'
import { request, gql, GraphQLClient } from 'graphql-request'
import { fetchMetadataUri } from '../utils/web3'
import { RateLimit, Sema } from 'async-sema'
import { User } from './user'
import lastKnownInjectionSelectors from '../assets/lastKnownInjectionSelectors.json'
import { Selectors } from './selector'

// Parcel will inline the string
let lastKnownStyleOverrides = ''
try {
  const fs = require('fs')
  lastKnownStyleOverrides = fs.readFileSync(
    './src/assets/lastKnownStyleOverrides.css',
    'utf-8',
  )
} catch (err) {}

const OPENSEA_SHARED_CONTRACT_ADDRESSES = [
  '0x495f947276749ce646f68ac8c248420045cb7b5e',
  '0x2953399124f0cbb46d2cbacd8a89cf0599974963',
]
// Not exactly right but good enough to split tokenIds into their unique collections
const OPENSEA_SHARED_CONTRACT_COLLECTION_ID_LENGTH = 60

const COLLECTION_SLUG_ADDRESS_OVERRIDES: Record<string, string> = {
  bossbeauties: '0xb5c747561a185a146f83cfff25bdfd2455b31ff4',
}

export type Rarities = {
  tokenCount: number
  tokens: {
    iteratorID: number
    rank: number
  }[]
}

export type Trait = {
  count: number
  trait_type: string
  value: string
}

export type RaritiesWithTraits = Rarities & {
  rankingOptions: {
    excludeTraits: string[]
  }
  traits: Trait[]
}

export type Floor = {
  price: number
  floorSearchUrl: string
  currency: string
}

export type AssetInfo = {
  relayId: string
  tokenMetadata: string
}

export type Asset = {
  token_id: string
  asset_contract: {
    address: string
    image_url: string
  }
  name: string
  collection: {
    name: string
  }
  image_url: string
  last_sale: {
    total_price: string
    payment_token: {
      symbol: 'ETH' | 'WETH'
    }
  }
  sell_orders: {
    current_price: string
    base_price: string
    payment_token_contract: {
      symbol: 'ETH' | 'WETH'
    }
  }[]
}

export type Chain = 'ethereum' | 'polygon'

const REMOTE_ASSET_BASE = 'https://nonfungible.tools/supersea'
const GRAPHQL_AUTH_URL =
  window.localStorage.GRAPHQL_AUTH_URL ||
  'https://api.nonfungible.tools/graphql'
const GRAPHQL_CDN_URL =
  window.localStorage.GRAPHQL_CDN_URL || 'https://api.nonfungible.tools/graphql'

const openSeaPublicRateLimit = RateLimit(2)

let selectorsPromise: null | Promise<Selectors> = null
export const fetchSelectors = () => {
  if (!selectorsPromise) {
    // Fallback to last known selectors if request takes more than 5 seconds
    selectorsPromise = Promise.race<Promise<Selectors>>([
      fetch(`${REMOTE_ASSET_BASE}/injectionSelectors.json`).then((res) =>
        res.json(),
      ),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 5000)
      }),
    ]).catch((err) => {
      console.error(err)
      return lastKnownInjectionSelectors as Selectors
    })
  }
  return selectorsPromise
}

let cssPromise: null | Promise<string> = null
export const fetchGlobalCSS = () => {
  if (!cssPromise) {
    // Fallback to last known css if request takes more than 5 seconds
    cssPromise = Promise.race<Promise<string>>([
      fetch(`${REMOTE_ASSET_BASE}/styleOverrides.css`).then((res) =>
        res.text(),
      ),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 5000)
      }),
    ]).catch((err) => {
      console.error(err)
      return lastKnownStyleOverrides
    })
  }
  return cssPromise
}

const refreshTokenQuery = gql`
  mutation RefreshToken {
    refreshToken {
      success
      accessToken
      account {
        role
        membershipType
      }
    }
  }
`

const tokenClient = new GraphQLClient(GRAPHQL_AUTH_URL, {
  credentials: 'include',
  mode: 'cors',
})

const userSema = new Sema(1)
let cachedUser:
  | {
      accessToken: string
      role: User['role']
      membershipType: User['membershipType']
    }
  | null
  | undefined = undefined
export const getUser = async (refresh = false) => {
  await userSema.acquire()
  if (!refresh) {
    if (cachedUser !== undefined) {
      userSema.release()
      return cachedUser
    }
  }
  const {
    refreshToken: { accessToken, account },
  } = await tokenClient.request(refreshTokenQuery)

  cachedUser = {
    accessToken,
    role: account?.role || 'FREE',
    membershipType: account?.membershipType,
  }
  userSema.release()

  return cachedUser
}

const nonFungibleRequest = async (
  query: any,
  variables: any = {},
  refreshAccessToken = false,
): Promise<any> => {
  const user = await getUser(refreshAccessToken)
  const accessToken = user?.role !== 'FREE' && user?.accessToken
  try {
    const res = await request(
      GRAPHQL_CDN_URL,
      query,
      variables,
      accessToken
        ? {
            Authorization: accessToken,
            'X-NonFungibleTools-Role': getUserRoleHeader(
              user.role,
              user.membershipType,
            ),
          }
        : {},
    )
    return res
  } catch (err: any) {
    if (
      err?.response?.errors[0]?.message === 'Not Authorised!' &&
      !refreshAccessToken
    ) {
      return nonFungibleRequest(query, variables, true)
    }
    throw err
  }
}

export const floorPriceLoader = new DataLoader(
  async (keys: readonly string[]) => {
    const [slug] = keys
    await openSeaPublicRateLimit()
    const { stats } = await fetch(
      `https://api.opensea.io/api/v1/collection/${slug}/stats`,
    ).then((res) => res.json())
    return [
      {
        price: Math.round(stats.floor_price * 10000) / 10000,
        floorSearchUrl: `https://opensea.io/collection/${slug}?search[sortAscending]=true&search[sortBy]=PRICE&search[toggles][0]=BUY_NOW`,
        currency: 'ETH',
      },
    ]
  },
  {
    maxBatchSize: 1,
  },
)

const getUserRoleHeader = (
  role: User['role'],
  membershipType: User['membershipType'],
) => {
  return `${role}-${membershipType}` as const
}

export const fetchFloorPrice = (collectionSlug: string) => {
  return floorPriceLoader.load(collectionSlug) as Promise<Floor>
}

const rarityQuery = gql`
  query RarityQuery($address: String!) {
    contract(address: $address) {
      contractAddress
      tokenCount
      tokens {
        iteratorID
        rank
      }
    }
  }
`

const rarityLoader = new DataLoader(
  async (addresses: readonly string[]) => {
    // Max batch size is 1, we only use this for client side caching
    const address = addresses[0]
    try {
      const res = await nonFungibleRequest(rarityQuery, {
        address,
      })
      return [res.contract]
    } catch (e) {
      return [null]
    }
  },
  {
    batchScheduleFn: (callback) => setTimeout(callback, 250),
    maxBatchSize: 1,
  },
)

const rarityTraitQuery = gql`
  query RarityQuery($address: String!, $input: TokenInputType) {
    contract(address: $address) {
      contractAddress
      tokenCount
      traits {
        count
        trait_type
        value
      }
      rankingOptions {
        excludeTraits
      }
      tokens(input: $input) {
        iteratorID
        rank
      }
    }
  }
`

export const fetchRarities = async (address: string) => {
  return rarityLoader.load(address) as Promise<Rarities>
}

export const fetchRaritiesWithTraits = async (
  address: string,
  traits: { key: string; value: string }[],
) => {
  const res = await nonFungibleRequest(rarityTraitQuery, {
    address,
    input: traits.length
      ? {
          traits,
        }
      : {},
  })
  return res.contract as RaritiesWithTraits
}

const isRankedQuery = gql`
  query IsRankedQuery($address: String!) {
    contract(address: $address) {
      contractAddress
      isRanked
    }
  }
`

const isRankedLoader = new DataLoader(
  async (addresses: readonly string[]) => {
    // Max batch size is 1, we only use this for client side caching
    const address = addresses[0]
    try {
      const res = await nonFungibleRequest(isRankedQuery, {
        address,
      })
      return [res.contract.isRanked]
    } catch (e) {
      return [null]
    }
  },
  {
    batchScheduleFn: (callback) => setTimeout(callback, 250),
    maxBatchSize: 1,
  },
)

export const fetchIsRanked = async (address: string) => {
  return isRankedLoader.load(address) as Promise<boolean>
}

const assetLoader = new DataLoader(
  async (addressIdPairs: readonly string[]) => {
    // Assume all are for the same address for now
    const address = addressIdPairs[0].split('_')[0]
    const tokenIds = addressIdPairs.map((pair) => pair.split('_')[1])
    await openSeaPublicRateLimit()
    const res = await fetch(
      `https://api.opensea.io/api/v1/assets?asset_contract_address=${address}&token_ids=${tokenIds.join(
        '&token_ids=',
      )}`,
    ).then((res) => res.json())
    return addressIdPairs.map((addressIdPair) => {
      if (!res) return null
      const tokenId = addressIdPair.split('_')[1]
      const asset = res.assets.find(
        ({ token_id }: { token_id: string }) => token_id === tokenId,
      )
      if (!asset) return null
      return asset
    })
  },
  {
    batchScheduleFn: (callback) => setTimeout(callback, 500),
    maxBatchSize: 20,
  },
)

export const fetchAssetBatched = (address: string, tokenId: number) => {
  return assetLoader.load(`${address}_${tokenId}`) as Promise<Asset>
}

export const fetchAsset = async (address: string, tokenId: string) => {
  return fetch(
    `https://api.opensea.io/api/v1/asset/${address}/${tokenId}`,
  ).then((res) => res.json())
}

export const fetchAllCollectionsForUser = async (
  address: string,
  list = [],
  offset = 0,
): Promise<
  { slug: string; ownedCount: number; name: string; image: string }[]
> => {
  await openSeaPublicRateLimit()
  const collections = await fetch(
    `https://api.opensea.io/api/v1/collections?asset_owner=${address}&offset=${offset}&limit=300`,
  ).then((res) => res.json())
  const updatedList = list.concat(
    collections.map(
      (collection: {
        slug: string
        owned_asset_count: number
        name: string
        image_url: string
      }) => {
        return {
          slug: collection.slug,
          name: collection.name,
          image: collection.image_url,
          ownedCount: collection.owned_asset_count,
        }
      },
    ),
  )
  if (collections.length === 300) {
    return fetchAllCollectionsForUser(address, updatedList, offset + 300)
  } else {
    return updatedList
  }
}

export const fetchMetadataUriWithOpenSeaFallback = async (
  address: string,
  tokenId: number,
) => {
  let contractTokenUri = await fetchMetadataUri(address, tokenId)
  if (!contractTokenUri) {
    const asset = await fetch(
      `https://api.opensea.io/api/v1/asset/${address}/${tokenId}`,
    ).then((res) => res.json())
    contractTokenUri = asset.token_metadata
  }
  return contractTokenUri.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/')
}

export const triggerOpenSeaMetadataRefresh = async (
  address: string,
  tokenId: string,
) => {
  await openSeaPublicRateLimit()
  return fetch(
    `https://api.opensea.io/api/v1/asset/${address}/${tokenId}/?force_update=true`,
  )
}

const collectionAddressLoader = new DataLoader(
  async (slugs: readonly string[]) => {
    // Max batch size is 1, we only use this for client side caching
    const slug = slugs[0]
    if (COLLECTION_SLUG_ADDRESS_OVERRIDES[slug]) {
      return [COLLECTION_SLUG_ADDRESS_OVERRIDES[slug]]
    }
    try {
      const data = await fetch(
        `https://api.opensea.io/api/v1/assets?limit=1&collection=${slug}`,
      ).then((res) => res.json())
      return [data.assets[0].asset_contract.address]
    } catch (e) {
      return [null]
    }
  },
  {
    batchScheduleFn: (callback) => setTimeout(callback, 250),
    maxBatchSize: 1,
  },
)
export const fetchCollectionAddress = async (slug: string) => {
  return collectionAddressLoader.load(slug) as Promise<string>
}

const collectionSlugLoader = new DataLoader(
  async (
    keys: readonly {
      address: string
      tokenId: string
    }[],
  ) => {
    const { address, tokenId } = keys[0]
    await openSeaPublicRateLimit()
    const asset = await fetch(
      `https://api.opensea.io/api/v1/asset/${address}/${tokenId}`,
    ).then((res) => res.json())
    return [asset.collection.slug]
  },
  {
    maxBatchSize: 1,
    cacheKeyFn: ({ address, tokenId }) => {
      if (OPENSEA_SHARED_CONTRACT_ADDRESSES.includes(address))
        return `${address}/${tokenId.slice(
          0,
          OPENSEA_SHARED_CONTRACT_COLLECTION_ID_LENGTH,
        )}`
      return address
    },
  },
)
export const fetchCollectionSlug = async (address: string, tokenId: string) => {
  return collectionSlugLoader.load({ address, tokenId }) as Promise<string>
}

const tokenPropertiesQuery = gql`
  query TokenPropertiesQuery($address: String!, $id: Int!) {
    contract(address: $address) {
      rarityTable
      tokenCount
      traits {
        count
        trait_type
        value
      }
      tokens(input: { in: [$id] }) {
        score
        rank
        attributes {
          trait_type
          value
        }
      }
    }
  }
`
export const fetchTokenProperties = async (
  address: string,
  id: string,
): Promise<{
  token: {
    score: number
    rank: number
    attributes: { trait_type: string; value: string }[]
  }
  tokenCount: number
  rarityTable: {
    scoreMap: Record<string, Record<string, number>>
    missingTraitScores: Record<string, { score: number }>
  }
  traits: { count: number; trait_type: string; value: string }[]
}> => {
  const res = await nonFungibleRequest(tokenPropertiesQuery, {
    address,
    id: Number(id),
  })
  return {
    tokenCount: res.contract.tokenCount,
    token: res.contract.tokens[0],
    rarityTable: res.contract.rarityTable,
    traits: res.contract.traits,
  }
}

export const fetchOptimalGasPreset = async () => {
  return fetch('https://nonfungible.tools/api/gas').then((res) => res.json())
}

export const fetchMetadata = async (
  contractAddress: string,
  tokenId: number,
) => {
  return fetch(
    `https://nonfungible.tools/api/metadata-proxy?address=${contractAddress}&tokenId=${tokenId}`,
  ).then((res) => res.json())
}
