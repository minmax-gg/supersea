import {
  HStack,
  Box,
  Flex,
  Text,
  Image,
  LinkOverlay,
  Circle,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState } from 'react'
import { readableEthValue } from '../../utils/ethereum'
import AssetInfo, { LIST_HEIGHT, LIST_WIDTH } from '../AssetInfo/AssetInfo'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { Chain } from '../../utils/api'
import { Notifier } from './ListingNotifierForm'

export type MatchedAsset = {
  listingId: string
  tokenId: string
  contractAddress: string
  chain: Chain
  name: string
  image: string
  price: string
  currency: string
  timestamp: string
  notifier: Pick<Notifier, 'id'>
}

const MatchedAssetListing = ({ asset }: { asset: MatchedAsset }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const idCircleBackground = useColorModeValue(
    'blackAlpha.100',
    'blackAlpha.300',
  )
  return (
    <HStack
      spacing="2"
      ref={(refContainer) => {
        if (!container && refContainer) {
          setContainer(refContainer)
        }
      }}
      width="100%"
    >
      {container ? (
        <AssetInfo
          displayedPrice={asset.price}
          address={asset.contractAddress!}
          tokenId={asset.tokenId}
          type="list"
          chain={asset.chain}
          container={container}
        />
      ) : (
        <Box height={LIST_HEIGHT} width={LIST_WIDTH} />
      )}
      <HStack flex="1 1 auto" spacing="3" position="relative">
        <Image
          src={asset.image}
          width="48px"
          height="48px"
          borderRadius="md"
          className="SuperSea__Image"
        />
        <Box>
          <LinkOverlay
            href={`/assets/${asset.chain === 'polygon' ? 'matic/' : ''}${
              asset.contractAddress
            }/${asset.tokenId}`}
            target="_blank"
          >
            <Text my="0" fontSize="sm" fontWeight="500">
              {asset.name}
            </Text>
          </LinkOverlay>
          <Box fontSize="sm" opacity="0.5">
            <TimeAgo date={new Date(`${asset.timestamp}Z`)} />
          </Box>
        </Box>
      </HStack>
      <Flex alignItems="center">
        <EthereumIcon mx="0.5em" wrapped={asset.currency === 'WETH'} />
        <Text fontWeight="600">{readableEthValue(+asset.price)}</Text>
      </Flex>
      <Box pl="4">
        <Circle
          p="2"
          width="28px"
          height="28px"
          fontWeight="bold"
          bg={idCircleBackground}
        >
          {asset.notifier.id}
        </Circle>
      </Box>
    </HStack>
  )
}

export default MatchedAssetListing
