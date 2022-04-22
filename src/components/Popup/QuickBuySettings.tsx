import React, { useEffect, useState, useMemo } from 'react'
import {
  Switch,
  FormControl,
  FormLabel,
  HStack,
  VStack,
  Alert,
  AlertIcon,
  Box,
  Flex,
  Text,
  Input,
  Link,
} from '@chakra-ui/react'
import { CheckIcon } from '@chakra-ui/icons'
import _ from 'lodash'
import { User } from '../../utils/user'
import LockedFeature from '../LockedFeature'
import { ExtensionConfig } from '../../utils/extensionConfig'

const GasPresetOption = ({
  children,
  active,
  title,
  description,
  requiresFounder = false,
  isFounder,
  onClick,
}: React.PropsWithChildren<{
  active: boolean
  title: string
  requiresFounder?: boolean
  isFounder?: boolean
  description: string
  onClick: () => void
}>) => {
  const isDisabled = requiresFounder && !isFounder
  return (
    <HStack
      borderRadius="md"
      borderWidth="1px"
      borderColor={active ? 'blue.600' : 'gray.700'}
      bg={active ? 'blue.600' : undefined}
      _hover={{ borderColor: active ? 'blue.600' : 'gray.600' }}
      transition="border-color 150ms"
      px="3"
      py="2"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      opacity={isDisabled ? 0.5 : 1}
      onClick={isDisabled ? undefined : onClick}
    >
      <Box flex="1 1 auto">
        <Text fontWeight="bold">
          {title}{' '}
          {requiresFounder && !isFounder ? (
            <LockedFeature mx="1" level="founder" mt="1px" />
          ) : null}
        </Text>
        <Text opacity="0.65" fontSize="sm">
          {description}
        </Text>
        {children}
      </Box>
      <Flex height="100%" px="2" visibility={active ? 'visible' : 'hidden'}>
        <CheckIcon color="white" w="16px" height="16px" />
      </Flex>
    </HStack>
  )
}

const QuickBuySettings = ({
  isChecked,
  isDisabled,
  user,
  gasPreset,
  fixedGas,
  onChangeEnabled,
  onChangeGasPreset,
  onChangeFixedGas,
  switchRef,
  ...rest
}: {
  isChecked: boolean
  isDisabled: boolean
  user: User
  gasPreset: ExtensionConfig['quickBuyGasPreset']
  fixedGas: ExtensionConfig['fixedGas']
  onChangeEnabled: (isChecked: boolean) => void
  onChangeGasPreset: (gasPreset: ExtensionConfig['quickBuyGasPreset']) => void
  onChangeFixedGas: (fixedGas: ExtensionConfig['fixedGas']) => void
  switchRef: React.RefObject<HTMLInputElement>
} & Omit<React.ComponentProps<typeof FormControl>, 'onChange'>) => {
  const quickBuyEnabled = isChecked && user.isSubscriber
  const [priorityFeeInput, setPriorityFeeInput] = useState(
    String(fixedGas.priorityFee),
  )
  const [feeInput, setFeeInput] = useState(String(fixedGas.fee))
  const debouncedOnChangeFixedGas = useMemo(
    () => _.debounce(onChangeFixedGas, 200),
    [onChangeFixedGas],
  )

  return (
    <Box
      opacity={isDisabled ? 0.5 : 1}
      pointerEvents={isDisabled ? 'none' : undefined}
    >
      <FormControl {...rest}>
        <FormLabel htmlFor="quick-buy" fontSize="sm">
          Enable Quick Buy
        </FormLabel>
        <HStack spacing="3" alignItems="center">
          <Switch
            id="quick-buy"
            isDisabled={isDisabled || !user.isSubscriber}
            isChecked={isChecked}
            ref={switchRef}
            onChange={() => {
              if (user.isSubscriber) {
                onChangeEnabled(!isChecked)
              }
            }}
          />
          {!user.isSubscriber && (
            <Box top="1px" position="relative">
              <LockedFeature level="subscriber" />
            </Box>
          )}
        </HStack>
      </FormControl>
      <Alert
        fontSize="sm"
        status="warning"
        borderRadius="sm"
        p="2"
        pr="4"
        my="3"
      >
        <AlertIcon />
        <Text>
          Enabling Quick Buy allows SuperSea to directly initialize transactions
          through the{' '}
          <Link
            href="https://github.com/ProjectOpenSea/opensea-js"
            target="_blank"
            color="blue.300"
          >
            opensea-js library
          </Link>
          . Always verify all transactions before confirming them in your
          wallet. SuperSea takes no responsibility for any gas fee losses due to
          potential malformed transactions.
        </Text>
      </Alert>
      <FormControl
        my="3"
        cursor={quickBuyEnabled ? undefined : 'not-allowed'}
        css={{
          '*': {
            pointerEvents: quickBuyEnabled ? undefined : 'none',
          },
        }}
        opacity={quickBuyEnabled ? 1 : 0.5}
      >
        <FormLabel fontSize="sm">Quick Buy Gas Preset</FormLabel>
        <VStack spacing="2" alignItems="stretch">
          <GasPresetOption
            active={gasPreset === 'none'}
            onClick={() => onChangeGasPreset('none')}
            title="None"
            description="MetaMask decides gas."
          />
          <GasPresetOption
            active={gasPreset === 'fixed'}
            onClick={() => onChangeGasPreset('fixed')}
            title="Fixed"
            description="Fixed gas presets decided by you (in gwei)."
          >
            <HStack spacing="2" mt="3" alignItems="flex-start">
              <FormControl maxWidth="120px" isDisabled={gasPreset !== 'fixed'}>
                <FormLabel fontSize="xs">Max Fee</FormLabel>
                <Input
                  value={feeInput}
                  onChange={(e) => {
                    setFeeInput(e.target.value)
                    debouncedOnChangeFixedGas({
                      priorityFee: Number(priorityFeeInput),
                      fee: Number(e.target.value),
                    })
                  }}
                  size="sm"
                  borderColor="whiteAlpha.300"
                />
              </FormControl>
              <FormControl maxWidth="120px" isDisabled={gasPreset !== 'fixed'}>
                <FormLabel fontSize="xs">Max Priority Fee</FormLabel>
                <Input
                  value={priorityFeeInput}
                  onChange={(e) => {
                    setPriorityFeeInput(e.target.value)
                    debouncedOnChangeFixedGas({
                      priorityFee: Number(e.target.value),
                      fee: Number(feeInput),
                    })
                  }}
                  size="sm"
                  borderColor="whiteAlpha.300"
                />
              </FormControl>{' '}
            </HStack>
          </GasPresetOption>
          <GasPresetOption
            active={gasPreset === 'optimal'}
            onClick={() => onChangeGasPreset('optimal')}
            title="Optimal"
            requiresFounder
            isFounder={user.isFounder}
            description="Transaction gas set automatically to have a 99% chance of being
            included in the next block."
          />
        </VStack>
      </FormControl>
    </Box>
  )
}

export default QuickBuySettings
