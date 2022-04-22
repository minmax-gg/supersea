import {
  Box,
  SimpleGrid,
  HStack,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import _ from 'lodash'
import { useState, useEffect, useRef, useCallback } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import {
  Asset,
  fetchAssetBatched,
  fetchAssets,
  fetchCollectionAddress,
  fetchRaritiesWithTraits,
  OPENSEA_ASSETS_BATCH_SIZE,
  Rarities,
  Trait,
} from '../../utils/api'
import SearchAsset from './SearchAsset'
import { HEIGHT as ASSET_INFO_HEIGHT } from '../AssetInfo/AssetInfo'
import { useInView } from 'react-intersection-observer'
import Filters, { FiltersType } from './Filters'
import { weiToEth } from '../../utils/ethereum'
import {
  determineRarityType,
  RARITY_TYPES,
  useTraitCountExcluded,
} from '../../utils/rarity'
import MassBidOverlay from './MassBidOverlay'
import useMassBid from '../../hooks/useMassBid'

const LOAD_MORE_SCROLL_THRESHOLD = 600

const createPlaceholderTokens = (num: number, offset = 0) => {
  return _.times(num, (num) => ({
    iteratorID: num + offset,
    rank: num + offset,
    noTraitCountRank: num + offset,
    placeholder: true,
  }))
}

const GridItem = ({
  renderPlaceholder,
  renderItem,
}: {
  renderPlaceholder: () => React.ReactNode
  renderItem: () => React.ReactNode
}) => {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '500px',
  })

  return <div ref={ref}>{inView ? renderItem() : renderPlaceholder()}</div>
}

