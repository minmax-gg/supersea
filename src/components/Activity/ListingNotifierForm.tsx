import {
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Select,
  Switch,
  Tab,
  TabList,
  Box,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  useColorModeValue,
  VStack,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useState } from 'react'
import { fetchRaritiesWithTraits } from '../../utils/api'
import { useExtensionConfig } from '../../utils/extensionConfig'
import { RarityName, RARITY_TYPES } from '../../utils/rarity'
import EthereumIcon from '../EthereumIcon'
import LockedFeature from '../LockedFeature'
import TraitSelect from '../SearchResults/TraitSelect'
import { Collection } from './WatchedCollection'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
let notifierNumber = 0

export const generateId = () => {
  const id = `${ALPHABET[notifierNumber % ALPHABET.length]}${
    Math.floor(notifierNumber / ALPHABET.length) || ''
  }`
  notifierNumber++
  return id
}

export const createTokenEligibilityMap = async ({
  traits,
  collection,
}: {
  traits: string[]
  collection: Collection
}) => {
  if (!traits.length) return null
  const { tokens } = await fetchRaritiesWithTraits(
    collection.contractAddress,
    traits.map((val) => {
      const { groupName, value } = JSON.parse(val)
      return { key: groupName, value }
    }),
  )
  return tokens.reduce<Record<string, boolean>>((acc, { iteratorID }) => {
    acc[iteratorID] = true
    return acc
  }, {})
}

export type Notifier = {
  id: string
  minPrice: number | null
  maxPrice: number | null
  lowestRarity: RarityName
  lowestRankNumber: number | null
  includeAuctions: boolean
  traits: string[]
  autoQuickBuy: boolean
  collection: Collection
  tokenEligibilityMap: Record<string, boolean> | null
}

