import _ from 'lodash'
import { useEffect, useState } from 'react'
import {
  Image,
  Spinner,
  Center,
  Box,
  Text,
  Flex,
  Skeleton,
  VStack,
  LinkOverlay,
  useColorModeValue,
} from '@chakra-ui/react'
import Logo from './Logo'
import { fetchRemoteConfig } from '../utils/api'
import { createRouteParams } from '../utils/route'
const TransferInfo = ({ address }: { address: string }) => {
  const [username, setUsername] = useState<null | undefined | string>(null)
  const [imageUrl, setImageUrl] = useState<null | undefined | string>(null)

  const color = useColorModeValue('black', 'white')

  useEffect(() => {
    setUsername(null)
    setImageUrl(null)
    ;(async () => {
      const remoteConfig = await fetchRemoteConfig()
      const route = createRouteParams(remoteConfig.routes.profile, {
        identifier: address,
      })
      const serverRender = await fetch(route.as).then((res) => res.text())
      const html = document.createElement('html')
      html.innerHTML = serverRender
      const nextData = JSON.parse(
        html.querySelector(remoteConfig.nextSsrProps.scriptId)?.innerHTML ||
          '{}',
      )
      const username = _.get(
        nextData,
        remoteConfig.nextSsrProps.paths.profileUsername,
      )
      const imageUrl = _.get(
        nextData,
        remoteConfig.nextSsrProps.paths.profileImageUrl,
      )
      setUsername(username)
      setImageUrl(imageUrl)
    })()
  }, [address])

  return (
    <Box
      borderRadius="md"
      width="200px"
      bg={useColorModeValue('gray.200', 'gray.700')}
      mb="6"
      mt="1"
    >
      <Center
        width="200px"
        height="200px"
        borderRadius="md"
        borderBottomLeftRadius="0"
        borderBottomRightRadius="0"
        bg={useColorModeValue('gray.300', 'gray.500')}
        position="relative"
      >
        {username !== null ? (
          <LinkOverlay
            href={`https://opensea.io/${address}`}
            target="_blank"
            width="100%"
            height="100%"
          >
            <Image
              src={imageUrl?.replace(/s100$/, 's300')}
              width="100%"
              height="100%"
              borderRadius="md"
              borderBottomLeftRadius="0"
              borderBottomRightRadius="0"
            />
          </LinkOverlay>
        ) : (
          <Spinner />
        )}
      </Center>
      <Flex
        p="2"
        spacing="1"
        justifyContent="space-between"
        alignItems="center"
      >
        {username !== null ? (
          <>
            <Box>
              <Text
                fontSize="10px"
                fontWeight="600"
                textTransform="uppercase"
                opacity={0.5}
                mb="1px"
              >
                Receiver
              </Text>
              <Text fontWeight="semibold">{username || 'Unnamed'}</Text>
            </Box>
            <Logo
              width="32px"
              height="32px"
              ml="2"
              color={color}
              opacity="0.6"
              flipped
            />
          </>
        ) : (
          <VStack spacing="1" alignItems="flex-start" pb="1">
            <Skeleton height="10px" width="80px" />
            <Skeleton height="16px" width="140px" />
          </VStack>
        )}
      </Flex>
    </Box>
  )
}

export default TransferInfo
