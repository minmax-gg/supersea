import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import {
  HStack,
  Circle,
  Flex,
  Image,
  Box,
  Text,
  useColorModeValue,
  useColorMode,
  Tag,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  IconButton,
  AlertIcon,
  Alert,
} from '@chakra-ui/react'
import { RARITY_TYPES } from '../../utils/rarity'
import EthereumIcon from '../EthereumIcon'
import TraitTag from '../SearchResults/TraitTag'
import TooltipIconButton from '../TooltipIconButton'
import { Notifier } from './ListingNotifierForm'

const ListingNotifier = ({
  notifier,
  onRemove,
  onEdit,
  isActive,
}: {
  notifier: Notifier
  onRemove: (notifier: Notifier) => void
  onEdit: (notifier: Notifier) => void
  isActive: boolean
}) => {
  const {
    id,
    minPrice,
    maxPrice,
    lowestRarity,
    lowestRankNumber,
    traits,
    autoQuickBuy,
    collection,
    gasOverride,
  } = notifier

  const { colorMode } = useColorMode()

  return (
    <Box
      spacing="3"
      alignItems="center"
      bg={useColorModeValue('transparent', 'blackAlpha.400')}
      width="100%"
      border={useColorModeValue('1px solid', 'none')}
      borderColor="blackAlpha.300"
      pl="2"
      pr="1"
      py="1"
      pb="0"
      borderRadius="md"
    >
      <Box>
        <HStack mb="3" justifyContent="space-between" width="100%">
          <HStack spacing="3" mt="1">
            <Image
              src={collection.imageUrl}
              width="32px"
              height="32px"
              borderRadius="md"
            />
            <Box>
              <Text my="0" fontSize="sm" fontWeight="500">
                {collection.name}
              </Text>
            </Box>
          </HStack>
          <HStack spacing="0">
            <TooltipIconButton
              label="Edit Listing Alert"
              icon={<EditIcon />}
              bg="transparent"
              size="sm"
              minWidth="28px"
              onClick={() => {
                onEdit(notifier)
              }}
            />{' '}
            <TooltipIconButton
              label="Remove Listing Alert"
              icon={<DeleteIcon />}
              bg="transparent"
              size="sm"
              minWidth="28px"
              onClick={() => {
                onRemove(notifier)
              }}
            />
          </HStack>
        </HStack>
        <Table
          variant="simple"
          pr="1"
          width="100%"
          size="sm"
          sx={{
            '& td': {
              borderColor: 'transparent',
            },
          }}
        >
          <Thead>
            <Tr>
              <Th px="4">ID</Th>
              <Th>Price Range</Th>
              <Th>Name</Th>
              <Th>Rarity</Th>
              <Th>Traits</Th>
              <Th>Quick Buy</Th>
              <Th>Gas</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td px="2" py="1">
                <Circle
                  p="2"
                  width="28px"
                  height="28px"
                  fontWeight="bold"
                  bg={useColorModeValue('blackAlpha.100', 'blackAlpha.300')}
                >
                  {id}
                </Circle>
              </Td>

              <Td>
                {(() => {
                  if (minPrice === null && maxPrice === null) {
                    return 'Any'
                  } else if (minPrice === null) {
                    return (
                      <Text>
                        <EthereumIcon verticalAlign="top" />
                        {maxPrice}
                        {' or less'}
                      </Text>
                    )
                  } else if (maxPrice === null) {
                    return (
                      <Text>
                        <EthereumIcon verticalAlign="top" />
                        {minPrice}
                        {' or more'}
                      </Text>
                    )
                  }
                  return (
                    <Text>
                      <EthereumIcon verticalAlign="top" />
                      {minPrice}
                      <Text as="span" mx="0.4em">
                        -
                      </Text>
                      <EthereumIcon verticalAlign="top" />
                      {maxPrice}
                    </Text>
                  )
                })()}
              </Td>
              <Td>
                {(() => {
                  if (!notifier.nameContains.value) return 'Any'
                  if (notifier.nameContains.isRegExp)
                    return (
                      <Text fontFamily="monospace">
                        /{notifier.nameContains.value}/i
                      </Text>
                    )
                  return `"${notifier.nameContains.value}"`
                })()}
              </Td>
              <Td>
                {(() => {
                  if (lowestRarity === 'Common') {
                    if (lowestRankNumber === null) {
                      return 'Any'
                    } else {
                      return `Top #${lowestRankNumber}`
                    }
                  }
                  return (
                    <Tag
                      bg={
                        RARITY_TYPES.find(({ name }) => name === lowestRarity)!
                          .color[colorMode]
                      }
                    >
                      {lowestRarity}
                    </Tag>
                  )
                })()}
              </Td>
              <Td minW={traits.length > 1 ? '200px' : 0}>
                {traits.length ? (
                  <Flex flexWrap="wrap">
                    {traits.map((trait) => {
                      return <TraitTag key={trait} traitJson={trait} />
                    })}
                  </Flex>
                ) : (
                  'Any'
                )}
              </Td>
              <Td>{autoQuickBuy ? 'On' : 'Off'}</Td>
              <Td>
                {gasOverride
                  ? `${gasOverride.fee}/${gasOverride.priorityFee}`
                  : 'Off'}
              </Td>
            </Tr>
          </Tbody>
        </Table>
        {!isActive && (
          <Alert status="error" borderRadius="md" mb="2" mt="2">
            <AlertIcon />
            <Text>
              The "{collection.name}" collection is not currently being watched,
              which means no listings will be alerted.
            </Text>
          </Alert>
        )}
      </Box>
    </Box>
  )
}

export default ListingNotifier