const ListingNotifierForm = ({
  isRanked,
  isSubscriber,
  collections,
  onAddNotifier,
}: {
  isRanked: boolean
  isSubscriber: boolean
  collections: Collection[]
  onAddNotifier: (notifier: Notifier | null) => void
}) => {
  const [extensionConfig] = useExtensionConfig()
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [includeAuctions, setIncludeAuctions] = useState(false)
  const [lowestRarity, setLowestRarity] = useState<RarityName>('Common')
  const [collectionSlug, setCollectionSlug] = useState(collections[0].slug)
  const [lowestRankNumber, setLowestRankNumber] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [autoQuickBuy, setAutoQuickBuy] = useState(false)
  const [creatingNotifier, setCreatingNotifier] = useState(false)
  const [rarityTab, setRarityTab] = useState<number>(0)

  const rarityInputsDisabled = isRanked === false || !isSubscriber
  const inputBorder = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')

  return (
    <Box>
      <Alert status="info" fontSize="sm" borderRadius="md" mb="2">
        <AlertIcon />
        Notify when a listing is posted matching these filters. Leave inputs
        empty to get notified on all listings.
      </Alert>
      <VStack
        spacing="5"
        alignItems="flex-start"
        bg={useColorModeValue('transparent', 'blackAlpha.500')}
        width="100%"
        borderRadius="md"
        border={useColorModeValue('1px solid', 'none')}
        borderColor="blackAlpha.300"
        p="4"
      >
        <FormControl maxWidth="200px">
          <FormLabel fontSize="sm">Collection</FormLabel>
          <Select
            borderColor="transparent"
            bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
          >
            {collections.map(({ name, slug }) => {
              return (
                <option key={slug} value={slug}>
                  {name}
                </option>
              )
            })}
          </Select>
        </FormControl>

        <HStack spacing="3" alignItems="flex-end">
          <FormControl maxWidth="100px">
            <FormLabel fontSize="sm">
              <EthereumIcon /> Min Price
            </FormLabel>
            <Input
              borderColor={inputBorder}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </FormControl>
          <FormControl maxWidth="100px">
            <FormLabel fontSize="sm">
              <EthereumIcon /> Max Price
            </FormLabel>
            <Input
              borderColor={inputBorder}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </FormControl>
          <Flex height="40px" alignItems="center" pl="2">
            <Checkbox
              isChecked={includeAuctions}
              onChange={(e) => setIncludeAuctions(e.target.checked)}
              borderColor={useColorModeValue(
                'blackAlpha.500',
                'whiteAlpha.500',
              )}
            >
              Include auctions
            </Checkbox>
          </Flex>
        </HStack>
        <FormControl>
          <FormLabel fontSize="sm">
            <Text as="span" opacity={rarityInputsDisabled ? 0.75 : 1}>
              Rarity
            </Text>
            {(() => {
              if (isRanked === false) {
                return (
                  <Tag verticalAlign="bottom" ml="0.5em" size="sm">
                    Unavailable
                  </Tag>
                )
              } else if (!isSubscriber) {
                return <LockedFeature ml="0.5em" />
              }
              return null
            })()}
          </FormLabel>
          <Tabs
            variant="soft-rounded"
            size="sm"
            onChange={setRarityTab}
            tabIndex={rarityTab}
          >
            <TabList pt="1">
              <Tab
                isDisabled={rarityInputsDisabled}
                _selected={{
                  bg: useColorModeValue('gray.100', 'whiteAlpha.200'),
                  color: useColorModeValue('black', 'white'),
                }}
              >
                Rarity Tier
              </Tab>
              <Tab
                isDisabled={rarityInputsDisabled}
                _selected={{
                  bg: useColorModeValue('gray.100', 'whiteAlpha.200'),
                  color: useColorModeValue('black', 'white'),
                }}
              >
                Rank Number
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel px="0">
                <Select
                  isDisabled={rarityInputsDisabled}
                  borderColor="transparent"
                  bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
                  value={lowestRarity}
                  onChange={(e) =>
                    setLowestRarity(e.target.value as RarityName)
                  }
                >
                  {RARITY_TYPES.map(({ name }) => {
                    return (
                      <option key={name} value={name}>
                        {name === 'Common'
                          ? 'Ignore rarity'
                          : `${name}${name === 'Legendary' ? '' : ' at least'}`}
                      </option>
                    )
                  })}
                </Select>
              </TabPanel>
              <TabPanel px="0">
                <FormControl>
                  <Input
                    maxW="140px"
                    borderColor={inputBorder}
                    value={lowestRankNumber}
                    onChange={(e) => setLowestRankNumber(e.target.value)}
                    placeholder="Rank #"
                  />
                  <FormHelperText>Highest rank number to match</FormHelperText>
                </FormControl>
              </TabPanel>
              <TabPanel></TabPanel>
            </TabPanels>
          </Tabs>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">
            <Text as="span" opacity={rarityInputsDisabled ? 0.75 : 1}>
              Traits
            </Text>
            {(() => {
              if (isRanked === false) {
                return (
                  <Tag verticalAlign="bottom" ml="0.5em" size="sm">
                    Unavailable
                  </Tag>
                )
              } else if (!isSubscriber) {
                return <LockedFeature ml="0.5em" />
              }
              return null
            })()}
          </FormLabel>
          <TraitSelect
            isDisabled={rarityInputsDisabled}
            traits={
              collections.find(({ slug }) => slug === collectionSlug)?.rarities
                .traits || []
            }
            value={traits}
            onChange={(traits) => {
              setTraits(traits)
            }}
          />
        </FormControl>
        <FormControl isDisabled={!isSubscriber}>
          <FormLabel fontSize="sm" htmlFor="auto-quick-buy" mb="3">
            Trigger Quick Buy
            {!isSubscriber ? <LockedFeature ml="0.5em" /> : null}
          </FormLabel>
          <HStack spacing="2" alignItems="center">
            <Switch
              id="auto-quick-buy"
              isChecked={autoQuickBuy}
              isDisabled={!extensionConfig?.quickBuyEnabled}
              onChange={(event) => {
                setAutoQuickBuy(event.target.checked && isSubscriber)
              }}
            />
            {isSubscriber && !extensionConfig?.quickBuyEnabled ? (
              <Text opacity="0.75" fontSize="sm">
                Quick Buy is disabled.{' '}
                <Button
                  size="sm"
                  variant="link"
                  color="blue.400"
                  onClick={() => {
                    chrome.runtime.sendMessage({
                      method: 'openPopup',
                      params: { action: 'activateQuickBuy' },
                    })
                  }}
                >
                  Enable?
                </Button>
              </Text>
            ) : null}
          </HStack>
          <FormHelperText maxWidth="300px" lineHeight="1.6em">
            Automatically trigger Quick Buy when a listing that matches this
            alert is found.
          </FormHelperText>
        </FormControl>
        <HStack justify="flex-end" width="100%" spacing="2">
          <Button
            onClick={() => {
              onAddNotifier(null)
            }}
          >
            Cancel
          </Button>
          <Button
            isLoading={creatingNotifier}
            onClick={async () => {
              setCreatingNotifier(true)
              const collection = collections.find(
                ({ slug }) => slug === collectionSlug,
              )!

              const tokenEligibilityMap = await createTokenEligibilityMap({
                collection,
                traits,
              })

              onAddNotifier({
                id: generateId(),
                minPrice: minPrice ? Number(minPrice) : null,
                maxPrice: maxPrice ? Number(maxPrice) : null,
                lowestRarity: rarityTab === 0 ? lowestRarity : 'Common',
                lowestRankNumber:
                  rarityTab === 1 && Number(lowestRankNumber)
                    ? Number(lowestRankNumber)
                    : null,
                includeAuctions,
                traits,
                tokenEligibilityMap,
                collection,
                autoQuickBuy,
              })
            }}
            color="white"
            bg="blue.500"
            _hover={{ bg: 'blue.400' }}
            _active={{ bg: 'blue.300' }}
          >
            Add Listing Alert
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default ListingNotifierForm
