import { useState } from 'react'
import {
  HStack,
  VStack,
  Image,
  Text,
  Box,
  Flex,
  Spinner,
  Tooltip,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react'
import useFloor from '../../hooks/useFloor'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { SmallCloseIcon } from '@chakra-ui/icons'
import { Trait } from '../../utils/api'
import InternalLink from '../InternalLink'

export type Collection = {
  name: string
  imageUrl: string
  slug: string
  contractAddress: string
  rarities: {
    tokenRank: Record<string, number>
    noTraitCountTokenRank: Record<string, number>
    tokenCount: number
    isRanked: boolean
    traits: Trait[]
  }
}

const WatchedCollection = ({
  collection,
  onRemove,
}: {
  collection: Collection
  onRemove: () => void
}) => {
  const { floor, loading: floorLoading, loadedAt: floorLoadedAt } = useFloor(
    collection.slug,
  )
  const [floorTooltipOpen, setFloorTooltipOpen] = useState(false)

  return (
    <HStack
      spacing="1"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
      bg={useColorModeValue('gray.100', 'blackAlpha.400')}
      p="2"
      pr="1"
      borderRadius="md"
    >
      <HStack spacing="3">
        <Image
          src={collection.imageUrl}
          width="48px"
          height="48px"
          borderRadius="md"
        />
        <Box>
          <InternalLink
            route="collection"
            params={{
              collectionSlug: collection.slug,
            }}
            my="0"
            fontSize="sm"
            fontWeight="500"
          >
            {collection.name}
          </InternalLink>
        </Box>
      </HStack>
      <HStack spacing="2">
        <VStack spacing="0" alignItems="flex-end" justifyContent="center">
          <Text fontWeight="semibold" fontSize="sm">
            Floor
          </Text>
          <Flex alignItems="center">
            <Flex width="100%" alignItems="center">
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
                    <Text fontWeight="500" verticalAlign="middle">
                      {floor === null
                        ? 'Unavailable'
                        : `${floor.price} ${
                            floor.currency !== 'ETH' ? ` ${floor.currency}` : ''
                          }`}
                    </Text>
                  </Tooltip>
                </>
              ) : null}
              {floorLoading ? (
                <Spinner ml={1} width={3} height={3} opacity={0.75} />
              ) : null}
            </Flex>
          </Flex>
        </VStack>
        <IconButton
          opacity="0.75"
          icon={<SmallCloseIcon />}
          bg="transparent"
          aria-label="delete"
          onClick={onRemove}
        />
      </HStack>
    </HStack>
  )
}

export default WatchedCollection
