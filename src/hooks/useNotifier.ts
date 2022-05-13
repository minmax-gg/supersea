import { useToast } from '@chakra-ui/toast'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { Event } from '../components/Activity/ActivityEvent'
import { Notifier } from '../components/Activity/ListingNotifierForm'
import { MatchedAsset } from '../components/Activity/MatchedAssetListing'
import { triggerQuickBuy } from '../components/AssetInfo/BuyNowButton'
import { readableEthValue, weiToEth } from '../utils/ethereum'
import { determineRarityType, RARITY_TYPES } from '../utils/rarity'
import { useUser } from '../utils/user'

const throttledPlayNotificationSound = _.throttle(() => {
  const audio = new Audio(chrome.runtime.getURL('/notification.mp3'))
  audio.play()
}, 1000)

const nameMatches = (
  name: string,
  { value, isRegExp }: { value: string; isRegExp: boolean },
) => {
  if (isRegExp) {
    try {
      return new RegExp(value, 'i').test(name)
    } catch (e) {
      console.error(e)
      return true
    }
  }
  return name.toLowerCase().includes(value.toLowerCase())
}

const listingMatchesNotifier = ({
  event,
  notifier,
  traitCountExcluded,
}: {
  event: Event
  notifier: Notifier
  traitCountExcluded: boolean | undefined
}) => {
  if (event.contractAddress !== notifier.collection.contractAddress)
    return false

  // Auctions
  if (!notifier.includeAuctions && event.currency === 'WETH') {
    return false
  }
  // Min Price
  if (
    notifier.minPrice !== null &&
    weiToEth(Number(event.price)) < notifier.minPrice
  ) {
    return false
  }
  // Max Price
  if (
    notifier.maxPrice !== null &&
    weiToEth(Number(event.price)) > notifier.maxPrice
  ) {
    return false
  }
  // Name
  if (
    notifier.nameContains.value &&
    !nameMatches(event.name, notifier.nameContains)
  ) {
    return false
  }
  // Rarity
  if (notifier.collection.rarities) {
    const rank = traitCountExcluded
      ? notifier.collection.rarities.noTraitCountTokenRank[event.tokenId]
      : notifier.collection.rarities.tokenRank[event.tokenId]
    if (notifier.lowestRarity !== 'Common') {
      if (!rank) {
        return false
      }
      const assetRarity = determineRarityType(
        rank,
        notifier.collection.rarities.tokenCount,
      )
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
  if (notifier.tokenEligibilityMap) {
    if (!notifier.tokenEligibilityMap[event.tokenId]) {
      return false
    }
  }
  return true
}

let sentNotificationIds: string[] = []
let processedEvents: Record<string, boolean> = {}
let cachedMatchedAsset: MatchedAsset[] = []
let cachedUnseenMatchesCount = 0

const notifierPriorityScore = (notifier: Notifier) => {
  return (
    Number(notifier.autoQuickBuy) * 1000000 +
    (notifier.gasOverride
      ? notifier.gasOverride.fee + notifier.gasOverride?.priorityFee
      : 0)
  )
}

const useNotifier = ({
  activityEvents,
  notifiers,
  allTraitCountExcluded,
  playSound,
  sendNotification,
  isOpen,
}: {
  activityEvents: Event[]
  notifiers: Notifier[]
  allTraitCountExcluded: Record<string, boolean>
  playSound: boolean
  sendNotification: boolean
  isOpen: boolean
}) => {
  const toast = useToast()
  const [matchedAssets, setMatchedAssets] = useState<MatchedAsset[]>(
    cachedMatchedAsset,
  )
  const { isFounder } = useUser() || { isFounder: false }
  const [unseenMatchCount, setUnseenMatchCount] = useState(
    cachedUnseenMatchesCount,
  )

  useEffect(() => {
    const newEvents = activityEvents.filter((event) => {
      if (event.eventType !== 'CREATED') return false
      if (processedEvents[event.listingId]) return false
      processedEvents[event.listingId] = true
      return true
    })

    if (!newEvents.length) return

    const sortedNotifiers = [...notifiers].sort(
      (a, b) => notifierPriorityScore(b) - notifierPriorityScore(a),
    )

    const matches = newEvents
      .map((event) => {
        const notifier = sortedNotifiers.find((notifier) =>
          listingMatchesNotifier({
            event,
            notifier,
            traitCountExcluded: allTraitCountExcluded[event.contractAddress],
          }),
        )
        return { ...event, notifier }
      })
      .filter((asset: any) => Boolean(asset.notifier)) as (MatchedAsset & {
      notifier: Notifier
    })[]

    matches.forEach((asset) => {
      const rank = allTraitCountExcluded[asset.contractAddress]
        ? asset.notifier.collection.rarities.noTraitCountTokenRank[
            asset.tokenId
          ]
        : asset.notifier.collection.rarities.tokenRank[asset.tokenId]
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
                } (${readableEthValue(+asset.price)} ${asset.currency})`,
              },
            },
          },
          (notificationId: string) => {
            if (playSound) {
              throttledPlayNotificationSound()
            }
            sentNotificationIds = sentNotificationIds.concat([notificationId])
          },
        )
      } else if (playSound) {
        throttledPlayNotificationSound()
      }
      if (asset.notifier.autoQuickBuy) {
        triggerQuickBuy({
          isFounder,
          address: asset.contractAddress,
          tokenId: asset.tokenId,
          displayedPrice: asset.price,
          toast,
          gasOverride: asset.notifier.gasOverride,
          onComplete: () => {},
        })
      }
    })
    setMatchedAssets((prev) => {
      const next = [...matches, ...prev].slice(0, 50)
      cachedMatchedAsset = next
      return next
    })

    if (!isOpen) {
      setUnseenMatchCount((c) => {
        const next = c + matches.length
        cachedUnseenMatchesCount = next
        return next
      })
    }
  }, [
    activityEvents,
    notifiers,
    allTraitCountExcluded,
    playSound,
    sendNotification,
    isFounder,
    isOpen,
    toast,
  ])

  useEffect(() => {
    if (!isOpen) return
    setUnseenMatchCount(0)
    cachedUnseenMatchesCount = 0
  }, [isOpen])

  return {
    matchedAssets,
    unseenMatchCount,
    clearMatches: () => {
      chrome.runtime.sendMessage({
        method: 'clearNotifications',
        params: {
          ids: sentNotificationIds,
        },
      })
      setMatchedAssets([])
      sentNotificationIds = []
      cachedMatchedAsset = []
    },
  }
}

export default useNotifier
