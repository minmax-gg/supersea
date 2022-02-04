import { useRef, useState, useEffect } from 'react'
import {
  Box,
  Image,
  Skeleton,
  Text,
  Flex,
  LinkBox,
  LinkOverlay,
  useColorModeValue,
} from '@chakra-ui/react'
import { Asset } from '../../utils/api'
import AssetInfo, { HEIGHT as ASSET_INFO_HEIGHT } from '../AssetInfo/AssetInfo'
import EthereumIcon from '../EthereumIcon'
import { readableEthValue } from '../../utils/ethereum'
import MassBidStatus, { MassBidState } from './MassBidStatus'

const SearchAsset = ({
  address,
  tokenId,
  asset,
  massBidState,
}: {
  address: string | null
  tokenId: string
  asset: Asset | null
  massBidState?: MassBidState
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (massBidState === 'PROCESSING' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      window.scrollTo({
        top:
          rect.top + rect.height / 2 + window.scrollY - window.innerHeight / 2,
        behavior: 'smooth',
      })
    }
  }, [massBidState])

  return (
    <Box
      background={useColorModeValue('white', '#303339')}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={useColorModeValue('#e5e8eb', '#151b22')}
      key={tokenId}
      position="relative"
      paddingBottom={ASSET_INFO_HEIGHT}
      ref={containerRef}
      animation="SuperSea__FadeIn 350ms ease"
      transition={
        massBidState === 'PROCESSING'
          ? 'transform 350ms ease'
          : 'transform 350ms 75ms ease'
      }
      transform={massBidState === 'PROCESSING' ? 'scale(1.05)' : 'scale(1)'}
    >
      <LinkBox>
        <Box
          width="100%"
          css={{ aspectRatio: '1' }}
          borderTopRadius="lg"
          overflow="hidden"
          position="relative"
        >
          <Skeleton
            positiion="absolute"
            width="100%"
            height="100%"
            top="0"
            left="0"
            transition="opacity 250ms ease"
            opacity={imageLoaded ? 0 : 1}
          />
          {asset ? (
            <Image
              src={asset.image_url || asset.asset_contract.image_url}
              width="100%"
              height="100%"
              className="SuperSea__Image"
              objectFit="cover"
              position="absolute"
              top="0"
              left="0"
              onLoad={() => setImageLoaded(true)}
              transition="opacity 250ms ease"
              opacity={imageLoaded ? 1 : 0}
            />
          ) : null}
        </Box>
        <Box height="80px" p="3">
          {asset ? (
            <Flex>
              <Box width="60%" flex="0 0 60%" pr="2">
                <Text
                  fontSize="12px"
                  opacity="0.5"
                  width="100%"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  fontWeight="500"
                >
                  {asset.collection.name}
                </Text>
                <LinkOverlay
                  href={`/assets/${address}/${tokenId}`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey) return
                    event.preventDefault()
                    window.postMessage({
                      method: 'SuperSea__Navigate',
                      params: {
                        url: `/item?assetContractAddress=${address}&tokenId=${tokenId}`,
                        as: `/assets/${address}/${tokenId}`,
                      },
                    })
                  }}
                >
                  <Text
                    fontSize="12px"
                    fontWeight="600"
                    letterSpacing="0.1px"
                    width="100%"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="normal"
                    style={{
                      display: '-webkit-box',
                      // @ts-ignore
                      '-webkit-line-clamp': '2',
                      // @ts-ignore
                      '-webkit-box-orient': 'vertical',
                    }}
                  >
                    {asset.name}
                  </Text>
                </LinkOverlay>
              </Box>
              <Flex
                width="40%"
                flex="0 0 40%"
                alignItems="flex-end"
                flexDirection="column"
              >
                {asset.sell_orders?.length ? (
                  <>
                    <Text fontSize="12px" opacity="0.5">
                      Price
                    </Text>
                    <Flex fontSize="14px" fontWeight="600" alignItems="center">
                      <EthereumIcon
                        mt="-1px"
                        wrapped={
                          asset.sell_orders[0].payment_token_contract.symbol ===
                          'WETH'
                        }
                      />
                      <Text>
                        {readableEthValue(+asset.sell_orders[0].current_price)}
                      </Text>
                    </Flex>
                  </>
                ) : null}
                {asset.last_sale ? (
                  <Flex fontSize="11px" alignItems="center">
                    <Text opacity="0.5">Last</Text>
                    <EthereumIcon
                      mx="0.5em"
                      wrapped={asset.last_sale.payment_token.symbol === 'WETH'}
                    />
                    <Text fontWeight="600">
                      {readableEthValue(+asset.last_sale.total_price)}
                    </Text>
                  </Flex>
                ) : null}
              </Flex>
            </Flex>
          ) : (
            <Skeleton width="100%" height="20px" />
          )}
        </Box>
      </LinkBox>
      {asset ? (
        <AssetInfo
          displayedPrice={
            asset.sell_orders?.length
              ? asset.sell_orders[0].base_price
              : undefined
          }
          address={address!}
          tokenId={tokenId}
          type="grid"
          chain="ethereum"
          container={containerRef.current!}
        />
      ) : null}
      {massBidState && (
        <Box position="absolute" top="2" right="2">
          <MassBidStatus state={massBidState} />
        </Box>
      )}
    </Box>
  )
}

export default SearchAsset
