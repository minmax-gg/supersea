/* eslint-disable react-hooks/exhaustive-deps */
import _ from 'lodash'
import React, { useEffect, useState, useRef } from 'react'
import { Button, Flex, Icon, Tooltip, Box, useToast } from '@chakra-ui/react'
import { BiRefresh } from 'react-icons/bi'
import Logo from '../Logo'
import ListingNotifierModal, { Notifier } from './ListingNotifierModal'
import { MatchedAsset } from './MatchedAssetListing'
import { readableEthValue, weiToEth } from '../../utils/ethereum'
import {
  fetchCollectionAddress,
  fetchIsRanked,
  fetchRaritiesWithTraits,
  fetchSelectors,
  Trait,
} from '../../utils/api'
import { determineRarityType, RARITY_TYPES } from '../../utils/rarity'
import { useUser } from '../../utils/user'
import { triggerQuickBuy } from '../AssetInfo/BuyNowButton'

const POLL_RETRIES = 15

const createPollTime = (bufferSeconds = 0) =>
  new Date(Date.now() - bufferSeconds * 1000).toISOString().replace(/Z$/, '')

type Rarities = {
  tokenRarity: Record<string, number>
  tokenCount: number
  isRanked: boolean
  traits: Trait[]
}

const listingMatchesNotifier = ({
  asset,
  notifier,
  rarities,
  assetsMatchingNotifier,
}: {
  asset: MatchedAsset
  notifier: Notifier
  rarities: Rarities | null
  assetsMatchingNotifier: Record<string, Record<string, boolean>>
}) => {
  // Auctions
  if (!notifier.includeAuctions && asset.currency === 'WETH') {
    return false
  }
  // Min Price
  if (
    notifier.minPrice !== null &&
    weiToEth(Number(asset.price)) < notifier.minPrice
  ) {
    return false
  }
  // Max Price
  if (
    notifier.maxPrice !== null &&
    weiToEth(Number(asset.price)) > notifier.maxPrice
  ) {
    return false
  }
  // Rarity
  if (rarities) {
    const rank = rarities.tokenRarity[asset.tokenId]
    if (notifier.lowestRarity !== 'Common') {
      if (!rank) {
        return false
      }
      const assetRarity = determineRarityType(rank, rarities.tokenCount)
      const notifierRarityIndex = RARITY_TYPES.findIndex(
        ({ name }) => name === notifier.lowestRarity,
      )
      const assetRarityIndex = RARITY_TYPES.findIndex(
        ({ name }) => name === assetRarity.name,
      )
      if (assetRarityIndex > notifierRarityIndex) {
        return false
      }
    } else if (notifier.lowestRankNumber !== null) {
      if (!rank) {
        return false
      }
      if (rank > notifier.lowestRankNumber) {
        return false
      }
    }
  }
  // Traits
  if (notifier.traits.length) {
    if (
      !assetsMatchingNotifier[notifier.id] ||
      !assetsMatchingNotifier[notifier.id][asset.tokenId]
    ) {
      return false
    }
  }
  return true
}

const throttledPlayNotificationSound = _.throttle(() => {
  const audio = new Audio(chrome.runtime.getURL('/notification.mp3'))
  audio.play()
}, 1000)

// Keep state cached so it's not lost when component is unmounted from
// switching event type filters on OpenSea
type CachedState = {
  collectionSlug: string
  assetsMatchingNotifier: Record<string, Record<string, boolean>>
  rarities: Rarities | null
  pollTime: string | null
  pollInterval: number
  addedListings: Record<string, boolean>
  matchedAssets: MatchedAsset[]
  activeNotifiers: Notifier[]
  playSound: boolean
  sendNotification: boolean
  seenListingsCount: number
  notificationIds: string[]
}
let DEFAULT_STATE: CachedState = {
  collectionSlug: '',
  activeNotifiers: [],
  matchedAssets: [],
  addedListings: {},
  pollTime: null,
  pollInterval: 2,
  rarities: null,
  assetsMatchingNotifier: {},
  playSound: true,
  sendNotification: true,
  seenListingsCount: 0,
  notificationIds: [],
}
let cachedState = DEFAULT_STATE

