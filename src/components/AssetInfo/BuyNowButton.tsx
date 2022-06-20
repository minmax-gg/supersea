import React, { useState } from 'react'
import {
  Icon,
  IconButton,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { FaShoppingCart } from 'react-icons/fa'
import Toast from '../Toast'
import {
  getExtensionConfig,
  useExtensionConfig,
} from '../../utils/extensionConfig'
import { useUser } from '../../utils/user'
import { fetchListings, fetchOptimalGasPreset } from '../../utils/api'
import { getCheapestListing } from '../../utils/orders'

const readableError = (message: string) => {
  if (/insufficient funds/.test(message)) {
    return 'You do not have enough funds to buy this asset.'
  } else if (/cancelled due to price change/.test(message)) {
    return message
  }
  return `Unable to buy item. Received error "${message}"`
}

export const triggerQuickBuy = async ({
  isFounder,
  toast,
  address,
  tokenId,
  displayedPrice,
  gasOverride,
  onComplete,
}: {
  isFounder: boolean
  toast: ReturnType<typeof useToast>
  address: string
  tokenId: string
  displayedPrice?: string
  gasOverride?: null | { fee: number; priorityFee: number }
  onComplete: () => void
}) => {
  const [
    { listings: wyvern_listings, seaport_listings },
    gasPreset,
  ] = await Promise.all([
    fetchListings(address, tokenId).catch((e) => {
      return {}
    }),
    (async () => {
      if (gasOverride) return gasOverride
      const config = await getExtensionConfig(false)
      if (config.quickBuyGasPreset === 'fixed') {
        return config.fixedGas
      } else if (config.quickBuyGasPreset === 'optimal' && isFounder) {
        try {
          const optimalGasPreset = await fetchOptimalGasPreset()
          return optimalGasPreset
        } catch (err) {
          console.error(err)
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={
                  'Unable to load optimal gas settings, using MetaMask defaults.'
                }
                type="error"
              />
            ),
          })
          return null
        }
      }
      return null
    })(),
  ])

  const cheapest = getCheapestListing(wyvern_listings, seaport_listings)
  if (!cheapest) {
    toast({
      duration: 7500,
      position: 'bottom-right',
      render: () => (
        <Toast text={'Unable to get asset listing.'} type="error" />
      ),
    })
    onComplete()
    return
  }

  window.postMessage({
    method: 'SuperSea__Buy',
    params: {
      order: cheapest,
      tokenId,
      address,
      gasPreset,
      displayedPrice,
    },
  })
  // Listen for errors, unsubscribe
  const messageListener = (event: any) => {
    if (
      event.data.method === 'SuperSea__Buy__Error' &&
      event.data.params.tokenId === tokenId &&
      event.data.params.address === address
    ) {
      if (!/user denied/i.test(event.data.params.error.message)) {
        toast({
          duration: 7500,
          position: 'bottom-right',
          render: () => (
            <Toast
              text={readableError(event.data.params.error.message)}
              type="error"
            />
          ),
        })
      }
      window.removeEventListener('message', messageListener)
      onComplete()
    } else if (
      event.data.method === 'SuperSea__Buy__Success' &&
      event.data.params.tokenId === tokenId &&
      event.data.params.address === address
    ) {
      window.removeEventListener('message', messageListener)
      onComplete()
    }
  }

  window.addEventListener('message', messageListener)
}

export const BuyNowButtonUI = ({
  address,
  tokenId,
  active,
  displayedPrice,
  gasOverride,
}: {
  address: string
  tokenId: string
  active: boolean
  displayedPrice?: string
  gasOverride?: null | { fee: number; priorityFee: number }
}) => {
  const toast = useToast()
  const { isFounder } = useUser() || { isFounder: false }
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Tooltip
      label={active ? 'Quick Buy' : 'Activate Quick Buy'}
      fontSize="xs"
      hasArrow
      bg="gray.700"
      placement="top"
      color="white"
      px="2"
      py="1"
    >
      <IconButton
        icon={
          <Icon as={FaShoppingCart} color="white" width="14px" height="14px" />
        }
        width="32px"
        minWidth="auto"
        height="24px"
        borderRadius="lg"
        isLoading={isLoading}
        bg={useColorModeValue(
          active ? 'blue.500' : 'gray.500',
          active ? 'blue.400' : 'gray.500',
        )}
        _hover={{
          bg: useColorModeValue(
            active ? 'blue.400' : 'gray.400',
            active ? 'blue.300' : 'gray.400',
          ),
        }}
        _active={{
          bg: useColorModeValue(
            active ? 'blue.300' : 'gray.300',
            active ? 'blue.200' : 'gray.300',
          ),
        }}
        boxShadow={useColorModeValue(
          '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
          '0 1px 2px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        )}
        aria-label="Buy Now"
        onClick={async () => {
          if (active) {
            setIsLoading(true)
            triggerQuickBuy({
              isFounder,
              toast,
              tokenId,
              address,
              displayedPrice,
              gasOverride,
              onComplete: () => setIsLoading(false),
            })
          } else {
            chrome.runtime.sendMessage({
              method: 'openPopup',
              params: { action: 'activateQuickBuy' },
            })
          }
        }}
      />
    </Tooltip>
  )
}

const BuyNowButton = (
  props: Omit<React.ComponentProps<typeof BuyNowButtonUI>, 'active'> & {},
) => {
  const [config] = useExtensionConfig()
  const user = useUser()
  if (config === null || user === null || !user.isSubscriber) {
    return null
  }

  return <BuyNowButtonUI {...props} active={config.quickBuyEnabled} />
}

export default BuyNowButton
