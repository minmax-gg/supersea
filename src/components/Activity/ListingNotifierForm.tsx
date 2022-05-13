import {
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Stack,
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
  Tooltip,
  Icon,
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
import { FiHelpCircle } from 'react-icons/fi'

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
  nameContains: {
    value: string
    isRegExp: boolean
  }
  autoQuickBuy: boolean
  collection: Collection
  gasOverride: { priorityFee: number; fee: number } | null
  tokenEligibilityMap: Record<string, boolean> | null
}

const ListingNotifierForm = ({
  isSubscriber,
  collections,
  editingNotifier,
  onAddNotifier,
  onCancel,
}: {
  isSubscriber: boolean
  collections: Collection[]
  editingNotifier: Notifier | null
  onCancel: () => void
  onAddNotifier: (notifier: Notifier) => void
}) => {
  const [extensionConfig] = useExtensionConfig()
  const [minPrice, setMinPrice] = useState(
    String(editingNotifier?.minPrice || ''),
  )
  const [maxPrice, setMaxPrice] = useState(
    String(editingNotifier?.maxPrice || ''),
  )
  const [includeAuctions, setIncludeAuctions] = useState(
    editingNotifier?.includeAuctions || false,
  )
  const [lowestRarity, setLowestRarity] = useState<RarityName>(
    editingNotifier?.lowestRarity || 'Common',
  )
  const [nameContainsValue, setNameContainsValue] = useState(
    editingNotifier?.nameContains.value || '',
  )
  const [nameContainsIsRegExp, setNameContainsIsRegExp] = useState(
    editingNotifier?.nameContains.isRegExp || false,
  )
  const [collectionSlug, setCollectionSlug] = useState(
    editingNotifier?.collection.slug || collections[0].slug,
  )
  const [lowestRankNumber, setLowestRankNumber] = useState(
    String(editingNotifier?.lowestRankNumber || ''),
  )

  const [gasOverrideEnabled, setGasOverrideEnabled] = useState(
    editingNotifier?.gasOverride ? true : false,
  )
  const [gasFee, setGasFee] = useState(
    String(editingNotifier?.gasOverride?.fee || '300'),
  )
  const [gasPriorityFee, setGasPriorityFee] = useState(
    String(editingNotifier?.gasOverride?.priorityFee || '25'),
  )

  const [traits, setTraits] = useState<string[]>(editingNotifier?.traits || [])
  const [autoQuickBuy, setAutoQuickBuy] = useState(
    editingNotifier?.autoQuickBuy || false,
  )
  const [creatingNotifier, setCreatingNotifier] = useState(false)
  const [rarityTab, setRarityTab] = useState<number>(
    editingNotifier?.lowestRankNumber ? 1 : 0,
  )

  const chosenCollection = collections.find(
    ({ slug }) => slug === collectionSlug,
  )

  const isRanked = chosenCollection?.rarities.isRanked
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
              fontSize="sm"
            >
              Include auctions
            </Checkbox>
          </Flex>
        </HStack>
        <Stack direction={{ base: 'column', lg: 'row' }} spacing="4">
          <FormControl isDisabled={!isSubscriber}>
            <FormLabel fontSize="sm" htmlFor="auto-quick-buy" mb="2">
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
            <FormHelperText maxWidth="300px" lineHeight="1.6em" pr="5" pt="1">
              Automatically trigger Quick Buy when a listing that matches this
              alert is found.
            </FormHelperText>
          </FormControl>
          <FormControl isDisabled={!extensionConfig?.quickBuyEnabled}>
            <FormLabel
              fontSize="sm"
              mb="2"
              isDisabled={!extensionConfig?.quickBuyEnabled}
            >
              Gas Override
              {!isSubscriber ? <LockedFeature ml="0.5em" /> : null}
            </FormLabel>
            <Switch
              id="auto-quick-buy"
              isChecked={gasOverrideEnabled}
              isDisabled={!extensionConfig?.quickBuyEnabled}
              onChange={(event) => {
                setGasOverrideEnabled(event.target.checked && isSubscriber)
              }}
            />
            <HStack spacing="2" mt="3" alignItems="flex-start">
              <FormControl maxWidth="120px" isDisabled={!gasOverrideEnabled}>
                <FormLabel fontSize="xs">Max Fee</FormLabel>
                <Input
                  size="sm"
                  value={gasFee}
                  onChange={(e) => {
                    setGasFee(e.target.value)
                  }}
                  borderColor={inputBorder}
                />
              </FormControl>
              <FormControl maxWidth="120px" isDisabled={!gasOverrideEnabled}>
                <FormLabel fontSize="xs">Max Priority Fee</FormLabel>
                <Input
                  size="sm"
                  value={gasPriorityFee}
                  onChange={(e) => {
                    setGasPriorityFee(e.target.value)
                  }}
                  borderColor={inputBorder}
                />
              </FormControl>{' '}
            </HStack>
          </FormControl>
        </Stack>
        <FormControl>
          <FormLabel fontSize="sm">Name Contains</FormLabel>
          <HStack>
            <Input
              borderColor={inputBorder}
              maxW="240px"
              value={nameContainsValue}
              onChange={(e) => setNameContainsValue(e.target.value)}
            />
            <Flex height="40px" alignItems="center" pl="2">
              <Checkbox
                isChecked={nameContainsIsRegExp}
                onChange={(e) => setNameContainsIsRegExp(e.target.checked)}
                borderColor={useColorModeValue(
                  'blackAlpha.500',
                  'whiteAlpha.500',
                )}
                size="sm"
              >
                Use Regular Expression{' '}
                <Tooltip
                  label={
                    <>
                      <Text>
                        A regular expression is a sequence of characters that
                        specifies a search pattern in text. This allows you to
                        do more complex filtering than just a simple string
                        match.
                      </Text>
                      <Text mt="2">
                        If you don't know how to use regular expressions but
                        still want to do an advanced name search, feel free to
                        ping one of the devs in the SuperSea Discord for help.
                      </Text>
                    </>
                  }
                  fontSize="sm"
                  hasArrow
                  bg="gray.700"
                  placement="top"
                  color="white"
                  px="3"
                  py="3"
                  mr="2"
                  borderRadius="sm"
                >
                  <Flex
                    height="100%"
                    alignItems="center"
                    px="2px"
                    top="2px"
                    position="relative"
                    display="inline-flex"
                  >
                    <Icon as={FiHelpCircle} />
                  </Flex>
                </Tooltip>
              </Checkbox>
            </Flex>
          </HStack>
          <FormHelperText>
            Filter items by name (case insensitive).
          </FormHelperText>
        </FormControl>

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
            traits={chosenCollection?.rarities.traits || []}
            value={traits}
            onChange={(traits) => {
              setTraits(traits)
            }}
          />
        </FormControl>

        <HStack justify="flex-end" width="100%" spacing="2">
          <Button onClick={onCancel}>Cancel</Button>
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
                id: editingNotifier?.id || generateId(),
                minPrice: minPrice ? Number(minPrice) : null,
                maxPrice: maxPrice ? Number(maxPrice) : null,
                lowestRarity:
                  rarityTab === 0 && isRanked ? lowestRarity : 'Common',
                lowestRankNumber:
                  rarityTab === 1 && Number(lowestRankNumber) && isRanked
                    ? Number(lowestRankNumber)
                    : null,
                includeAuctions,
                traits,
                tokenEligibilityMap,
                collection,
                nameContains: {
                  value: nameContainsValue,
                  isRegExp: nameContainsIsRegExp,
                },
                autoQuickBuy,
                gasOverride: gasOverrideEnabled
                  ? { priorityFee: +gasPriorityFee, fee: +gasFee }
                  : null,
              })
            }}
            color="white"
            bg="blue.500"
            _hover={{ bg: 'blue.400' }}
            _active={{ bg: 'blue.300' }}
          >
            {editingNotifier ? 'Edit Listing Alert' : 'Add Listing Alert'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default ListingNotifierForm
