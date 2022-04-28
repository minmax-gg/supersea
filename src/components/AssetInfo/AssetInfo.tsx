import { useEffect, useState, useContext, useCallback } from 'react'
import { CheckIcon, WarningTwoIcon } from '@chakra-ui/icons'
import queryString from 'query-string'
import _ from 'lodash'
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Spinner,
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
  useColorMode,
  Tooltip,
} from '@chakra-ui/react'
import { FiMoreHorizontal, FiExternalLink } from 'react-icons/fi'
import TimeAgo from 'react-timeago'
import {
  Chain,
  fetchCollectionAssetsForUser,
  fetchCollectionSlug,
  fetchIsRanked,
  fetchMetadata,
  fetchMetadataUriWithOpenSeaFallback,
  fetchOpenSeaGraphQL,
  fetchRarities,
  fetchRemoteConfig,
  triggerOpenSeaMetadataRefresh,
} from '../../utils/api'
import Toast from '../Toast'
import EthereumIcon from '../EthereumIcon'
import Logo from '../Logo'
import LooksRareSvg from '../../assets/looksrare.svg'
import GemSvg from '../../assets/gemxyz.svg'
import EtherScanSvg from '../../assets/etherscan.svg'
import PolygonScanSvg from '../../assets/polygonscan.svg'
import { CgNotes } from 'react-icons/cg'
import { useUser } from '../../utils/user'
import ScopedCSSPortal from '../ScopedCSSPortal'
import RefreshIndicator, { RefreshState } from './RefreshIndicator'
import { EventEmitterContext, GlobalConfigContext } from '../AppProvider'
import { RateLimit } from 'async-sema'
import BuyNowButton from './BuyNowButton'
import LockedFeature from '../LockedFeature'
import { selectElement } from '../../utils/selector'
import {
  determineRarityType,
  getActiveRarity,
  RarityTier,
  RARITY_TYPES,
  useTraitCountExcluded,
} from '../../utils/rarity'
import useFloor from '../../hooks/useFloor'
import PropertiesModal from './PropertiesModal'
import InternalLink from '../InternalLink'
import TooltipIconButton from '../TooltipIconButton'

export const HEIGHT = 85
export const LIST_HEIGHT = 62
export const LIST_WIDTH = 140
const MEMBERSHIP_ADDRESS = '0x24e047001f0ac15f72689d3f5cd0b0f52b1abdf9'
const PARTIALLY_RANKED_RATIO_THRESHOLD = 0.9

const replaceImageRateLimit = RateLimit(3)

type Rarity = {
  isRanked: boolean
  tokenCount: number
  totalSupply: number | null
  rankWarning: string | null
  rank: number
  type: RarityTier
  noTraitCountRank: number
  noTraitCountType: RarityTier
}

