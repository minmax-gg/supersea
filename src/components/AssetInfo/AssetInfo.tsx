import { useEffect, useState, useContext, useCallback } from 'react'
import { CheckIcon, WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Spinner,
  Link,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  IconButton,
  useToast,
  Tag,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react'
import { FiMoreHorizontal, FiExternalLink } from 'react-icons/fi'
import TimeAgo from 'react-timeago'
import {
  Chain,
  fetchCollectionSlug,
  fetchIsRanked,
  fetchMetadata,
  fetchMetadataUriWithOpenSeaFallback,
  fetchRarities,
  fetchSelectors,
  triggerOpenSeaMetadataRefresh,
} from '../../utils/api'
import Toast from '../Toast'
import EthereumIcon from '../EthereumIcon'
import Logo from '../Logo'
import { useUser } from '../../utils/user'
import ScopedCSSPortal from '../ScopedCSSPortal'
import RefreshIndicator, { RefreshState } from './RefreshIndicator'
import { EventEmitterContext, GlobalConfigContext } from '../AppProvider'
import { RateLimit } from 'async-sema'
import BuyNowButton from './BuyNowButton'
import LockedFeature from '../LockedFeature'
import { selectElement } from '../../utils/selector'
import { determineRarityType, RARITY_TYPES } from '../../utils/rarity'
import useFloor from '../../hooks/useFloor'
import PropertiesModal from './PropertiesModal'

export const HEIGHT = 85
export const LIST_HEIGHT = 62
export const LIST_WIDTH = 140
const MEMBERSHIP_ADDRESS = '0x24e047001f0ac15f72689d3f5cd0b0f52b1abdf9'

// Temporary until we do this flagging on the backend
const FLAGGED_INACCURATE_RANKING_ADDRESSES = [
  '0x2acab3dea77832c09420663b0e1cb386031ba17b',
  '0xf1268733c6fb05ef6be9cf23d24436dcd6e0b35e',
]

const replaceImageRateLimit = RateLimit(3)

type Rarity = {
  isRanked: boolean
  tokenCount: number
  rank: number
  type: typeof RARITY_TYPES[number]
}
const RarityBadge = ({
  rarity,
  isInaccurate,
  isSubscriber,
  isMembershipNFT,
  onOpenProperties,
}: {
  rarity: Rarity | null
  isInaccurate: boolean
  isSubscriber: boolean
  isMembershipNFT: boolean
  onOpenProperties: () => void
}) => {
  if (isSubscriber || isMembershipNFT) {
    const tooltipLabel = (() => {
      if (isMembershipNFT) {
        return <Text my="0">You're all legendary to us &lt;3</Text>
      }
      if (rarity) {
        return (
          <Box lineHeight="1.6em">
            <Text my="0">
              {rarity.type.name}
              {rarity.type.top !== Infinity
                ? ` (top ${rarity.type.top * 100}%)`
                : ' (bottom 50%)'}
            </Text>
            <Text opacity="0.65" my="0">
              #{rarity.rank} / {rarity.tokenCount}
            </Text>{' '}
            <Text opacity="0.5" my="0" fontSize="xs">
              Click to view properties
            </Text>
          </Box>
        )
      }

      return ''
    })()
    return (
      <HStack spacing="1">
        <Tooltip
          isDisabled={!(rarity || isMembershipNFT)}
          label={tooltipLabel}
          size="lg"
          hasArrow
          bg="gray.700"
          placement="top"
          color="white"
          px={3}
          py={2}
        >
          <Text
            fontWeight="500"
            cursor={rarity ? 'pointer' : undefined}
            onClick={rarity === null ? undefined : onOpenProperties}
          >
            {rarity === null ? 'Unranked' : `#${rarity.rank}`}
          </Text>
        </Tooltip>
        {isInaccurate ? (
          <Tooltip
            label="This collection's ranking has been reported to be inaccurate compared to the project's official rarity guide."
            size="lg"
            hasArrow
            bg="gray.700"
            placement="top"
            color="white"
            px={3}
            py={2}
          >
            <WarningTwoIcon
              opacity="0.75"
              width="16x"
              height="16px"
              position="relative"
              top="-1px"
            />
          </Tooltip>
        ) : null}
      </HStack>
    )
  }
  if (rarity && rarity.isRanked) {
    return <LockedFeature />
  }
  return <Text fontWeight="500">Unranked</Text>
}

const AssetInfo = ({
  address,
  tokenId,
  type,
  container,
  collectionSlug: inputCollectionSlug,
  chain,
}: {
  address: string
  tokenId: string
  collectionSlug?: string
  type: 'grid' | 'list' | 'item'
  chain: Chain
  container: HTMLElement
}) => {
  const events = useContext(EventEmitterContext)
  const globalConfig = useContext(GlobalConfigContext)

  const { isSubscriber } = useUser() || { isSubscriber: false }

  const [rarity, setRarity] = useState<Rarity | null | undefined>(undefined)
  const [refreshState, setRefreshState] = useState<RefreshState>('IDLE')
  const [isAutoQueued, setIsAutoQueued] = useState(false)
  const [isAutoImageReplaced, setIsAutoImageReplaced] = useState(false)
  const [floorTooltipOpen, setFloorTooltipOpen] = useState(false)
  const [collectionSlug, setCollectionSlug] = useState(inputCollectionSlug)
  const [propertiesModalOpen, setPropertiesModalOpen] = useState(false)

  const toast = useToast()
  const isMembershipNFT = MEMBERSHIP_ADDRESS === address

  const { floor, loading: floorLoading, loadedAt: floorLoadedAt } = useFloor(
    collectionSlug,
    chain,
  )

  const replaceImage = useCallback(async () => {
    await replaceImageRateLimit()
    const selectors = await fetchSelectors()
    try {
      const metadata = await fetchMetadata(address, +tokenId)

      if (!(metadata?.image || metadata?.image_url)) {
        throw new Error('Unable to load metadata')
      }

      const imgElement = selectElement(
        container,
        selectors.assetInfo[type].image,
      ) as HTMLElement
      if (imgElement) {
        imgElement.style.opacity = '0'
        setTimeout(() => {
          imgElement.setAttribute('src', '')
        }, 0)
        setTimeout(() => {
          imgElement.style.opacity = '1'
          imgElement.setAttribute(
            'src',
            (metadata.image || metadata.image_url).replace(
              /^ipfs:\/\//,
              'https://ipfs.io/ipfs/',
            ),
          )
        }, 100)
      }
    } catch (err) {
      console.error(err)
      toast({
        duration: 3000,
        position: 'bottom-right',
        render: () => (
          <Toast text="Unable to load source image." type="error" />
        ),
      })
    }
  }, [address, container, toast, tokenId, type])

  const autoReplaceImage = useCallback(() => {
    if (globalConfig.autoImageReplaceAddresses[address]) {
      setIsAutoImageReplaced(true)
      if (!globalConfig.imageReplaced[`${address}/${tokenId}`]) {
        globalConfig.imageReplaced[`${address}/${tokenId}`] = true
        replaceImage()
      }
    } else if (isAutoImageReplaced) {
      setIsAutoImageReplaced(false)
    }
  }, [address, globalConfig, replaceImage, isAutoImageReplaced, tokenId])

  useEffect(() => {
    events.addListener('toggleAutoReplaceImage', autoReplaceImage)
    return () => {
      events.removeListener('toggleAutoReplaceImage', autoReplaceImage)
    }
  }, [autoReplaceImage, events])

  useEffect(() => {
    autoReplaceImage()
  }, [autoReplaceImage])

  const queueRefresh = useCallback(async () => {
    if (refreshState === 'QUEUING') return
    setRefreshState('QUEUING')
    try {
      await triggerOpenSeaMetadataRefresh(address, tokenId)
      setRefreshState('QUEUED')
    } catch (err) {
      setRefreshState('FAILED')
    }
  }, [address, refreshState, tokenId])

  const autoQueueRefresh = useCallback(() => {
    if (globalConfig.autoQueueAddresses[address]) {
      setIsAutoQueued(true)
      if (!globalConfig.refreshQueued[`${address}/${tokenId}`]) {
        globalConfig.refreshQueued[`${address}/${tokenId}`] = true
        queueRefresh()
      }
    } else if (isAutoQueued) {
      setIsAutoQueued(false)
    }
  }, [address, globalConfig, isAutoQueued, queueRefresh, tokenId])

  useEffect(() => {
    events.addListener('toggleAutoQueue', autoQueueRefresh)
    return () => {
      events.removeListener('toggleAutoQueue', autoQueueRefresh)
    }
  }, [autoQueueRefresh, events])

  useEffect(() => {
    autoQueueRefresh()
  }, [autoQueueRefresh])

  useEffect(() => {
    if (collectionSlug) return
    if (!address || !tokenId) return
    if (chain === 'polygon') return
    ;(async () => {
      const slug = await fetchCollectionSlug(address, tokenId)
      setCollectionSlug(slug)
    })()
  }, [address, tokenId, collectionSlug, chain])

  useEffect(() => {
    if (!(address && tokenId)) return
    ;(async () => {
      if (isSubscriber) {
        if (chain === 'polygon') {
          setRarity(null)
          return
        }
        const rarities = await fetchRarities(address)
        if (rarities) {
          const { tokenCount, tokens } = rarities
          const token = tokens.find(
            ({ iteratorID }) => String(iteratorID) === tokenId,
          )
          if (token) {
            const { rank } = token
            if (rank !== null) {
              setRarity({
                isRanked: true,
                tokenCount,
                rank,
                type: determineRarityType(rank, tokenCount),
              })
              return
            }
          }
        }
        setRarity(null)
      } else {
        const isRanked = await fetchIsRanked(address)
        if (isMembershipNFT) {
          setRarity({
            isRanked: true,
            tokenCount: 100,
            rank: 1,
            type: RARITY_TYPES[0],
          })
        } else {
          setRarity({
            isRanked: Boolean(isRanked),
            tokenCount: 0,
            rank: 0,
            type: RARITY_TYPES[RARITY_TYPES.length - 1],
          })
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, tokenId])

  return (
    <Box
      pr={type === 'list' ? 3 : 0}
      width={type === 'list' ? '165px' : undefined}
    >
      <Flex
        height={type === 'list' ? `${LIST_HEIGHT}px` : `${HEIGHT}px`}
        minWidth={type === 'list' ? `${LIST_WIDTH}px` : 0}
        transition="background 250ms ease"
        position={type === 'grid' ? 'absolute' : 'relative'}
        bottom={type === 'grid' ? 0 : undefined}
        width="100%"
        pt={type === 'list' ? 6 : 4}
        pb={type === 'list' ? 1 : 3}
        px="3"
        alignItems="flex-end"
        borderBottomRadius="5px"
        borderTopRadius={type === 'list' ? '5px' : 0}
        fontSize={type === 'list' ? '12px' : '14px'}
        color={useColorModeValue('gray.700', 'white')}
        border={type === 'list' ? '1px solid' : undefined}
        borderTop="1px solid"
        borderColor={useColorModeValue('gray.200', 'transparent')}
        _hover={{
          '.SuperSea__BuyNowContainer': {
            opacity: 1,
          },
        }}
        bg={useColorModeValue(
          rarity && (isSubscriber || isMembershipNFT)
            ? rarity.type.color.light
            : 'gray.50',
          rarity && (isSubscriber || isMembershipNFT)
            ? rarity.type.color.dark
            : 'gray.600',
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'A') {
            e.preventDefault()
          }
          e.stopPropagation()
        }}
      >
        <Box
          position="absolute"
          pointerEvents="none"
          width="100%"
          top="0"
          right="0"
          height="100%"
          borderBottomRightRadius="5px"
          borderTopRightRadius={type === 'list' ? '5px' : 0}
          overflow="hidden"
          zIndex={0}
        >
          <Logo
            flipped
            position="absolute"
            opacity={rarity && (isSubscriber || isMembershipNFT) ? 0.15 : 0.1}
            width={type === 'list' ? '42px' : '60px'}
            height={type === 'list' ? '42px' : '60px'}
            top="50%"
            right="6px"
            transform="translateY(-50%)"
            color={useColorModeValue('black', 'white')}
          />
          <Box position="absolute" bottom="2" right="2">
            <RefreshIndicator state={refreshState} />
          </Box>
        </Box>
        <Menu autoSelect={false}>
          <MenuButton
            as={IconButton}
            icon={<Icon as={FiMoreHorizontal} />}
            size="md"
            position="absolute"
            top="0"
            bg="transparent"
            height="20px"
            mt="1"
            minWidth="24px"
            ml="5px"
            left="0"
          >
            More Options
          </MenuButton>
          <ScopedCSSPortal>
            <MenuList
              borderColor={useColorModeValue('gray.200', 'gray.800')}
              zIndex="popover"
              color={useColorModeValue('black', 'white')}
              fontSize="sm"
            >
              <MenuGroup
                // @ts-ignore
                title={
                  <Text>
                    Metadata{' '}
                    {chain === 'polygon' ? (
                      <Tag fontSize="xs" mt="-1px" ml="0.35em">
                        Unavailable
                      </Tag>
                    ) : null}
                  </Text>
                }
                mr="0"
              >
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={queueRefresh}
                >
                  Queue OpenSea refresh
                </MenuItem>
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={replaceImage}
                >
                  Replace image from source
                </MenuItem>
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={async () => {
                    globalConfig.autoQueueAddresses[address] = !globalConfig
                      .autoQueueAddresses[address]

                    if (!globalConfig.autoQueueAddresses[address]) {
                      Object.keys(globalConfig.refreshQueued).forEach((key) => {
                        const [_address] = key.split('/')
                        if (address === _address) {
                          globalConfig.refreshQueued[key] = false
                        }
                      })
                    }

                    events.emit('toggleAutoQueue', {
                      value: globalConfig.autoQueueAddresses[address],
                      address,
                    })
                  }}
                >
                  <Text maxWidth="210px">
                    Mass-queue OpenSea refresh for collection
                    {isAutoQueued && (
                      <CheckIcon
                        width="12px"
                        height="auto"
                        display="inline-block"
                        marginLeft="3px"
                      />
                    )}
                  </Text>
                </MenuItem>
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={async () => {
                    globalConfig.autoImageReplaceAddresses[
                      address
                    ] = !globalConfig.autoImageReplaceAddresses[address]

                    if (!globalConfig.autoImageReplaceAddresses[address]) {
                      Object.keys(globalConfig.imageReplaced).forEach((key) => {
                        const [_address] = key.split('/')
                        if (address === _address) {
                          globalConfig.imageReplaced[key] = false
                        }
                      })
                    }

                    events.emit('toggleAutoReplaceImage', {
                      value: globalConfig.autoImageReplaceAddresses[address],
                      address,
                    })
                  }}
                >
                  <Text maxWidth="210px">
                    Mass-replace image from source for collection
                    {isAutoImageReplaced && (
                      <CheckIcon
                        width="12px"
                        height="auto"
                        display="inline-block"
                        marginLeft="3px"
                      />
                    )}
                  </Text>
                </MenuItem>
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={async () => {
                    let metadataUri = null
                    try {
                      metadataUri = await fetchMetadataUriWithOpenSeaFallback(
                        address,
                        +tokenId,
                      )
                    } catch (err) {}
                    if (!metadataUri) {
                      toast({
                        duration: 3000,
                        position: 'bottom-right',
                        render: () => (
                          <Toast text="Unable to load metadata." type="error" />
                        ),
                      })
                      return
                    }
                    if (/^data:/.test(metadataUri)) {
                      const blob = await fetch(metadataUri).then((res) =>
                        res.blob(),
                      )
                      window.open(URL.createObjectURL(blob), '_blank')
                    } else {
                      window.open(metadataUri, '_blank')
                    }
                  }}
                >
                  View Raw Data{' '}
                  <Icon as={FiExternalLink} ml="0.3em" mt="-2px" />
                </MenuItem>
              </MenuGroup>
              <MenuDivider />
              <MenuGroup
                title={chain === 'ethereum' ? 'Etherscan' : 'Polygonscan'}
              >
                <MenuItem
                  onClick={() => {
                    window.open(
                      `https://${
                        chain === 'ethereum'
                          ? 'etherscan.io'
                          : 'polygonscan.com'
                      }/token/${address}`,
                      '_blank',
                    )
                  }}
                >
                  View contract{' '}
                  <Icon as={FiExternalLink} ml="0.3em" mt="-2px" />
                </MenuItem>
              </MenuGroup>
            </MenuList>
          </ScopedCSSPortal>
        </Menu>
        <VStack
          spacing={type === 'list' ? 0 : 1}
          alignItems="flex-start"
          width="100%"
          zIndex={0}
        >
          <Flex width="100%" alignItems="center">
            <Text opacity={0.7} mr="0.5em">
              Rank:
            </Text>
            {rarity !== undefined ? (
              <RarityBadge
                isSubscriber={isSubscriber}
                isInaccurate={FLAGGED_INACCURATE_RANKING_ADDRESSES.includes(
                  address,
                )}
                rarity={rarity}
                isMembershipNFT={isMembershipNFT}
                onOpenProperties={() => setPropertiesModalOpen(true)}
              />
            ) : (
              <Spinner ml={1} width={3} height={3} opacity={0.75} />
            )}
          </Flex>
          <Flex width="100%" alignItems="center">
            <Text opacity={0.7} mr="0.5em">
              Floor:{' '}
            </Text>
            {floor !== undefined ? (
              <>
                {floor?.currency === 'ETH' ? <EthereumIcon /> : null}
                <Tooltip
                  label={
                    <Text as="span" py="0" my="0">
                      Floor updated{' '}
                      {floorTooltipOpen ? (
                        <TimeAgo date={floorLoadedAt} live={false} />
                      ) : null}
                    </Text>
                  }
                  size="md"
                  hasArrow
                  bg="gray.700"
                  placement="top"
                  color="white"
                  onOpen={() => setFloorTooltipOpen(true)}
                  onClose={() => setFloorTooltipOpen(false)}
                  px="3"
                  py="2"
                >
                  <Link
                    href={floor ? floor.floorSearchUrl : undefined}
                    fontWeight="500"
                    verticalAlign="middle"
                  >
                    {floor === null
                      ? 'Unavailable'
                      : `${floor.price} ${
                          floor.currency !== 'ETH' ? ` ${floor.currency}` : ''
                        }`}
                  </Link>
                </Tooltip>
              </>
            ) : null}
            {floorLoading ? (
              <Spinner ml={1} width={3} height={3} opacity={0.75} />
            ) : null}
          </Flex>
        </VStack>
        <Box
          position="absolute"
          pointerEvents="none"
          width="100%"
          top="0"
          right="0"
          height="100%"
          overflow="hidden"
          zIndex={0}
        >
          <Box position="absolute" bottom="2" right="2">
            <RefreshIndicator state={refreshState} />
          </Box>
        </Box>
        <Box
          position="absolute"
          top="0"
          right="0"
          m="1"
          className="SuperSea__BuyNowContainer"
          opacity="0"
          transition="opacity 115ms ease"
        >
          <BuyNowButton address={address} tokenId={tokenId} />
        </Box>
      </Flex>
      {propertiesModalOpen && (
        <PropertiesModal
          collectionSlug={collectionSlug}
          address={address}
          tokenId={tokenId}
          onClose={() => setPropertiesModalOpen(false)}
        />
      )}
    </Box>
  )
}

export default AssetInfo
