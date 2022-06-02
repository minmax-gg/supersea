import { useState, useEffect, useCallback } from 'react'
import _, { filter } from 'lodash'
import {
  Spinner,
  Box,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  Select,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Flex,
  Tag,
  FormHelperText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import ButtonOptions from '../ButtonOptions'
import EthereumIcon from '../EthereumIcon'
import { motion } from 'framer-motion'
import { Trait } from '../../utils/api'
import TraitSelect from './TraitSelect'
import {
  RarityName,
  RARITY_TYPES,
  useTraitCountExcluded,
} from '../../utils/rarity'
import MassBidInput from './MassBidInput'
import { TraitCountToggle } from '../TraitCountToggle'
import parseNumberRange from '../../utils/parseNumberRange'

export type FiltersType = {
  status: 'buyNow'[]
  priceRange: [number | undefined, number | undefined]
  includedRanks: Record<number, boolean> | null
  includedIds: Record<string | number, boolean> | null
  rarityOrder: 'asc' | 'desc'
  traits: string[]
}

const Filters = ({
  address,
  tokenCount,
  filters,
  allTraits,
  onApplyFilters,
  showSearchProgress,
  searchNumber,
  onStartMassBid,
  isUnranked,
}: {
  address: string | null
  tokenCount: number
  filters: FiltersType
  allTraits: Trait[]
  onApplyFilters: (filters: FiltersType) => void
  showSearchProgress: boolean
  searchNumber: number
  onStartMassBid: React.ComponentProps<typeof MassBidInput>['onConfirm']
  isUnranked: boolean
}) => {
  const minPriceProp = filters.priceRange[0]
  const maxPriceProp = filters.priceRange[1]

  const [minPrice, setMinPrice] = useState<string>(
    minPriceProp !== undefined ? String(minPriceProp) : '',
  )
  const [maxPrice, setMaxPrice] = useState<string>(
    maxPriceProp !== undefined ? String(maxPriceProp) : '',
  )

  const [highestRarityTier, setHighestRarityTier] = useState<RarityName>(
    'Legendary',
  )
  const [lowestRarityTier, setLowestRarityTier] = useState<RarityName>('Common')

  const [rankRangeInput, setRankRangeInput] = useState('')
  const [idRangeInput, setIdRangeInput] = useState('')

  const [
    storedExcludeTraitCount,
    setStoredExcludeTraitCount,
  ] = useTraitCountExcluded(address)
  const [excludeTraitCount, setExcludeTraitCount] = useState(
    storedExcludeTraitCount || false,
  )

  const [searchProgressVisible, setSearchProgressVisible] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedHideSearchProgress = useCallback(
    _.debounce(() => {
      setSearchProgressVisible(false)
    }, 5000),
    [],
  )

  useEffect(() => {
    if (showSearchProgress) {
      setSearchProgressVisible(true)
    }
    debouncedHideSearchProgress()
  }, [showSearchProgress, searchNumber, debouncedHideSearchProgress])

  useEffect(() => {
    setMinPrice(minPriceProp !== undefined ? String(minPriceProp) : '')
  }, [minPriceProp])

  useEffect(() => {
    setMaxPrice(maxPriceProp !== undefined ? String(maxPriceProp) : '')
  }, [maxPriceProp])

  useEffect(() => {
    setExcludeTraitCount(storedExcludeTraitCount || false)
  }, [storedExcludeTraitCount])

  const onChangeRarityTiers = ({
    highestRarityTier,
    lowestRarityTier,
  }: {
    highestRarityTier: RarityName
    lowestRarityTier: RarityName
  }) => {
    const highestRarityIndex = RARITY_TYPES.findIndex(
      ({ name }) => name === highestRarityTier,
    )
    const lowestRarityIndex = RARITY_TYPES.findIndex(
      ({ name }) => name === lowestRarityTier,
    )

    const minRank =
      highestRarityIndex === 0
        ? 0
        : Math.floor(tokenCount * RARITY_TYPES[highestRarityIndex - 1].top)
    const maxRank =
      lowestRarityIndex === RARITY_TYPES.length - 1
        ? tokenCount
        : Math.floor(tokenCount * RARITY_TYPES[lowestRarityIndex].top)

    const includedRanks = _.range(minRank + 1, maxRank + 1).reduce<
      Record<number, boolean>
    >((acc, rank) => {
      acc[rank] = true
      return acc
    }, {})

    onApplyFilters({
      ...filters,
      includedRanks: _.isEmpty(includedRanks) ? null : includedRanks,
    })
  }

  return (
    <VStack
      spacing="4"
      width="340px"
      flex="0 0 340px"
      position="sticky"
      top="72px"
      borderBottomRightRadius="lg"
      borderTopRightRadius="lg"
      pt="4"
      height="calc(100vh - 72px)"
      overflow="auto"
      pb="100px"
      alignItems="flex-start"
      color={useColorModeValue('black', 'white')}
    >
      <VStack
        p="4"
        width="100%"
        spacing="8"
        alignItems="flex-start"
        position="relative"
        background={useColorModeValue('#fbfdff', '#262b2f')}
        borderColor={useColorModeValue('#e5e8eb', '#151b22')}
        borderWidth="1px"
        borderRadius="lg"
      >
        <VStack
          spacing="3"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          alignItems="flex-start"
          width="100%"
        >
          <Text fontWeight="500">Status</Text>
          <ButtonOptions
            width="100%"
            columns="2"
            options={[{ name: 'buyNow' as const, label: 'Buy Now' }]}
            active={filters.status}
            onChange={(status) => onApplyFilters({ ...filters, status })}
          />
        </VStack>
        <VStack
          spacing="3"
          alignItems="flex-start"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          width="100%"
        >
          <Text fontWeight="500">Price</Text>
          <VStack spacing="3" alignItems="flex-start">
            <HStack spacing="3" alignItems="flex-end">
              <FormControl maxWidth="100px">
                <FormLabel fontSize="sm">
                  <EthereumIcon /> Min
                </FormLabel>
                <Input
                  borderColor={useColorModeValue(
                    'blackAlpha.300',
                    'whiteAlpha.300',
                  )}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </FormControl>
              <FormControl maxWidth="100px">
                <FormLabel fontSize="sm">
                  <EthereumIcon /> Max
                </FormLabel>
                <Input
                  borderColor={useColorModeValue(
                    'blackAlpha.300',
                    'whiteAlpha.300',
                  )}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </FormControl>
              <Button
                onClick={() => {
                  onApplyFilters({
                    ...filters,
                    priceRange: [
                      minPrice ? +minPrice : undefined,
                      maxPrice ? +maxPrice : undefined,
                    ],
                  })
                }}
              >
                Apply
              </Button>
            </HStack>
          </VStack>
        </VStack>
        <VStack
          spacing="3"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          alignItems="flex-start"
          width="100%"
        >
          <Text fontWeight="500">Token ID</Text>
          <FormControl>
            <FormLabel fontSize="sm">Range</FormLabel>
            <HStack spacing="3">
              <Input
                borderColor={useColorModeValue(
                  'blackAlpha.300',
                  'whiteAlpha.300',
                )}
                value={idRangeInput}
                onChange={(e) => setIdRangeInput(e.target.value)}
                placeholder="1-10, 23, 42-100"
              />
              <Button
                onClick={() => {
                  const idRange = parseNumberRange(idRangeInput)
                  const includedIds = idRange.reduce<Record<string, boolean>>(
                    (acc, id) => {
                      acc[id] = true
                      return acc
                    },
                    {},
                  )

                  onApplyFilters({
                    ...filters,
                    includedIds: _.isEmpty(includedIds) ? null : includedIds,
                  })
                }}
              >
                Apply
              </Button>
            </HStack>
            <FormHelperText fontSize="sm" maxWidth="220px">
              Use comma for multiple numbers, and dash for ranges
            </FormHelperText>
          </FormControl>
        </VStack>
        <motion.div
          style={{
            display: showSearchProgress ? 'block' : 'none',
            position: 'absolute',
            marginTop: 0,
            top: 0,
            right: 0,
          }}
          animate={{
            y: searchProgressVisible ? 0 : -10,
            opacity: searchProgressVisible ? 1 : 0,
          }}
          transition={{
            y: {
              type: 'spring',
              stiffness: 400,
              damping: 15,
            },
            default: { duration: 0.1 },
          }}
          initial={false}
        >
          <Box
            bg={useColorModeValue('blackAlpha.200', 'whiteAlpha.200')}
            m="2"
            px="2"
            py="1"
            borderRadius="md"
          >
            <Text fontSize="sm">
              <Spinner
                color={useColorModeValue('blackAlpha.500', 'whiteAlpha.500')}
                width="12px"
                height="12px"
                mr="2px"
                verticalAlign="middle"
                position="relative"
                top="-1px"
              />{' '}
              Searching top {searchNumber}
            </Text>
          </Box>
        </motion.div>
      </VStack>
      <VStack
        width="100%"
        p="4"
        spacing="8"
        alignItems="flex-start"
        background={useColorModeValue('#fbfdff', '#262b2f')}
        borderColor={useColorModeValue('#e5e8eb', '#151b22')}
        borderWidth="1px"
        borderRadius="lg"
        opacity={isUnranked ? 0.75 : 1}
      >
        <VStack
          spacing="3"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          alignItems="flex-start"
          width="100%"
        >
          <Text fontWeight="500">
            Rarity{' '}
            {isUnranked ? (
              <Tag verticalAlign="middle" ml="0.5em" size="sm">
                Unavailable
              </Tag>
            ) : null}
          </Text>
          <Tabs variant="soft-rounded" size="sm">
            <TabList pt="1">
              <Tab
                isDisabled={isUnranked}
                _selected={{
                  bg: useColorModeValue('gray.100', 'whiteAlpha.200'),
                  color: useColorModeValue('black', 'white'),
                }}
              >
                Rarity Tier
              </Tab>
              <Tab
                isDisabled={isUnranked}
                _selected={{
                  bg: useColorModeValue('gray.100', 'whiteAlpha.200'),
                  color: useColorModeValue('black', 'white'),
                }}
              >
                Rank Number
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel px="1" pb="0">
                <HStack>
                  <FormControl>
                    <FormLabel fontSize="sm">Highest</FormLabel>
                    <Select
                      isDisabled={isUnranked}
                      borderColor="transparent"
                      bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
                      value={highestRarityTier}
                      onChange={(e) => {
                        const newValue = e.target.value as RarityName
                        setHighestRarityTier(newValue)
                        onChangeRarityTiers({
                          lowestRarityTier,
                          highestRarityTier: newValue,
                        })
                      }}
                    >
                      {RARITY_TYPES.map(({ name }) => {
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        )
                      })}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Lowest</FormLabel>
                    <Select
                      isDisabled={isUnranked}
                      borderColor="transparent"
                      bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
                      value={lowestRarityTier}
                      onChange={(e) => {
                        const newValue = e.target.value as RarityName
                        setLowestRarityTier(newValue)
                        onChangeRarityTiers({
                          lowestRarityTier: newValue,
                          highestRarityTier,
                        })
                      }}
                    >
                      {RARITY_TYPES.map(({ name }) => {
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        )
                      })}
                    </Select>
                  </FormControl>
                </HStack>
              </TabPanel>
              <TabPanel px="1" pb="0">
                <FormControl>
                  <FormLabel fontSize="sm">Range</FormLabel>
                  <HStack spacing="3">
                    <Input
                      borderColor={useColorModeValue(
                        'blackAlpha.300',
                        'whiteAlpha.300',
                      )}
                      value={rankRangeInput}
                      onChange={(e) => setRankRangeInput(e.target.value)}
                      placeholder="1-10, 23, 42-100"
                    />
                    <Button
                      onClick={() => {
                        const includedRanks = parseNumberRange(
                          rankRangeInput,
                        ).reduce<Record<string, boolean>>((acc, rank) => {
                          acc[rank] = true
                          return acc
                        }, {})
                        onApplyFilters({
                          ...filters,
                          includedRanks: _.isEmpty(includedRanks)
                            ? null
                            : includedRanks,
                        })
                      }}
                    >
                      Apply
                    </Button>
                  </HStack>
                  <FormHelperText fontSize="sm" maxWidth="220px">
                    Use comma for multiple numbers, and dash for ranges
                  </FormHelperText>
                </FormControl>
              </TabPanel>
              <TabPanel></TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
        <VStack
          spacing="3"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          alignItems="flex-start"
          width="100%"
        >
          <Text fontWeight="500">
            Order{' '}
            {isUnranked ? (
              <Tag verticalAlign="middle" ml="0.5em" size="sm">
                Unavailable
              </Tag>
            ) : null}
          </Text>
          <FormControl>
            <Select
              isDisabled={isUnranked}
              borderColor="transparent"
              bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
              value={filters.rarityOrder}
              onChange={(e) => {
                onApplyFilters({
                  ...filters,
                  rarityOrder: e.target.value as FiltersType['rarityOrder'],
                })
              }}
            >
              <option value="desc">Most rare to least rare</option>
              <option value="asc">Least rare to most rare</option>
            </Select>
          </FormControl>
        </VStack>
        <VStack
          spacing="3"
          alignItems="flex-start"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          width="100%"
        >
          <Text fontWeight="500">
            Traits{' '}
            {isUnranked ? (
              <Tag verticalAlign="middle" ml="0.5em" size="sm">
                Unavailable
              </Tag>
            ) : null}
          </Text>
          <TraitSelect
            traits={allTraits}
            onChange={(traits) => {
              onApplyFilters({
                ...filters,
                traits: traits,
              })
            }}
            value={filters.traits}
            isDisabled={isUnranked}
          />
        </VStack>{' '}
        <VStack
          spacing="3"
          alignItems="flex-start"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          width="100%"
        >
          <Text fontWeight="500">
            Scoring{' '}
            {isUnranked ? (
              <Tag verticalAlign="middle" ml="0.5em" size="sm">
                Unavailable
              </Tag>
            ) : null}
          </Text>
          <Box width="100%">
            <TraitCountToggle
              onToggle={setExcludeTraitCount}
              excludeTraitCount={excludeTraitCount}
              fontSize="14px"
              isDisabled={isUnranked}
            />
            <Flex width="100%" mt="3">
              <Button
                color="white"
                isDisabled={excludeTraitCount === storedExcludeTraitCount}
                iconSpacing="3"
                bg="blue.500"
                _hover={{ bg: 'blue.400' }}
                _active={{ bg: 'blue.300' }}
                onClick={() => {
                  setStoredExcludeTraitCount(excludeTraitCount)
                }}
              >
                Apply to Collection
              </Button>
            </Flex>
          </Box>
        </VStack>
      </VStack>
      <VStack
        width="100%"
        p="4"
        spacing="8"
        alignItems="flex-start"
        background={useColorModeValue('#fbfdff', '#262b2f')}
        borderColor={useColorModeValue('#e5e8eb', '#151b22')}
        borderWidth="1px"
        borderRadius="lg"
      >
        <VStack
          spacing="3"
          alignItems="flex-start"
          divider={
            <Divider
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
            />
          }
          width="100%"
        >
          <Text fontWeight="500">Mass Bid</Text>
          <MassBidInput onConfirm={onStartMassBid} />
        </VStack>
      </VStack>
    </VStack>
  )
}

export default Filters
