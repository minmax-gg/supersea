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
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react'
import ScopedCSSPortal from '../ScopedCSSPortal'
import { fetchTokenProperties } from '../../utils/api'
import { RARITY_TYPES } from '../../utils/rarity'

type Properties = {
  name: string
  value: string | null
  score: number
  rarity: number | null
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
        rank: number
        score: number
        properties: Properties
      }
    | null
    | undefined
  >(undefined)

  const tableStripeColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const { colorMode } = useColorMode()

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
            }
          })
          .filter(Boolean)

        setPropertyBreakdown({
          rank: token.rank,
          score: token.score,
          properties: (token.attributes.map(({ trait_type, value }) => {
            const trait = traits.find(
              (t) => t.trait_type === trait_type && t.value === value,
            )

            return {
              name: trait_type,
              value,
              score: rarityTable.scoreMap[trait_type][value],
              rarity: trait ? trait.count / tokenCount : null,
            }
          }) as Properties)
            .concat(
              missingTraits as Exclude<typeof missingTraits[number], null>[],
            )
            .concat(
              rarityTable.scoreMap['Trait Count']
                ? [
                    {
                      name: 'Trait Count',
                      value: String(token.attributes.length),
                      score:
                        rarityTable.scoreMap['Trait Count'][
                          token.attributes.length
                        ],
                      rarity: null,
                    },
                  ]
                : [],
            ),
        })
      } catch (err) {
        console.error(err)
        setPropertyBreakdown(null)
      }
    })()
  }, [address, tokenId])

  return (
    <ScopedCSSPortal>
      <Modal isOpen={true} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxWidth="container.sm">
          <ModalCloseButton />
          <ModalHeader pb="0">Trait Breakdown</ModalHeader>
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
                <>
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
                        ({ name, value, rarity, score }, index) => {
                          const rarityType = rarity
                            ? RARITY_TYPES.find(({ top }) => rarity <= top)
                            : null
                          const renderedValue = (
                            <>
                              <Text>
                                {value !== null ? (
                                  value
                                ) : (
                                  <Text opacity="0.75">Missing</Text>
                                )}
                                {rarityType ? (
                                  <Tag
                                    bg={rarityType.color[colorMode]}
                                    size="sm"
                                    mx="2"
                                  >
                                    {rarityType.name}
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
                            <Tr key={index}>
                              <Td>{name}</Td>
                              <Td lineHeight="1.6em">
                                {collectionSlug && value !== null ? (
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
                  <Flex width="100%" justifyContent="flex-end" pt="6">
                    <Text>
                      Total Score:{' '}
                      <Text as="span" fontWeight="500">
                        {Math.round(propertyBreakdown.score * 100) / 100}
                      </Text>
                    </Text>
                  </Flex>
                </>
              )
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </ScopedCSSPortal>
  )
}

export default PropertiesModal