const ListingNotifier = ({ collectionSlug }: { collectionSlug: string }) => {
  const toast = useToast()
  const { isFounder } = useUser() || { isFounder: false }
  const [modalOpen, setModalOpen] = useState(false)

  const stateToRestore =
    cachedState.collectionSlug === collectionSlug ? cachedState : DEFAULT_STATE
  const [activeNotifiers, setActiveNotifiers] = useState<Notifier[]>(
    stateToRestore.activeNotifiers,
  )
  const [pollInterval, setPollInterval] = useState(stateToRestore.pollInterval)
  const [matchedAssets, setMatchedAssets] = useState<MatchedAsset[]>(
    stateToRestore.matchedAssets,
  )
  const addedListings = useRef<Record<string, boolean>>(
    stateToRestore.addedListings,
  ).current
  const pollTimeRef = useRef<string | null>(stateToRestore.pollTime)
  const [rarities, setRarities] = useState<Rarities | null>(
    stateToRestore.rarities,
  )
  const assetsMatchingNotifier = useRef<
    Record<string, Record<string, boolean>>
  >(stateToRestore.assetsMatchingNotifier).current

  const [playSound, setPlaySound] = useState(stateToRestore.playSound)
  const [sendNotification, setSendNotification] = useState(
    stateToRestore.sendNotification,
  )

  const [pollStatus, setPollStatus] = useState<
    'STARTING' | 'ACTIVE' | 'FAILED'
  >('STARTING')

  const [seenListingsCount, setSeenListingsCount] = useState(
    stateToRestore.seenListingsCount,
  )
  const retriesRef = useRef(0)
  const [notificationIds, setNotificationIds] = useState(
    stateToRestore.notificationIds,
  )

  const { isSubscriber } = useUser() || { isSubscriber: false }

  // Cache state
  useEffect(() => {
    cachedState = {
      collectionSlug: collectionSlug,
      assetsMatchingNotifier: assetsMatchingNotifier,
      rarities,
      pollTime: pollTimeRef.current,
      addedListings,
      matchedAssets,
      activeNotifiers,
      playSound,
      pollInterval,
      sendNotification,
      seenListingsCount,
      notificationIds,
    }
  }, [
    activeNotifiers,
    addedListings,
    assetsMatchingNotifier,
    collectionSlug,
    matchedAssets,
    pollInterval,
    rarities,
    playSound,
    sendNotification,
    seenListingsCount,
    notificationIds,
  ])

  const unreadNotifications = matchedAssets.length - seenListingsCount

  // Load rarities and traits
  useEffect(() => {
    if (rarities) return
    ;(async () => {
      let address = null
      try {
        address = await fetchCollectionAddress(collectionSlug)
      } catch (err) {
        console.error('failed fetching collection slug', err)
      }
      if (!address) {
        setRarities({
          tokenRarity: {},
          tokenCount: 0,
          isRanked: false,
          traits: [],
        })
        return
      }
      if (isSubscriber) {
        const rarities = await fetchRaritiesWithTraits(address, [])
        setRarities({
          tokenRarity: _.mapValues(
            _.keyBy(rarities.tokens, 'iteratorID'),
            'rank',
          ),
          tokenCount: rarities.tokenCount,
          isRanked: rarities.tokenCount > 0,
          traits: rarities.traits,
        })
      } else {
        const isRanked = await fetchIsRanked(address)
        setRarities({
          tokenRarity: {},
          tokenCount: 0,
          isRanked: Boolean(isRanked),
          traits: [],
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionSlug, rarities])

  // Set up polling
  useEffect(() => {
    let pollTimeout: NodeJS.Timeout | null = null
    if (activeNotifiers.length === 0 || pollStatus === 'FAILED') {
      pollTimeout !== null && clearInterval(pollTimeout)
    } else {
      if (pollTimeRef.current === null) {
        pollTimeRef.current = createPollTime(5)
      }
      pollTimeout = setInterval(async () => {
        chrome.storage.local.get(
          ['openSeaGraphQlRequests'],
          async ({ openSeaGraphQlRequests }) => {
            const request = openSeaGraphQlRequests?.EventHistoryPollQuery
            if (request) {
              const selectors = await fetchSelectors()
              const body = JSON.parse(request.body)
              body.variables = {
                ...body.variables,
                ...selectors.listingNotifier.api.staticVariables,
                [selectors.listingNotifier.api.variablePaths.collectionSlug]: [
                  collectionSlug,
                ],
                [selectors.listingNotifier.api.variablePaths.timestamp]:
                  pollTimeRef.current,
              }

              const nextPollTime = createPollTime(pollInterval / 1000 / 2)
              let fetchedAssets = null
              try {
                const res = await fetch(request.url, {
                  method: 'POST',
                  body: JSON.stringify(body),
                  headers: request.headers.reduce(
                    (
                      acc: Record<string, string>,
                      { name, value }: { name: string; value: string },
                    ) => {
                      if (value) {
                        acc[name] = value
                      }
                      return acc
                    },
                    {},
                  ),
                })
                const json = await res.json()
                pollTimeRef.current = nextPollTime
                const paths = selectors.listingNotifier.api.resultPaths
                fetchedAssets = _.get(json, paths.edges).map((edge: any) => {
                  if (!_.get(edge, paths.asset)) return null
                  const chain = _.get(edge, paths.chain)
                  return {
                    listingId: _.get(edge, paths.listingId),
                    tokenId: _.get(edge, paths.tokenId),
                    contractAddress: _.get(edge, paths.contractAddress),
                    chain: chain === 'MATIC' ? 'polygon' : 'ethereum',
                    name:
                      _.get(edge, paths.name) ||
                      _.get(edge, paths.collectionName),
                    image: _.get(edge, paths.image),
                    price: _.get(edge, paths.price),
                    currency: _.get(edge, paths.currency),
                    timestamp: _.get(edge, paths.timestamp),
                  }
                })
              } catch (e) {
                console.error('failed poll request', e)
                chrome.storage.local.remove(['openSeaGraphQlRequests'])
                retriesRef.current += 1
              }
              if (fetchedAssets) {
                // Prioritize notifiers with quick buy, if multiple notifiers match
                // we don't want a non-quick-buy one to prevent the quick buy from happening.
                const sortedNotifiers = [...activeNotifiers].sort(
                  (a, b) => Number(b.autoQuickBuy) - Number(a.autoQuickBuy),
                )
                const filteredAssets = fetchedAssets
                  .filter(Boolean)
                  .filter(
                    (asset: MatchedAsset) => !addedListings[asset.listingId],
                  )
                  .map((asset: MatchedAsset) => {
                    const notifier = sortedNotifiers.find((notifier) =>
                      listingMatchesNotifier({
                        asset,
                        notifier,
                        rarities,
                        assetsMatchingNotifier,
                      }),
                    )
                    return { ...asset, notifier }
                  })
                  .filter((asset: MatchedAsset) => Boolean(asset.notifier))
                filteredAssets.forEach(
                  ({
                    notifier,
                    ...asset
                  }: MatchedAsset & { notifier: Notifier }) => {
                    addedListings[asset.listingId] = true
                    const rank = rarities?.tokenRarity[asset.tokenId] || null
                    if (sendNotification) {
                      chrome.runtime.sendMessage(
                        {
                          method: 'notify',
                          params: {
                            id: asset.listingId,
                            openOnClick: `https://opensea.io/assets/${asset.contractAddress}/${asset.tokenId}`,
                            options: {
                              title: 'SuperSea - New Listing',
                              type: 'basic',
                              iconUrl: asset.image,
                              requireInteraction: true,
                              silent: true,
                              message: `${rank ? `Rank #${rank} - ` : ''}${
                                asset.name
                              } (${readableEthValue(+asset.price)} ${
                                asset.currency
                              })`,
                            },
                          },
                        },
                        (notificationId: string) => {
                          if (playSound) {
                            throttledPlayNotificationSound()
                          }
                          setNotificationIds((ids) =>
                            ids.concat([notificationId]),
                          )
                        },
                      )
                    } else if (playSound) {
                      throttledPlayNotificationSound()
                    }
                    if (notifier.autoQuickBuy) {
                      triggerQuickBuy({
                        isFounder,
                        address: asset.contractAddress,
                        tokenId: asset.tokenId,
                        toast,
                        onComplete: () => {},
                      })
                    }
                  },
                )
                setPollStatus('ACTIVE')
                if (filteredAssets.length) {
                  setMatchedAssets((prev) => [...filteredAssets, ...prev])
                }
              }
            } else {
              // Retry n number of times before showing error
              retriesRef.current += 1
            }
            if (retriesRef.current >= POLL_RETRIES) {
              setPollStatus('FAILED')
            }
          },
        )
      }, pollInterval * 1000)
    }

    return () => {
      pollTimeout && clearInterval(pollTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeNotifiers,
    collectionSlug,
    rarities,
    sendNotification,
    playSound,
    pollInterval,
    pollStatus,
  ])

  return (
    <Flex justifyContent="flex-start" py="2" alignItems="center">
      <Box position="relative">
        {unreadNotifications > 0 && !modalOpen ? (
          <Flex
            color="white"
            bg="red.500"
            fontSize="xs"
            fontWeight="500"
            px="1"
            position="absolute"
            top="0"
            left="0"
            minWidth="20px"
            height="20px"
            transform="translate(-50%, -50%)"
            borderRadius="20px"
            alignItems="center"
            justifyContent="center"
            lineHeight={0}
            zIndex={2}
          >
            {unreadNotifications}
          </Flex>
        ) : null}
        <Button
          rightIcon={<Logo width="20px" height="20px" flipped color="white" />}
          color="white"
          iconSpacing="3"
          onClick={() => setModalOpen(true)}
          bg="blue.500"
          _hover={{ bg: 'blue.400' }}
          _active={{ bg: 'blue.300' }}
        >
          Listing Notifiers
        </Button>
      </Box>
      {pollStatus === 'ACTIVE' && activeNotifiers.length ? (
        <Tooltip
          label="Scanning for new listings"
          fontSize="sm"
          hasArrow
          bg="gray.700"
          placement="top"
          color="white"
          px="2"
          py="1"
        >
          <Box mx="3" width="24px" height="24px">
            <Icon
              as={BiRefresh}
              width="24px"
              height="24px"
              animation="SuperSea__Rotate 4s linear infinite"
            />
          </Box>
        </Tooltip>
      ) : null}
      <ListingNotifierModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSeenListingsCount(matchedAssets.length)
        }}
        pollInterval={pollInterval}
        setPollInterval={setPollInterval}
        allTraits={rarities?.traits}
        isRanked={rarities ? rarities.isRanked : null}
        isSubscriber={isSubscriber}
        addedNotifiers={activeNotifiers}
        onRetry={() => {
          retriesRef.current = 0
          setPollStatus('STARTING')
        }}
        onAddNotifier={async (notifier) => {
          if (notifier.traits.length) {
            const address = await fetchCollectionAddress(collectionSlug)
            const { tokens } = await fetchRaritiesWithTraits(
              address,
              notifier.traits.map((val) => {
                const { groupName, value } = JSON.parse(val)
                return { key: groupName, value }
              }),
            )
            assetsMatchingNotifier[notifier.id] = tokens.reduce<
              Record<string, boolean>
            >((acc, { iteratorID }) => {
              acc[iteratorID] = true
              return acc
            }, {})
          }
          setActiveNotifiers((notifiers) => [...notifiers, notifier])
        }}
        onRemoveNotifier={(id) => {
          setActiveNotifiers((notifiers) =>
            notifiers.filter((n) => n.id !== id),
          )
          delete assetsMatchingNotifier[id]
        }}
        matchedAssets={matchedAssets}
        onClearMatches={() => {
          chrome.runtime.sendMessage({
            method: 'clearNotifications',
            params: {
              ids: notificationIds,
            },
          })
          setMatchedAssets([])
          setNotificationIds([])
        }}
        playSound={playSound}
        pollStatus={pollStatus}
        onChangePlaySound={setPlaySound}
        sendNotification={sendNotification}
        onChangeSendNotification={setSendNotification}
      />
    </Flex>
  )
}

export default ListingNotifier
