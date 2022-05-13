import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Text,
  Flex,
  Icon,
  IconButton,
  Heading,
  Link,
  VStack,
  Divider,
  Skeleton,
  useToast,
} from '@chakra-ui/react'
import queryString from 'query-string'

import { FaGithub } from 'react-icons/fa'
import { ReactComponent as DiscordSvg } from '../../assets/discord.svg'
import { ReactComponent as OpenSeaSvg } from '../../assets/opensea.svg'
import { ReactComponent as EtherscanSvg } from '../../assets/etherscan.svg'
import { ReactComponent as LogoSvg } from '../../assets/logo-with-text.svg'
import QuickBuySettings from './QuickBuySettings'
import GlobalToggle from './GlobalToggle'
import {
  getExtensionConfig,
  saveExtensionConfig,
  useExtensionConfig,
} from '../../utils/extensionConfig'
import { useUser } from '../../utils/user'
import StreamingToggle from './StreamingToggle'

const Popup = () => {
  const [isChanged, setIsChanged] = useState(false)
  const [extensionConfig, setExtensionConfig] = useExtensionConfig()
  const user = useUser()
  const quickBuyToggleRef = useRef<HTMLInputElement | null>(null)
  const actionPerformedRef = useRef(false)
  const toast = useToast()
  useEffect(() => {
    if (!extensionConfig || actionPerformedRef.current) return
    const query = queryString.parse(window.location.search)
    if (query.action === 'activateQuickBuy') {
      actionPerformedRef.current = true
      setTimeout(() => {
        quickBuyToggleRef.current?.focus()
        quickBuyToggleRef.current?.scrollIntoView({
          behavior: 'smooth',
        })
      }, 250)
    }
  }, [extensionConfig])

  useEffect(() => {
    if (isChanged) {
      toast({
        duration: 2500,
        position: 'bottom',
        render: () => (
          <Box bg={'blue.600'} borderRadius="md" px="3" py="3" mx="2">
            <Text color="white" fontWeight="600">
              Saved! Refresh any active OpenSea tabs to apply changes.
            </Text>
          </Box>
        ),
      })
    }
  }, [isChanged, toast])

  console.log({ extensionConfig, user })

  return (
    <Box
      bg="gray.800"
      width="400px"
      fontSize="16px"
      maxHeight="550px"
      overflow="auto"
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 0, 0, 0.225)',
          borderRadius: '24px',
        },
      }}
    >
      <Box px="4">
        <Icon
          as={LogoSvg}
          color="blue.500"
          width="auto"
          height="40px"
          my="24px"
        />
        <Text pr="5" opacity={0.9}>
          SuperSea improves OpenSea by injecting extra components into the
          website. Look for the whale logo to see what we've added!
        </Text>

        <VStack
          spacing="4"
          divider={<Divider borderColor="gray.600" />}
          alignItems="flex-start"
        >
          <Box mt="6">
            <Heading as="h2" size="lg">
              Settings
            </Heading>
          </Box>
          {extensionConfig && user
            ? [
                <GlobalToggle
                  key="globalToggle"
                  isChecked={extensionConfig.enabled}
                  onChange={(enabled) => {
                    setIsChanged(true)
                    setExtensionConfig({
                      ...extensionConfig,
                      enabled,
                    })
                  }}
                />,
                <StreamingToggle
                  key="streamingToggle"
                  isChecked={extensionConfig.useStreamClient}
                  onChange={(useStreamClient) => {
                    setIsChanged(true)
                    setExtensionConfig({
                      ...extensionConfig,
                      useStreamClient,
                    })
                  }}
                />,
                <QuickBuySettings
                  key="quickBuySettings"
                  user={user}
                  isDisabled={!extensionConfig.enabled}
                  isChecked={extensionConfig.quickBuyEnabled}
                  switchRef={quickBuyToggleRef}
                  gasPreset={extensionConfig.quickBuyGasPreset}
                  fixedGas={extensionConfig.fixedGas}
                  onChangeEnabled={(quickBuyEnabled) => {
                    setIsChanged(true)
                    setExtensionConfig({
                      ...extensionConfig,
                      quickBuyEnabled,
                    })
                  }}
                  onChangeGasPreset={(quickBuyGasPreset) => {
                    setExtensionConfig({
                      ...extensionConfig,
                      quickBuyGasPreset,
                    })
                  }}
                  onChangeFixedGas={(fixedGas) => {
                    setExtensionConfig({
                      ...extensionConfig,
                      fixedGas,
                    })
                  }}
                />,
              ]
            : ['80px', '40px', '120px'].map((height, i) => (
                <Skeleton key={i} height={height} width="100%" />
              ))}
        </VStack>
      </Box>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        mt="8"
        bg="blackAlpha.200"
        py="1"
        px="4"
      >
        <Link
          href="https://nonfungible.tools"
          target="_blank"
          fontSize="14px"
          fontWeight="500"
          opacity={0.9}
        >
          Non Fungible Tools
        </Link>
        <Flex>
          <IconButton
            as="a"
            target="_blank"
            href="https://discord.gg/MR2Cn929wQ"
            icon={<Icon as={DiscordSvg} width="24px" height="24px" />}
            aria-label="Join Discord"
            p="2"
            bg="transparent"
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />
          <IconButton
            as="a"
            target="_blank"
            href="https://opensea.io/collection/non-fungible-tools-membership"
            icon={<Icon as={OpenSeaSvg as any} width="24px" height="24px" />}
            aria-label="OpenSea Membership Collection"
            p="2"
            bg="transparent"
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />{' '}
          <IconButton
            as="a"
            target="_blank"
            href="https://etherscan.io/address/0x24E047001f0Ac15f72689D3F5cD0B0f52b1abdF9"
            icon={<Icon as={EtherscanSvg as any} width="24px" height="24px" />}
            aria-label="Contract on Etherscan"
            p="2"
            bg="transparent"
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />
          <IconButton
            as="a"
            target="_blank"
            href="https://github.com/minmax-gg/supersea"
            icon={<Icon as={FaGithub} width="24px" height="24px" />}
            aria-label="GitHub Source Code"
            p="2"
            bg="transparent"
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />
        </Flex>
      </Flex>
    </Box>
  )
}

export default Popup
