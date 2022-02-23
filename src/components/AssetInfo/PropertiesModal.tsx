import { useEffect, useState } from 'react'
import {
  Text,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Tag,
  Link,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
  useColorMode,
  Button,
  Box,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@chakra-ui/react'
import ScopedCSSPortal from '../ScopedCSSPortal'
import { fetchTokenProperties } from '../../utils/api'
import {
  determineRarityType,
  RarityTier,
  RARITY_TYPES,
  useTraitCountExcluded,
} from '../../utils/rarity'
import { TraitCountToggle } from '../TraitCountToggle'

type Properties = {
  name: string
  value: string | null
  score: number
  rarity: number | null
  excluded: boolean
}[]

const PropertiesModal = ({
  onClose,
  collectionSlug,
  address,
  tokenId,
}: {
  onClose: () => void
  collectionSlug?: string
  address: string
  tokenId: string
}) => {
  const [propertyBreakdown, setPropertyBreakdown] = useState<
    | {
        rarity: {
          rank: number
          score: number
          type: RarityTier
        }
        noTraitCountRarity: {
          rank: number
          score: number
          type: RarityTier
        }
        properties: Properties
      }
    | null
    | undefined
  >(undefined)
  const [
    storedExcludeTraitCount,
    setStoredExcludeTraitCount,
  ] = useTraitCountExcluded(address)
  const [excludeTraitCount, setExcludeTraitCount] = useState(
    storedExcludeTraitCount || false,
  )
  const tableStripeColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const { colorMode } = useColorMode()

  const rankTierDisparity = propertyBreakdown
    ? Math.abs(
        propertyBreakdown.rarity.type.tier -
          propertyBreakdown.noTraitCountRarity.type.tier,
      )
    : 0

  const settingsBoxStyles = useColorModeValue(
    {
      bg: 'transparent',
      border: '1px solid',
    },
    {
      bg: 'blackAlpha.500',
      border: 'none',
    },
  )

  useEffect(() => {
    setExcludeTraitCount(storedExcludeTraitCount || false)
  }, [storedExcludeTraitCount])

  useEffect(() => {
    ;(async () => {
      try {
        const {
          token,
          tokenCount,
          rarityTable,
          traits,
        } = await fetchTokenProperties(address, tokenId)

        const missingTraits = Object.keys(rarityTable.missingTraitScores)
          .map((traitType) => {
            if (
              token.attributes.find((attr) => attr.trait_type === traitType)
            ) {
              return null
            }
            return {
              name: traitType,
              value: null,
              score: rarityTable.missingTraitScores[traitType].score,
              rarity: null,
              excluded: false,
            }
          })
          .filter(Boolean)

        setPropertyBreakdown({
          rarity: {
            rank: token.rank,
            score: token.score,
            type: determineRarityType(token.rank, tokenCount),
          },
          noTraitCountRarity: {
            rank: token.noTraitCountRank,
            score: token.noTraitCountScore,
            type: determineRarityType(token.noTraitCountRank, tokenCount),
          },
          properties: (token.attributes.map(({ trait_type, value }) => {
            const trait = traits.find(
              (t) => t.trait_type === trait_type && t.value === value,
            )

            return {
              name: trait_type,
              value,
              score: rarityTable.scoreMap[trait_type][value],
              excluded: rarityTable.implicitExcludes?.includes(trait_type),
              rarity: trait ? trait.count / tokenCount : null,
            }
          }) as Properties)
            .concat(
              missingTraits as Exclude<typeof missingTraits[number], null>[],
            )
            .concat([
              {
                name: 'Trait Count',
                value: String(token.attributes.length),
                score: rarityTable.scoreMap['Trait Count']
                  ? rarityTable.scoreMap['Trait Count'][token.attributes.length]
                  : 0,
                rarity: null,
                excluded: false,
              },
            ]),
        })
      } catch (err) {
        console.error(err)
        setPropertyBreakdown(null)
      }
    })()
  }, [address, tokenId])

  const activeRarityField = excludeTraitCount ? 'noTraitCountRarity' : 'rarity'

  const warningTextBg = useColorModeValue('orange.200', 'orange.600')
  const warningTextColor = useColorModeValue('black', 'white')

  return (
    <ScopedCSSPortal>
      <Modal isOpen={true} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxWidth="container.sm">
          <ModalCloseButton />
          <ModalHeader pb="0">Trait Details</ModalHeader>
          <ModalBody pb="6">
            {(() => {
              if (propertyBreakdown === undefined) {
                return (
                  <Flex
                    py="8"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Spinner />
                  </Flex>
                )
              }
              if (propertyBreakdown === null) {
                return (
                  <Flex
                    width="100%"
                    justifyContent="center"
                    py="16"
                    height="800px"
                  >
                    <Text fontSize="2xl" opacity={0.75}>
                      Properties unavailable
                    </Text>
                  </Flex>
                )
              }
              return (
                <VStack spacing="4" mt="2">
                  <Flex
                    justifyContent="space-between"
                    width="100%"
                    borderRadius="md"
                    p="4"
                    {...settingsBoxStyles}
                    borderColor="blackAlpha.300"
                  >
                    <TraitCountToggle
                      onToggle={setExcludeTraitCount}
                      excludeTraitCount={excludeTraitCount}
                    />
                    <Box>
                      <Button
                        color="white"
                        isDisabled={
                          excludeTraitCount === storedExcludeTraitCount
                        }
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
                    </Box>
                  </Flex>
                  <Table
                    variant="simple"
                    width="100%"
                    size="sm"
                    mt="4"
                    sx={{
                      '& tbody tr:nth-child(2n)': {
                        bg: tableStripeColor,
                      },
                    }}
                  >
                    <Thead>
                      <Tr>
                        <Th>Trait</Th>
                        <Th>Value</Th>
                        <Th textAlign="right">Score</Th>
                      </Tr>
                    </Thead>
                    <Tbody fontWeight="500">
                      {propertyBreakdown.properties.map(
                        (
                          { name, value, rarity, score, excluded: _excluded },
                          index,
                        ) => {
                          const rarityType = rarity
                            ? RARITY_TYPES.find(({ top }) => rarity <= top)
                            : null
                          const excluded =
                            _excluded ||
                            (name === 'Trait Count' && excludeTraitCount)
                          const renderedValue = (
                            <>
                              <Text>
                                {value !== null ? (
                                  value
                                ) : (
                                  <Text opacity="0.75">Missing</Text>
                                )}
                                {rarityType && !excluded ? (
                                  <Tag
                                    bg={rarityType.color[colorMode]}
                                    size="sm"
                                    mx="2"
                                  >
                                    {rarityType.name}
                                  </Tag>
                                ) : null}
                                {excluded ? (
                                  <Tag size="sm" mx="2">
                                    Excluded
                                  </Tag>
                                ) : null}
                              </Text>
                              {rarity !== null ? (
                                <Text fontWeight="400" opacity="0.5">
                                  {Math.round(rarity * 10000) / 100}% share this
                                  trait
                                </Text>
                              ) : null}
                            </>
                          )
                          return (
                            <Tr key={index} opacity={excluded ? 0.7 : 1}>
                              <Td>{name}</Td>
                              <Td lineHeight="1.6em">
                                {collectionSlug &&
                                value !== null &&
                                name !== 'Trait Count' ? (
                                  <Link
                                    href={`https://opensea.io/assets/${collectionSlug}?search[stringTraits][0][name]=${name}&search[stringTraits][0][values][0]=${value}&search[sortAscending]=true&search[sortBy]=PRICE`}
                                  >
                                    {renderedValue}
                                  </Link>
                                ) : (
                                  renderedValue
                                )}
                              </Td>
                              <Td textAlign="right">
                                +{Math.max(0, Math.round(score * 100) / 100)}
                              </Td>
                            </Tr>
                          )
                        },
                      )}
                    </Tbody>
                  </Table>
                  <Flex
                    justifyContent="space-between"
                    width="100%"
                    alignItems="center"
                  >
                    <Box>
                      {rankTierDisparity ? (
                        <Alert
                          status="warning"
                          fontSize="14px"
                          maxWidth="350px"
                        >
                          <AlertIcon />
                          <Box flex="1" px="2">
                            <AlertTitle>Be cautious!</AlertTitle>
                            <AlertDescription>
                              There's a rarity tier difference with trait count
                              score enabled/disabled.
                            </AlertDescription>
                          </Box>
                        </Alert>
                      ) : null}
                    </Box>
                    <Flex justifyContent="flex-end" pt="3" lineHeight="1.85em">
                      <Box opacity="0.7">
                        <Text textAlign="right">Score:</Text>
                        <Text textAlign="right">Rank:</Text>
                      </Box>
                      <Box ml="4">
                        <Text fontWeight="semibold">
                          {Math.round(
                            propertyBreakdown[activeRarityField].score * 100,
                          ) / 100}
                        </Text>
                        <Text fontWeight="semibold">
                          #{propertyBreakdown[activeRarityField].rank}{' '}
                          <Tag
                            bg={
                              propertyBreakdown[activeRarityField].type.color[
                                colorMode
                              ]
                            }
                            mt="2px"
                            size="sm"
                            mx="1"
                          >
                            {propertyBreakdown[activeRarityField].type.name}
                          </Tag>
                        </Text>
                      </Box>
                    </Flex>
                  </Flex>
                </VStack>
              )
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </ScopedCSSPortal>
  )
}

export default PropertiesModal
