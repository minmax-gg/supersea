import { HStack, VStack, Box, Flex, Text, Image, Icon } from '@chakra-ui/react'
import { FaShoppingCart, FaTag } from 'react-icons/fa'
import { useState, memo } from 'react'
import { readableEthValue } from '../../utils/ethereum'
import AssetInfo, { LIST_HEIGHT, LIST_WIDTH } from '../AssetInfo/AssetInfo'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { Chain } from '../../utils/api'
import InternalLink from '../InternalLink'
import ImageZoom from '../ImageZoom'

export type Event = {
  listingId: string
  tokenId: string
  contractAddress: string
  chain: Chain
  name: string
  image: string
  price: string
  currency: string
  timestamp: string
  eventType: string
}

const ActivityEvent = memo(
  ({ event }: { event: Event }) => {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    return (
      <HStack
        spacing="1"
        ref={(refContainer) => {
          if (!container && refContainer) {
            setContainer(refContainer)
          }
        }}
        width="100%"
      >
        {container ? (
          <AssetInfo
            displayedPrice={event.price}
            address={event.contractAddress!}
            tokenId={event.tokenId}
            type="list"
            chain={event.chain}
            container={container}
            isActivityEvent
          />
        ) : (
          <Box height={LIST_HEIGHT} width={LIST_WIDTH} />
        )}
        <HStack
          flex="1 1 auto"
          spacing="3"
          position="relative"
          height="100%"
          justifyContent="space-between"
        >
          <HStack spacing="3">
            <ImageZoom>
              <Image
                src={event.image}
                width="48px"
                height="48px"
                borderRadius="md"
                className="SuperSea__Image"
              />
            </ImageZoom>
            <Box>
              <InternalLink
                route="asset"
                params={{
                  address: event.contractAddress,
                  chainId: event.chain,
                  chainPath: event.chain === 'polygon' ? 'matic/' : '',
                  tokenId: event.tokenId,
                }}
              >
                <Text my="0" fontSize="sm" fontWeight="500">
                  {event.name}
                </Text>
              </InternalLink>
              <Box fontSize="sm" opacity="0.5">
                <TimeAgo date={new Date(`${event.timestamp}Z`)} minPeriod={5} />
              </Box>
            </Box>
          </HStack>
          <HStack spacing="4">
            <VStack spacing="0" alignItems="flex-end" justifyContent="center">
              <Text
                fontWeight="semibold"
                fontSize="sm"
                color={event.eventType === 'CREATED' ? 'green.400' : 'red.400'}
              >
                {event.eventType === 'CREATED' ? 'Listed' : 'Sold'}
              </Text>
              <Flex alignItems="center">
                <EthereumIcon mx="0.5em" wrapped={event.currency === 'WETH'} />
                <Text fontWeight="600">{readableEthValue(+event.price)}</Text>
              </Flex>
            </VStack>
            <Icon
              as={event.eventType === 'CREATED' ? FaTag : FaShoppingCart}
              color={event.eventType === 'CREATED' ? 'green.400' : 'red.400'}
            />
          </HStack>
        </HStack>
      </HStack>
    )
  },
  (prev, next) => {
    return prev.event.listingId === next.event.listingId
  },
)

export default ActivityEvent
