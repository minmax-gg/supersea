import React, { useEffect, useRef, useState } from 'react'
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  useColorModeValue,
  VStack,
  Select,
  Text,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  AlertDescription,
  AlertTitle,
  Link,
  Box,
  Flex,
  Tooltip,
  Icon,
} from '@chakra-ui/react'
import { FiHelpCircle } from 'react-icons/fi'
import EthereumIcon from '../EthereumIcon'
import Toast from '../Toast'
import ScopedCSSPortal from '../ScopedCSSPortal'

const EXPIRATION_PRESETS = [
  { name: '15 minutes', value: 1000 * 60 * 15 },
  { name: '1 hour', value: 1000 * 60 * 60 },
  { name: '1 day', value: 1000 * 60 * 60 * 24 },
  { name: '1 week', value: 1000 * 60 * 60 * 24 * 7 },
  { name: '1 month', value: 1000 * 60 * 60 * 24 * 30 },
  { name: 'Custom', value: -1 },
]

const convertToLocalTime = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000
  const str = new Date(date.getTime() - offset).toISOString()
  return str.slice(0, str.lastIndexOf(':'))
}

const MassBidInput = ({
  onConfirm,
}: {
  onConfirm: (opts: { price: number; expirationTime: number }) => void
}) => {
  const confirmDisclosure = useDisclosure()
  const toast = useToast()
  const [priceInput, setPriceInput] = useState('')
  const [expirationPreset, setExpirationPreset] = useState(
    EXPIRATION_PRESETS[0].value,
  )

  const [unconfirmedOptions, setUnconfirmedOptions] = useState({
    price: 0,
    expirationTime: 0,
  })

  const [expirationTimeInput, setExpirationTimeInput] = useState(
    convertToLocalTime(new Date(Date.now() + expirationPreset)),
  )

  const cancelRef = useRef<any>(null)

  useEffect(() => {
    if (expirationPreset === -1) return
    setExpirationTimeInput(
      convertToLocalTime(new Date(Date.now() + expirationPreset)),
    )
  }, [expirationPreset])

  return (
    <VStack alignItems="flex-start" spacing="4" width="100%">
      <FormControl maxWidth="140px">
        <FormLabel fontSize="sm">
          <EthereumIcon wrapped /> Price
        </FormLabel>
        <Input
          borderColor={useColorModeValue('blackAlpha.300', 'whiteAlpha.300')}
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel fontSize="sm">Expiration</FormLabel>
        <Select
          borderColor="transparent"
          bg={useColorModeValue('gray.100', 'whiteAlpha.200')}
          value={expirationPreset}
          onChange={(e) => setExpirationPreset(Number(e.target.value))}
        >
          {EXPIRATION_PRESETS.map(({ name, value }) => {
            return (
              <option key={name} value={value}>
                {name}
              </option>
            )
          })}
        </Select>
        <Input
          mt="2"
          borderColor={useColorModeValue('blackAlpha.300', 'whiteAlpha.300')}
          type="datetime-local"
          value={expirationTimeInput}
          min={convertToLocalTime(new Date())}
          onChange={(e) => {
            setExpirationPreset(-1)
            setExpirationTimeInput(e.target.value)
          }}
          sx={{
            '::-webkit-calendar-picker-indicator': {
              filter: useColorModeValue(undefined, 'invert(1)'),
            },
          }}
        />
      </FormControl>
      <Flex width="100%" justifyContent="flex-end">
        <Tooltip
          label="Clicking confirms starts a process of placing bids on the currently filtered items, signed one by one through MetaMask."
          fontSize="sm"
          hasArrow
          bg="gray.700"
          placement="top"
          color="white"
          px="2"
          py="2"
          mr="2"
        >
          <Flex height="100%" alignItems="center" px="3">
            <Icon as={FiHelpCircle} />
          </Flex>
        </Tooltip>
        <Button
          onClick={() => {
            const expirationTimestamp = new Date(expirationTimeInput).getTime()
            if (!expirationTimestamp || Date.now() > expirationTimestamp) {
              toast({
                duration: 7500,
                position: 'bottom-right',
                render: () => (
                  <Toast
                    text="Invalid expiration time for mass bid."
                    type="error"
                  />
                ),
              })
              return
            }

            const price = Number(priceInput)
            if (!price || price < 0) {
              toast({
                duration: 7500,
                position: 'bottom-right',
                render: () => (
                  <Toast text="Invalid price for mass bid." type="error" />
                ),
              })
              return
            }
            setUnconfirmedOptions({
              price,
              expirationTime: expirationTimestamp / 1000,
            })
            confirmDisclosure.onOpen()
          }}
        >
          Confirm
        </Button>
      </Flex>
      <ScopedCSSPortal>
        <AlertDialog
          isOpen={confirmDisclosure.isOpen}
          leastDestructiveRef={cancelRef}
          onClose={confirmDisclosure.onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent maxWidth="600px">
              <AlertDialogHeader fontSize="lg" fontWeight="bold" pb="0">
                Confirm Mass Bid
              </AlertDialogHeader>
              <AlertDialogBody lineHeight="1.5em">
                <Text>
                  This will start a process of placing bids, which will need to
                  be signed one by one through MetaMask.
                </Text>
                <Text mt="2">
                  Please confirm that you want to place bids on the currently
                  filtered items, with the following options:
                </Text>
                <Text mt="2">
                  <strong>Price: </strong> {unconfirmedOptions.price} WETH
                </Text>
                <Text>
                  <strong>Expiration: </strong>{' '}
                  {new Date(
                    unconfirmedOptions.expirationTime * 1000,
                  ).toUTCString()}{' '}
                </Text>
                <Alert status="warning" mt="4" fontSize="14px">
                  <AlertIcon />
                  <Box flex="1" px="2">
                    <AlertTitle>Use at your own risk!</AlertTitle>
                    <AlertDescription>
                      <Text>
                        SuperSea uses the{' '}
                        <Link
                          href="https://github.com/ProjectOpenSea/opensea-js"
                          target="_blank"
                          color="blue.300"
                        >
                          opensea-js library
                        </Link>{' '}
                        to create bids for you. Bids can be created for free,
                        but cancelling them costs gas.
                      </Text>

                      <Text mt="2">
                        We will not be responsible for any potential losses
                        incurred from using this tool, either from malformed
                        user input or from a bug in our software.
                      </Text>
                    </AlertDescription>
                  </Box>
                </Alert>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={confirmDisclosure.onClose}>
                  Cancel
                </Button>
                <Button
                  color="white"
                  bg="blue.500"
                  _hover={{ bg: 'blue.400' }}
                  _active={{ bg: 'blue.300' }}
                  onClick={() => {
                    confirmDisclosure.onClose()
                    onConfirm(unconfirmedOptions)
                  }}
                  ml={3}
                >
                  Confirm
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </ScopedCSSPortal>
    </VStack>
  )
}

export default MassBidInput