const RarityBadge = ({
  type,
  rarity,
  traitCountExcluded,
  isSubscriber,
  isMembershipNFT,
  onOpenProperties,
}: {
  type: React.ComponentProps<typeof AssetInfo>['type']
  rarity: Rarity | null
  traitCountExcluded: boolean
  isSubscriber: boolean
  isMembershipNFT: boolean
  onOpenProperties: () => void
}) => {
  const rankTierDisparity = rarity
    ? Math.abs(rarity.type.tier - rarity.noTraitCountType.tier)
    : 0
  const hoverBg = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const { colorMode } = useColorMode()

  const tooltipColor = useColorModeValue('black', 'white')
  const tooltipBg = useColorModeValue('gray.50', 'gray.700')
  const warningTextBg = useColorModeValue('orange.200', 'orange.600')
  const warningTextColor = useColorModeValue('black', 'white')

  const ratioRanked =
    (rarity?.tokenCount || 1) / (rarity?.totalSupply || rarity?.tokenCount || 1)

  const isPartiallyRanked = ratioRanked < PARTIALLY_RANKED_RATIO_THRESHOLD

  if (isSubscriber || isMembershipNFT) {
    const tooltipLabel = (() => {
      if (isMembershipNFT) {
        return <Text my="0">You're all legendary to us &lt;3</Text>
      }
      if (rarity) {
        const withTraitCount = (
          <Box>
            <Text opacity="0.65" mt="0" mb="1">
              Rank with Trait Count Score
            </Text>{' '}
            <Text my="0" fontWeight="semibold">
              #{rarity.rank}{' '}
              <Tag bg={rarity.type.color[colorMode]} size="sm" mx="1">
                {rarity.type.name}
              </Tag>
              {rarity.type.top !== Infinity
                ? ` (top ${rarity.type.top * 100}%)`
                : ' (bottom 50%)'}
            </Text>
          </Box>
        )
        const withoutTraitCount = (
          <Box>
            <Text opacity="0.65" mt="0" mb="1">
              Rank without Trait Count Score
            </Text>{' '}
            <Text mb="2" my="0">
              #{rarity.noTraitCountRank}
              <Tag
                bg={rarity.noTraitCountType.color[colorMode]}
                size="sm"
                mx="2"
              >
                {rarity.noTraitCountType.name}
              </Tag>
              {rarity.noTraitCountType.top !== Infinity
                ? ` (top ${rarity.noTraitCountType.top * 100}%)`
                : ' (bottom 50%)'}
            </Text>
          </Box>
        )
        return (
          <Box lineHeight="1.6em">
            <VStack spacing="2" alignItems="flex-start">
              {traitCountExcluded ? withoutTraitCount : withTraitCount}
              {traitCountExcluded ? withTraitCount : withoutTraitCount}
            </VStack>
            {(() => {
              let text = ''
              if (rarity?.rankWarning) {
                text = rarity.rankWarning
              } else if (isPartiallyRanked) {
                text = `Only ${Math.floor(
                  ratioRanked * 100,
                )}% of the collection has been ranked so far, final ranks will change.`
              } else if (rankTierDisparity > 0) {
                text =
                  "There's a rarity tier difference with trait count score enabled/disabled. Click for more details."
              }
              return text ? (
                <Text
                  bg={warningTextBg}
                  color={warningTextColor}
                  fontSize="xs"
                  py="1"
                  px="2"
                  mb="0"
                  borderRadius="sm"
                >
                  {text}
                </Text>
              ) : null
            })()}
          </Box>
        )
      }

      return ''
    })()

    const activeRarity = getActiveRarity(rarity, traitCountExcluded)

    return (
      <HStack spacing="1">
        <Tooltip
          isDisabled={!(activeRarity || isMembershipNFT)}
          label={tooltipLabel}
          size="lg"
          hasArrow
          maxW="260px"
          borderRadius="md"
          placement="top"
          bg={tooltipBg}
          color={tooltipColor}
          px={3}
          py={3}
        >
          <Text
            fontWeight="500"
            cursor={activeRarity ? 'pointer' : undefined}
            onClick={activeRarity === null ? undefined : onOpenProperties}
            borderRadius="md"
            px="1"
            mx="-1"
            transition="background-color 150ms ease"
            _hover={{
              bg: activeRarity === null ? undefined : hoverBg,
            }}
          >
            {activeRarity === null ? (
              'Unranked'
            ) : (
              <Text as="span">
                {rarity?.rankWarning ||
                rankTierDisparity ||
                isPartiallyRanked ? (
                  <WarningTwoIcon
                    opacity="0.75"
                    width={type === 'list' ? '12px' : '16px'}
                    height={type === 'list' ? '12px' : '16px'}
                    position="relative"
                    mr="1"
                    top="-1px"
                  />
                ) : null}
                #{activeRarity.rank}
                <Text as="span" fontSize="xs" opacity="0.75">
                  {' '}
                  / {activeRarity.tokenCount}
                </Text>
              </Text>
            )}
          </Text>
        </Tooltip>
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
  displayedPrice,
  quickBuyGasOverride,
  isActivityEvent = false,
}: {
  address: string
  tokenId: string
  collectionSlug?: string
  type: 'grid' | 'list' | 'item' | 'sell'
  chain: Chain
  container: HTMLElement
  displayedPrice?: string
  quickBuyGasOverride?: null | { fee: number; priorityFee: number }
  isActivityEvent?: boolean
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
  const [traitCountExcluded] = useTraitCountExcluded(address)
  const [hidingItems, setHidingItems] = useState(false)

  const menuBorder = useColorModeValue('gray.200', 'gray.800')
  const menuColor = useColorModeValue('black', 'white')

  const toast = useToast()
  const isMembershipNFT = MEMBERSHIP_ADDRESS === address
  const isAccountPage = window.location.pathname.split('/')[1] === 'account'
  const isHiddenTab =
    queryString.parse(window.location.search).tab === 'private'

  const quickBuyAvailable = (() => {
    if (isAccountPage && !isActivityEvent) return false
    if (type === 'sell') return false
    return true
  })()

  const activeRarity = rarity && {
    isRanked: rarity.isRanked,
    tokenCount: rarity.tokenCount,
    rank: traitCountExcluded ? rarity.noTraitCountRank : rarity.rank,
    type: traitCountExcluded ? rarity.noTraitCountType : rarity.type,
  }

  const { floor, loading: floorLoading, loadedAt: floorLoadedAt } = useFloor(
    collectionSlug,
    chain,
  )

  const replaceImage = useCallback(async () => {
    await replaceImageRateLimit()
    const { injectionSelectors: selectors } = await fetchRemoteConfig()
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
      if (chain === 'polygon') {
        setRarity(null)
        return
      }
      if (isSubscriber) {
        const rarities = await fetchRarities(address)
        if (rarities) {
          const { tokenCount, tokens, totalSupply, rankWarning } = rarities
          const token = tokens.find(
            ({ iteratorID }) => String(iteratorID) === tokenId,
          )
          if (token) {
            const { rank, noTraitCountRank } = token
            if (rank !== null) {
              setRarity({
                isRanked: true,
                tokenCount,
                totalSupply,
                rankWarning,
                rank,
                type: determineRarityType(rank, tokenCount),
                noTraitCountRank: noTraitCountRank,
                noTraitCountType: determineRarityType(
                  noTraitCountRank,
                  tokenCount,
                ),
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
            totalSupply: null,
            rankWarning: null,
            rank: 1,
            type: RARITY_TYPES[0],
            noTraitCountRank: 1,
            noTraitCountType: RARITY_TYPES[0],
          })
        } else {
          setRarity({
            isRanked: Boolean(isRanked),
            tokenCount: 0,
            totalSupply: null,
            rankWarning: null,
            rank: 0,
            type: RARITY_TYPES[RARITY_TYPES.length - 1],
            noTraitCountRank: 0,
            noTraitCountType: RARITY_TYPES[RARITY_TYPES.length - 1],
          })
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, tokenId])

  return (
    <Box
      pr={type === 'list' ? 3 : 0}
      width={type === 'list' ? '190px' : undefined}
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
          activeRarity && (isSubscriber || isMembershipNFT)
            ? activeRarity.type.color.light
            : 'gray.50',
          activeRarity && (isSubscriber || isMembershipNFT)
            ? activeRarity.type.color.dark
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
          {({ onClose }) => (
            <>
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
                  borderColor={menuBorder}
                  zIndex="popover"
                  color={menuColor}
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
                          Object.keys(globalConfig.refreshQueued).forEach(
                            (key) => {
                              const [_address] = key.split('/')
                              if (address === _address) {
                                globalConfig.refreshQueued[key] = false
                              }
                            },
                          )
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
                          Object.keys(globalConfig.imageReplaced).forEach(
                            (key) => {
                              const [_address] = key.split('/')
                              if (address === _address) {
                                globalConfig.imageReplaced[key] = false
                              }
                            },
                          )
                        }

                        events.emit('toggleAutoReplaceImage', {
                          value:
                            globalConfig.autoImageReplaceAddresses[address],
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
                  </MenuGroup>
                  <MenuDivider />
                  {isAccountPage && (
                    <>
                      <MenuGroup
                        // @ts-ignore
                        title={
                          <Text>
                            Account{' '}
                            {chain !== 'ethereum' ? (
                              <Tag fontSize="xs" mt="-1px" ml="0.35em">
                                Unavailable
                              </Tag>
                            ) : null}
                          </Text>
                        }
                      >
                        <MenuItem
                          closeOnSelect={false}
                          isDisabled={!isSubscriber || chain !== 'ethereum'}
                          onClick={async () => {
                            if (hidingItems || !isSubscriber) return
                            setHidingItems(true)
                            const walletAddress: string = await new Promise(
                              (resolve) => {
                                const messageListener = (
                                  event: MessageEvent,
                                ) => {
                                  if (
                                    event.data.method ===
                                    'SuperSea__GetEthAddress__Success'
                                  ) {
                                    window.removeEventListener(
                                      'message',
                                      messageListener,
                                    )
                                    resolve(event.data.params.ethAddress)
                                  }
                                }
                                window.addEventListener(
                                  'message',
                                  messageListener,
                                )
                                window.postMessage({
                                  method: 'SuperSea__GetEthAddress',
                                })
                              },
                            )
                            const cookies = new URLSearchParams(
                              document.cookie.replaceAll('; ', '&'),
                            )
                            const sessionKey = JSON.parse(
                              cookies.get(`session_${walletAddress}`) || 'null',
                            )
                            if (!sessionKey) {
                              setHidingItems(false)
                              onClose()
                              toast({
                                duration: 15000,
                                position: 'bottom-right',
                                render: () => (
                                  <Toast
                                    text="OpenSea session expired, please navigate to the profile settings page and sign the message with your wallet to re-authenticate."
                                    type="error"
                                  />
                                ),
                              })
                              return
                            }
                            const assets = await fetchCollectionAssetsForUser({
                              walletAddress,
                              contractAddress: address,
                            })
                            const result = await fetchOpenSeaGraphQL(
                              'AssetSelectionSetPrivacyMutation',
                              {
                                variables: {
                                  assets: assets.map((asset) => {
                                    return window.btoa(`AssetType:${asset.id}`)
                                  }),
                                  isPrivate: !isHiddenTab,
                                },
                                sessionKey,
                                cacheBust: false,
                              },
                            )
                            const remoteConfig = await fetchRemoteConfig()

                            let success = false
                            try {
                              success = _.get(
                                result,
                                remoteConfig.queries[
                                  'AssetSelectionSetPrivacyMutation'
                                ].resultPaths.success,
                              )
                            } catch (e) {
                              console.error(e)
                            }
                            if (success) {
                              toast({
                                duration: 15000,
                                position: 'bottom-right',
                                render: () => (
                                  <Toast
                                    text={`Successfully ${
                                      isHiddenTab ? 'unhid' : 'hid'
                                    } ${assets.length} item${
                                      assets.length === 1 ? '' : 's'
                                    } from your profile. You may need to refresh the tab for the OpenSea UI to fully reflect the changes.`}
                                    type="success"
                                  />
                                ),
                              })
                              window.postMessage({
                                method: 'SuperSea__RefreshPage',
                              })
                            } else {
                              toast({
                                duration: 5000,
                                position: 'bottom-right',
                                render: () => (
                                  <Toast
                                    text={`Failed to ${
                                      isHiddenTab ? 'unhide' : 'hide'
                                    } items, please try again.`}
                                    type="error"
                                  />
                                ),
                              })
                            }

                            setHidingItems(false)
                            onClose()
                          }}
                        >
                          <Text maxWidth="210px">
                            {isHiddenTab ? 'Unhide' : 'Hide'} entire collection
                            from profile{' '}
                            {!isSubscriber && <LockedFeature ml="1" />}
                            {hidingItems ? (
                              <Spinner
                                ml={2}
                                width={3}
                                height={3}
                                opacity={0.75}
                              />
                            ) : null}
                          </Text>
                        </MenuItem>
                      </MenuGroup>
                      <MenuDivider />
                    </>
                  )}
                  <MenuGroup title="Links">
                    <HStack spacing="0" px="1">
                      {chain === 'ethereum' && (
                        <TooltipIconButton
                          label="LooksRare"
                          icon={<Icon as={LooksRareSvg as any} />}
                          bg="transparent"
                          onClick={async () => {
                            onClose()
                            window.open(
                              `https://looksrare.org/collections/${address}/${tokenId}`,
                              '_blank',
                            )
                          }}
                        />
                      )}{' '}
                      {chain === 'ethereum' && (
                        <TooltipIconButton
                          label="gem.xyz"
                          icon={<Icon as={GemSvg as any} />}
                          bg="transparent"
                          onClick={async () => {
                            onClose()
                            window.open(
                              `https://gem.xyz/collection/${collectionSlug}`,
                              '_blank',
                            )
                          }}
                        />
                      )}{' '}
                      <TooltipIconButton
                        label="Contract"
                        icon={
                          <Icon
                            as={
                              (chain === 'ethereum'
                                ? EtherScanSvg
                                : PolygonScanSvg) as any
                            }
                          />
                        }
                        bg="transparent"
                        onClick={async () => {
                          onClose()
                          window.open(
                            `https://${
                              chain === 'ethereum'
                                ? 'etherscan.io'
                                : 'polygonscan.com'
                            }/token/${address}`,
                            '_blank',
                          )
                        }}
                      />
                      {chain === 'ethereum' && (
                        <TooltipIconButton
                          label="Raw Metadata"
                          icon={<Icon as={CgNotes} />}
                          bg="transparent"
                          onClick={async () => {
                            onClose()
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
                                  <Toast
                                    text="Unable to load metadata."
                                    type="error"
                                  />
                                ),
                              })
                              return
                            }
                            if (/^data:/.test(metadataUri)) {
                              const blob = await fetch(
                                metadataUri,
                              ).then((res) => res.blob())
                              window.open(URL.createObjectURL(blob), '_blank')
                            } else {
                              window.open(metadataUri, '_blank')
                            }
                          }}
                        />
                      )}{' '}
                    </HStack>
                  </MenuGroup>
                </MenuList>
              </ScopedCSSPortal>
            </>
          )}
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
                type={type}
                isSubscriber={isSubscriber}
                rarity={rarity}
                traitCountExcluded={Boolean(traitCountExcluded)}
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
                  <InternalLink
                    route="collectionFloor"
                    params={{ collectionSlug: collectionSlug! }}
                    fontWeight="500"
                    verticalAlign="middle"
                  >
                    {floor === null
                      ? 'Unavailable'
                      : `${floor.price} ${
                          floor.currency !== 'ETH' ? ` ${floor.currency}` : ''
                        }`}
                  </InternalLink>
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
        {quickBuyAvailable && (
          <Box
            position="absolute"
            top="0"
            right="0"
            m="1"
            className="SuperSea__BuyNowContainer"
            opacity="0"
            transition="opacity 115ms ease"
          >
            <BuyNowButton
              address={address}
              tokenId={tokenId}
              displayedPrice={displayedPrice}
              gasOverride={quickBuyGasOverride}
            />
          </Box>
        )}
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