const SearchResults = ({ collectionSlug }: { collectionSlug: string }) => {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [tokenCount, setTokenCount] = useState(0)
  const [tokens, setTokens] = useState<Rarities['tokens'] | null | undefined>()

  const [cursor, setCursor] = useState<string | null>(null)
  const fetchingUnrankedRef = useRef(false)

  const [address, setAddress] = useState<string | null>(null)
  const [loadedItems, setLoadedItems] = useState(OPENSEA_ASSETS_BATCH_SIZE)
  const [assetMap, setAssetMap] = useState<Record<string, Asset>>({})
  const [traitCountExcluded] = useTraitCountExcluded(address)

  const loadingAssetMapRef = useRef<Record<string, boolean>>({})
  const [allTraits, setAllTraits] = useState<Trait[]>([])
  const [filters, setFilters] = useState<FiltersType>({
    status: [],
    priceRange: [undefined, undefined],
    includedIds: null,
    includedRanks: null,
    traits: [],
  })

  const isUnranked = Boolean(tokens && tokenCount === 0)
  const fetchUnordered = isUnranked && _.isEmpty(filters.includedIds)

  // Tokens filtered with data that we have _before_ fetching the asset
  let preFilteredTokens = ((tokens && address
    ? [...tokens].sort((a, b) =>
        traitCountExcluded
          ? a.noTraitCountRank - b.noTraitCountRank
          : a.rank - b.rank,
      )
    : []) as any[])?.filter(({ rank, noTraitCountRank, iteratorID }) => {
    const usedRank = traitCountExcluded ? noTraitCountRank : rank
    let rankIncluded = true
    if (filters.includedRanks) {
      rankIncluded = filters.includedRanks[usedRank]
    }
    let idIncluded = true
    if (filters.includedIds) {
      idIncluded = filters.includedIds[iteratorID]
    }
    return rankIncluded && idIncluded
  }) as (Rarities['tokens'][number] & {
    placeholder: boolean
  })[]
  const slicedTokens = preFilteredTokens.slice(0, loadedItems)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledLoadMore = useCallback(
    _.throttle(() => {
      if (!gridRef.current) return
      const { bottom } = gridRef.current.getBoundingClientRect()
      if (
        bottom > 0 &&
        bottom - window.innerHeight <= LOAD_MORE_SCROLL_THRESHOLD
      ) {
        setLoadedItems((items) =>
          fetchUnordered
            ? items + OPENSEA_ASSETS_BATCH_SIZE
            : Math.min(
                items + OPENSEA_ASSETS_BATCH_SIZE,
                tokens?.length
                  ? preFilteredTokens.length
                  : items + OPENSEA_ASSETS_BATCH_SIZE,
              ),
        )
      }
    }, 250),
    [preFilteredTokens.length, fetchUnordered],
  )

  useEffect(() => {
    ;(async () => {
      let fetchedAddress = ''
      if (!address) {
        fetchedAddress = await fetchCollectionAddress(collectionSlug)
      }
      const rarities = await fetchRaritiesWithTraits(
        address || fetchedAddress,
        filters.traits.map((val) => {
          const { groupName, value } = JSON.parse(val)
          return { key: groupName, value }
        }),
      )
      unstable_batchedUpdates(() => {
        if (fetchedAddress) {
          setAddress(fetchedAddress)
        }
        setTokens(rarities?.tokens || [])
        setTokenCount(rarities?.tokenCount || 0)
        if (rarities) {
          const groupVariants = _.groupBy(rarities.traits, 'trait_type')
          setAllTraits(
            rarities.traits.filter(({ trait_type }) => {
              return (
                !rarities.rankingOptions.excludeTraits.includes(trait_type) &&
                // Filter out trait types that have more variations than half the collection size,
                // since it likely won't be very interesting to filter by and clogs up the select list
                groupVariants[trait_type].length < rarities.tokenCount * 0.5
              )
            }),
          )
        }
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionSlug, filters.traits])

  if (preFilteredTokens.length < loadedItems && fetchUnordered) {
    preFilteredTokens = preFilteredTokens.concat(
      createPlaceholderTokens(
        loadedItems - preFilteredTokens.length,
        preFilteredTokens.length,
      ),
    )
  }

  // Load assets (ranked)
  useEffect(() => {
    if (fetchUnordered) return
    const updateBatch: typeof assetMap = {}
    const batchUpdate = _.throttle(
      () => {
        setAssetMap((assetMap) => ({ ...assetMap, ...updateBatch }))
      },
      100,
      { leading: false },
    )
    slicedTokens.forEach(async ({ iteratorID, placeholder }) => {
      if (
        assetMap[iteratorID] ||
        loadingAssetMapRef.current[iteratorID] ||
        placeholder
      ) {
        return
      }
      loadingAssetMapRef.current[iteratorID] = true
      const asset = await fetchAssetBatched(collectionSlug, String(iteratorID))
      updateBatch[iteratorID] = asset
      batchUpdate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUnordered, loadedItems, tokenCount, tokens])

  // Load assets (unranked)
  const fetchedTokenCount = tokens ? tokens.length : 0
  useEffect(() => {
    if (
      !fetchUnordered ||
      fetchedTokenCount >= loadedItems ||
      (fetchedTokenCount && !cursor) ||
      fetchingUnrankedRef.current
    )
      return
    ;(async () => {
      fetchingUnrankedRef.current = true
      const { assets, next } = await fetchAssets(collectionSlug, cursor)

      const assetMapUpdate = assets.reduce<Record<string, Asset>>(
        (acc, asset) => {
          acc[asset.token_id] = asset
          return acc
        },
        {},
      )
      unstable_batchedUpdates(() => {
        setCursor(next)
        if (next === null) {
          setLoadedItems(fetchedTokenCount + assets.length)
        }
        setAssetMap((assetMap) => ({ ...assetMap, ...assetMapUpdate }))
        setTokens((tokens) => {
          return (tokens || []).concat(
            assets.map((asset) => ({
              iteratorID: asset.token_id,
              rank: 1,
              noTraitCountRank: 1,
              placeholder: false,
            })),
          )
        })
      })
      fetchingUnrankedRef.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUnordered, fetchedTokenCount, loadedItems])

  // Tokens filtered with data that we have _after_ fetching the asset
  const postFilteredTokens = slicedTokens
    .map(({ iteratorID, placeholder }) => {
      return {
        tokenId: String(iteratorID),
        asset: placeholder ? { placeholder: true } : assetMap[iteratorID],
        placeholder,
      }
    })
    .filter(({ asset }) => {
      if (asset === null) return false
      if (!asset || 'placeholder' in asset) return true
      if (
        filters.status.includes('buyNow') &&
        (!asset.sell_orders?.length ||
          asset.sell_orders[0].payment_token_contract.symbol === 'WETH')
      ) {
        return false
      }

      if (filters.priceRange[0] || filters.priceRange[1]) {
        const matchesPriceRange =
          asset.sell_orders?.length &&
          weiToEth(+asset.sell_orders[0].current_price) >=
            (filters.priceRange[0] || 0) &&
          weiToEth(+asset.sell_orders[0].current_price) <=
            (filters.priceRange[1] || Infinity)

        if (!matchesPriceRange) return false
      }

      return true
    })

  useEffect(() => {
    if (fetchUnordered) {
      if (!cursor) return
    } else {
      if (tokens && tokens.length <= loadedItems) return
    }
    window.addEventListener('scroll', throttledLoadMore)
    window.addEventListener('resize', throttledLoadMore)
    return () => {
      window.removeEventListener('scroll', throttledLoadMore)
      window.removeEventListener('resize', throttledLoadMore)
    }
  }, [throttledLoadMore, tokens, loadedItems, fetchUnordered, cursor])

  useEffect(() => {
    if (tokens && tokens.length <= loadedItems) return
    throttledLoadMore()
  }, [
    throttledLoadMore,
    assetMap,
    filters.priceRange,
    filters.status,
    tokens,
    loadedItems,
  ])

  const {
    massBidStates,
    isMassBidding,
    startMassBid,
    stopMassBid,
    clearMassBid,
  } = useMassBid({ tokens: postFilteredTokens })

  const placeholderBorderColor = useColorModeValue('#e5e8eb', '#151b22')

  return (
    <HStack width="100%" alignItems="flex-start" position="relative">
      <Filters
        isUnranked={isUnranked}
        tokenCount={tokenCount}
        address={address}
        filters={filters}
        allTraits={allTraits}
        onApplyFilters={(appliedFilters) => {
          unstable_batchedUpdates(() => {
            clearMassBid()
            setFilters(appliedFilters)
            setLoadedItems(40)
            if (appliedFilters.traits !== filters.traits) {
              setTokens(undefined)
            }
            if (isUnranked) {
              if (!_.isEmpty(appliedFilters.includedIds)) {
                setTokens(
                  Object.keys(appliedFilters.includedIds!).map((id) => {
                    return {
                      iteratorID: id,
                      noTraitCountRank: 0,
                      rank: 0,
                    }
                  }),
                )
              } else if (!_.isEmpty(filters.includedIds)) {
                setTokens([])
                setCursor(null)
              }
            }
          })
        }}
        showSearchProgress={
          filters.status.length > 0 ||
          filters.priceRange[0] !== undefined ||
          filters.priceRange[1] !== undefined
        }
        searchNumber={loadedItems}
        onStartMassBid={startMassBid}
      />
      {!isUnranked && (tokens === null || tokens?.length === 0) ? (
        <Flex width="100%" justifyContent="center" py="16" height="800px">
          <Text fontSize="2xl" opacity={0.75}>
            {filters.traits.length
              ? 'No items matching filters available'
              : 'No items available'}
          </Text>
        </Flex>
      ) : (
        <SimpleGrid
          minChildWidth="175px"
          spacing="4"
          px="4"
          py="4"
          width="100%"
          ref={gridRef}
        >
          {postFilteredTokens.map(({ tokenId, asset, placeholder }, index) => {
            return (
              <GridItem
                key={`${tokenId}${placeholder ? '_placeholder' : ''}`}
                renderItem={() => (
                  <SearchAsset
                    address={address}
                    tokenId={tokenId}
                    asset={asset}
                    massBidState={massBidStates[tokenId]}
                  />
                )}
                renderPlaceholder={() => (
                  <Box
                    paddingBottom={ASSET_INFO_HEIGHT}
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={placeholderBorderColor}
                  >
                    <Box css={{ aspectRatio: '1' }} width="100%" />
                    <Box height="80px" />
                  </Box>
                )}
              />
            )
          })}
          {postFilteredTokens.length < 10
            ? _.times(10 - postFilteredTokens.length, (i) => {
                return (
                  <Box paddingBottom={ASSET_INFO_HEIGHT} key={i}>
                    <Box css={{ aspectRatio: '1' }} width="100%" />
                    <Box height="80px" />
                  </Box>
                )
              })
            : null}
        </SimpleGrid>
      )}
      {isMassBidding && <MassBidOverlay onStop={stopMassBid} />}
    </HStack>
  )
}

export default SearchResults
