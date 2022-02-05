import {
  Box,
  SimpleGrid,
  HStack,
  Flex,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import _ from 'lodash'
import { useState, useEffect, useRef, useCallback } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import {
  Asset,
  fetchAssetBatched,
  fetchCollectionAddress,
  fetchRaritiesWithTraits,
  Rarities,
  Trait,
} from '../../utils/api'
import SearchAsset from './SearchAsset'
import { HEIGHT as ASSET_INFO_HEIGHT } from '../AssetInfo/AssetInfo'
import { useInView } from 'react-intersection-observer'
import Filters, { FiltersType } from './Filters'
import { weiToEth } from '../../utils/ethereum'
import { determineRarityType, RARITY_TYPES } from '../../utils/rarity'
import { MassBidState } from './MassBidStatus'
import Toast from '../Toast'
import MassBidOverlay from './MassBidOverlay'

const PLACEHOLDER_TOKENS = _.times(40, (num) => ({
  iteratorID: num,
  rank: num,
  placeholder: true,
}))
const LOAD_MORE_SCROLL_THRESHOLD = 600

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
  const toast = useToast()
  const [tokenCount, setTokenCount] = useState(0)
  const [tokens, setTokens] = useState<Rarities['tokens'] | null | undefined>()
  const [address, setAddress] = useState<string | null>(null)
  const [loadedItems, setLoadedItems] = useState(40)
  const [assetMap, setAssetMap] = useState<Record<string, Asset>>({})
  const massBidProcessRef = useRef<{
    processNumber: number
    processingIndex: number
    status: 'idle' | 'processing' | 'stopped'
  }>({ processingIndex: -1, processNumber: 0, status: 'idle' })
  const [massBid, setMassBid] = useState<{
    price: number
    expirationTime: number
    currentIndex: number
  } | null>(null)
  const [massBidStates, setMassBidStates] = useState<
    Record<string, MassBidState>
  >({})

  const loadingAssetMapRef = useRef<Record<string, boolean>>({})
  const [allTraits, setAllTraits] = useState<Trait[]>([])
  const [filters, setFilters] = useState<FiltersType>({
    status: [],
    priceRange: [undefined, undefined],
    highestRarity: 'Legendary',
    traits: [],
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledLoadMore = useCallback(
    _.throttle(() => {
      if (!gridRef.current) return
      const { bottom } = gridRef.current.getBoundingClientRect()
      if (
        bottom > 0 &&
        bottom - window.innerHeight <= LOAD_MORE_SCROLL_THRESHOLD
      ) {
        setLoadedItems((items) => items + 20)
      }
    }, 250),
    [],
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
        setTokens(rarities ? rarities.tokens : null)
        setTokenCount(rarities.tokenCount)
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

  // Tokens filtered with data that we have _before_ fetching the asset
  const preFilteredTokens = (tokens && address ? tokens : PLACEHOLDER_TOKENS)
    ?.filter(({ rank }) => {
      const rarityType = determineRarityType(rank, tokenCount)
      if (!rarityType) return true
      const rarityIndex = RARITY_TYPES.findIndex(
        ({ name }) => rarityType.name === name,
      )
      const highestRarityIndex = RARITY_TYPES.findIndex(
        ({ name }) => name === filters.highestRarity,
      )
      return rarityIndex >= highestRarityIndex
    })
    .slice(0, loadedItems) as (Rarities['tokens'][number] & {
    placeholder: boolean
  })[]

  useEffect(() => {
    // Load assets
    if (!address) return
    const updateBatch: typeof assetMap = {}
    const batchUpdate = _.throttle(
      () => {
        setAssetMap((assetMap) => ({ ...assetMap, ...updateBatch }))
      },
      100,
      { leading: false },
    )
    preFilteredTokens.forEach(async ({ iteratorID, placeholder }) => {
      if (
        assetMap[iteratorID] ||
        loadingAssetMapRef.current[iteratorID] ||
        placeholder
      ) {
        return
      }
      loadingAssetMapRef.current[iteratorID] = true
      const asset = await fetchAssetBatched(address, iteratorID)
      updateBatch[iteratorID] = asset
      batchUpdate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, filters.highestRarity, loadedItems, tokenCount, tokens])

  // Tokens filtered with data that we have _after_ fetching the asset
  const postFilteredTokens = preFilteredTokens
    .map(({ iteratorID, placeholder }) => {
      return {
        tokenId: String(iteratorID),
        asset: placeholder ? null : assetMap[iteratorID],
        placeholder,
      }
    })
    .filter(({ asset }) => {
      if (!asset) return true
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
    if (
      !massBid ||
      massBidProcessRef.current.processingIndex === massBid.currentIndex ||
      massBidProcessRef.current.status !== 'idle'
    ) {
      return
    }
    massBidProcessRef.current = {
      processNumber: massBidProcessRef.current.processNumber,
      processingIndex: massBid.currentIndex,
      status: 'processing',
    }

    const asset = postFilteredTokens[massBid.currentIndex].asset
    const processNumber = massBidProcessRef.current.processNumber

    // Listen for errors, unsubscribe
    const messageListener = (event: any) => {
      let state: MassBidState | null = null
      let initializeNext = false
      if (event.data.params?.tokenId !== asset!.token_id) {
        return
      }

      if (event.data.method === 'SuperSea__Bid__Error') {
        if (/declined to authorize/i.test(event.data.params.error.message)) {
          state = 'SKIPPED'
          initializeNext = true
        } else if (
          /insufficient balance/i.test(event.data.params.error.message)
        ) {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={`You don't have enough WETH to place this bid. Make sure to wrap some first.`}
                type="error"
              />
            ),
          })
          state = 'FAILED'
          massBidProcessRef.current.status = 'stopped'
        } else {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={`Unable to place bid on item. Received error "${event.data.params.error.message}"`}
                type="error"
              />
            ),
          })
          state = 'FAILED'
          initializeNext = true
        }
      } else if (event.data.method === 'SuperSea__Bid__Signed') {
        state = 'SIGNED'
      } else if (event.data.method === 'SuperSea__Bid__Success') {
        state = 'COMPLETED'
        initializeNext = true
      }
      if (!state) return
      if (
        massBid.currentIndex === postFilteredTokens.length - 1 ||
        massBidProcessRef.current.status === 'stopped' ||
        massBidProcessRef.current.processNumber !== processNumber
      ) {
        initializeNext = false
      }
      if (initializeNext) {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
          [postFilteredTokens[massBid.currentIndex + 1].tokenId]: 'PROCESSING',
        }))
        massBidProcessRef.current.status = 'idle'
        setMassBid({
          ...massBid,
          currentIndex: massBid.currentIndex + 1,
        })
      } else {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
        }))
      }
      if (state !== 'SIGNED') {
        window.removeEventListener('message', messageListener)
      }
    }
    window.addEventListener('message', messageListener)

    window.postMessage({
      method: 'SuperSea__Bid',
      params: {
        asset,
        tokenId: asset?.token_id,
        address: asset?.asset_contract.address,
        price: massBid.price,
        expirationTime: massBid.expirationTime,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [massBid, postFilteredTokens])

  useEffect(() => {
    if (tokens && tokens.length <= loadedItems) return
    window.addEventListener('scroll', throttledLoadMore)
    window.addEventListener('resize', throttledLoadMore)
    return () => {
      window.removeEventListener('scroll', throttledLoadMore)
      window.removeEventListener('resize', throttledLoadMore)
    }
  }, [throttledLoadMore, tokens, loadedItems])

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

  const placeholderBorderColor = useColorModeValue('#e5e8eb', '#151b22')

  return (
    <HStack width="100%" alignItems="flex-start" position="relative">
      <Filters
        filters={filters}
        allTraits={allTraits}
        onApplyFilters={(appliedFilters) => {
          unstable_batchedUpdates(() => {
            setMassBid(null)
            setMassBidStates({})
            setFilters(appliedFilters)
            setLoadedItems(40)
            if (appliedFilters.traits !== filters.traits) {
              setTokens(undefined)
            }
          })
        }}
        showSearchProgress={
          filters.status.length > 0 ||
          filters.priceRange[0] !== undefined ||
          filters.priceRange[1] !== undefined
        }
        searchNumber={loadedItems}
        onStartMassBid={({ price, expirationTime }) => {
          massBidProcessRef.current = {
            processingIndex: -1,
            processNumber: massBidProcessRef.current.processNumber + 1,
            status: 'idle',
          }
          setMassBidStates({
            [postFilteredTokens[0].tokenId]: 'PROCESSING',
          })
          setMassBid({
            price,
            expirationTime,
            currentIndex: 0,
          })
        }}
      />
      {tokens === null || tokens?.length === 0 ? (
        <Flex width="100%" justifyContent="center" py="16" height="800px">
          <Text fontSize="2xl" opacity={0.75}>
            {filters.traits.length
              ? 'No items matching filters available'
              : 'This collection has not been ranked yet'}
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
      {massBid && (
        <MassBidOverlay
          onStop={() => {
            massBidProcessRef.current.status = 'stopped'
            setMassBid(null)
          }}
        />
      )}
    </HStack>
  )
}

export default SearchResults
