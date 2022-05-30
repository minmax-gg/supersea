import { useEffect, useState } from 'react'
import _ from 'lodash'
import {
  Box,
  Text,
  Flex,
  Link,
  Spinner,
  HStack,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  Progress,
  useColorModeValue,
  Image,
  Modal,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Table,
  Icon,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import Logo from './Logo'
import { BiReceipt } from 'react-icons/bi'
import {
  fetchAllCollectionsForUser,
  fetchFloorPrice,
  fetchRemoteConfig,
} from '../utils/api'
import EthereumIcon from './EthereumIcon'
import ScopedCSSPortal from './ScopedCSSPortal'
import InternalLink from './InternalLink'

type CollectionFloor = {
  name: string
  floor: number
  slug: string
  image: string
  ownedCount: number
}
const ProfileSummary = () => {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState<{
    total: number
    numLoaded: number
    complete: boolean
  }>({ total: 0, numLoaded: 0, complete: false })
  const [floorTotal, setFloorTotal] = useState(0)
  const [floorBreakdown, setFloorBreakdown] = useState<CollectionFloor[]>([])
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false)
  const [breakdownSorting, setBreakdownSorting] = useState<{
    sortBy: 'total' | 'unit'
    ascending: boolean
  }>({ sortBy: 'unit', ascending: false })
  const tableStripeColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  useEffect(() => {
    if (!active) return
    ;(async () => {
      const remoteConfig = await fetchRemoteConfig()
      // Fetch the current (profile) page as text
      const serverRender = await fetch(
        window.location.href.split(/[?#]/)[0],
      ).then((res) => res.text())
      const html = document.createElement('html')
      html.innerHTML = serverRender
      const nextData = JSON.parse(
        html.querySelector(remoteConfig.nextSsrProps.scriptSelector)
          ?.innerHTML || '{}',
      )
      const address = _.get(
        nextData,
        remoteConfig.nextSsrProps.paths.profileAddress,
      )

      if (!address) return

      const collections = await fetchAllCollectionsForUser(address)
      await Promise.all(
        collections.map(async ({ slug, name, image, ownedCount }) => {
          const floor = await fetchFloorPrice(slug)
          setFloorTotal((total) => total + floor.price * ownedCount)
          setFloorBreakdown((floorBreakdown) => [
            ...floorBreakdown,
            { name, slug, image, floor: floor.price, ownedCount },
          ])
          setProgress(({ numLoaded }) => ({
            total: collections.length,
            numLoaded: numLoaded + 1,
            complete: numLoaded + 1 >= collections.length,
          }))
        }),
      )
    })()
  }, [active])

  return (
    <Box width="100vw" maxWidth="480px">
      <Flex
        bg={useColorModeValue('gray.50', 'gray.700')}
        color={useColorModeValue('gray.700', 'white')}
        width="100%"
        borderRadius="md"
        border="1px solid"
        flexDirection="column"
        justifyContent="center"
        minHeight="90px"
        borderColor={useColorModeValue('gray.200', 'transparent')}
        my="4"
        py="4"
        px="4"
        pr="120px"
        position="relative"
        overflow="hidden"
      >
        <Logo
          flipped
          position="absolute"
          opacity={0.35}
          width="60px"
          height="60px"
          top="50%"
          right="12px"
          transform="translateY(-50%)"
        />
        {active ? (
          <>
            <Progress
              bg="transparent"
              position="absolute"
              width="100%"
              size="xs"
              top={0}
              m={0}
              left={0}
              isIndeterminate={progress.numLoaded === 0}
              value={(progress.numLoaded / progress.total) * 100}
              transition="opacity 250ms 100ms ease"
              opacity={progress.complete ? 0 : 1}
              sx={{
                '> div': {
                  transition: 'width 250ms ease',
                },
              }}
            />
            <HStack spacing="8">
              <Stat minWidth="150px">
                <StatLabel whiteSpace="nowrap" opacity="0.75" mb="1px">
                  Total Floor Value
                </StatLabel>
                <StatNumber
                  m={0}
                  whiteSpace="nowrap"
                  display="flex"
                  minHeight="35px"
                  alignItems="center"
                >
                  <EthereumIcon mt="-3px" />
                  <Text>
                    {progress.numLoaded
                      ? Math.round(floorTotal * 100) / 100
                      : null}
                  </Text>
                  {!progress.complete ? (
                    <Spinner size="sm" mx="2" mt="-3px" />
                  ) : null}
                </StatNumber>
              </Stat>
              <Stat minWidth="150px">
                <StatLabel whiteSpace="nowrap" opacity="0.75" mb="1px">
                  Average Item Floor
                </StatLabel>
                <StatNumber
                  m={0}
                  whiteSpace="nowrap"
                  display="flex"
                  minHeight="35px"
                  alignItems="center"
                >
                  <EthereumIcon mt="-3px" />
                  <Text>
                    {progress.numLoaded
                      ? Math.round((floorTotal / progress.numLoaded) * 100) /
                        100
                      : null}
                  </Text>
                  {!progress.complete ? (
                    <Spinner size="sm" mx="2" mt="-3px" />
                  ) : null}
                </StatNumber>
              </Stat>
            </HStack>
            <Box mb="-12px" ml="-2px" mt="3">
              <Button
                opacity="0.75"
                variant="link"
                onClick={() => setBreakdownModalOpen(true)}
                size="sm"
                fontWeight="500"
                iconSpacing="0.25em"
                leftIcon={<Icon as={BiReceipt} width="16px" height="16px" />}
              >
                View Breakdown
              </Button>
            </Box>
            <ScopedCSSPortal>
              <Modal
                isOpen={breakdownModalOpen}
                onClose={() => setBreakdownModalOpen(false)}
              >
                <ModalOverlay />
                <ModalContent maxWidth="container.md">
                  <ModalCloseButton />
                  <ModalHeader pb="0">
                    Profile Floor Value Breakdown
                  </ModalHeader>
                  <ModalBody px="3" pb="8">
                    <Text opacity="0.85" px="3">
                      Assets on Polygon and chains other than Ethereum are
                      currently unavailable.
                    </Text>
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
                          <Th>Owned</Th>
                          <Th>Collection</Th>
                          <Th
                            cursor="pointer"
                            whiteSpace="nowrap"
                            onClick={() => {
                              setBreakdownSorting(({ sortBy, ascending }) => {
                                if (sortBy === 'total') {
                                  return { sortBy: 'unit', ascending: false }
                                }
                                return {
                                  sortBy: 'unit',
                                  ascending: !ascending,
                                }
                              })
                            }}
                          >
                            Unit Floor{' '}
                            <Icon
                              as={
                                breakdownSorting.ascending
                                  ? ChevronUpIcon
                                  : ChevronDownIcon
                              }
                              width="1.5em"
                              height="1.5em"
                              verticalAlign="top"
                              opacity={
                                breakdownSorting.sortBy === 'unit' ? 1 : 0
                              }
                            />
                          </Th>
                          <Th
                            cursor="pointer"
                            whiteSpace="nowrap"
                            onClick={() => {
                              setBreakdownSorting(({ sortBy, ascending }) => {
                                if (sortBy === 'unit') {
                                  return { sortBy: 'total', ascending: false }
                                }
                                return {
                                  sortBy: 'total',
                                  ascending: !ascending,
                                }
                              })
                            }}
                          >
                            Total Floor{' '}
                            <Icon
                              as={
                                breakdownSorting.ascending
                                  ? ChevronUpIcon
                                  : ChevronDownIcon
                              }
                              width="1.5em"
                              height="1.5em"
                              verticalAlign="top"
                              opacity={
                                breakdownSorting.sortBy === 'total' ? 1 : 0
                              }
                            />
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {floorBreakdown
                          .sort((a, b) => {
                            if (breakdownSorting.sortBy === 'total') {
                              return (
                                (b.floor * b.ownedCount -
                                  a.floor * a.ownedCount) *
                                (breakdownSorting.ascending ? -1 : 1)
                              )
                            }
                            return (
                              (b.floor - a.floor) *
                              (breakdownSorting.ascending ? -1 : 1)
                            )
                          })
                          .map(({ name, slug, image, floor, ownedCount }) => {
                            return (
                              <Tr key={slug}>
                                <Td>{ownedCount}x</Td>
                                <Td>
                                  <HStack spacing="2">
                                    <Image
                                      src={image}
                                      width="16px"
                                      height="16px"
                                    />
                                    <InternalLink
                                      route="collection"
                                      params={{ collectionSlug: slug }}
                                      onClick={() => {
                                        setBreakdownModalOpen(false)
                                      }}
                                    >
                                      {name}
                                    </InternalLink>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Flex alignItems="center">
                                    <EthereumIcon mx="0.5em" />
                                    <Text fontWeight="600">{floor}</Text>
                                  </Flex>
                                </Td>{' '}
                                <Td>
                                  <Flex alignItems="center">
                                    <EthereumIcon mx="0.5em" />
                                    <Text fontWeight="600">
                                      {Math.round(floor * ownedCount * 10000) /
                                        10000}
                                    </Text>
                                  </Flex>
                                </Td>
                              </Tr>
                            )
                          })}
                      </Tbody>
                    </Table>
                  </ModalBody>
                </ModalContent>
              </Modal>
            </ScopedCSSPortal>
          </>
        ) : (
          <Box>
            <Button onClick={() => setActive(true)} variant="outline">
              Calculate Profile Value
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  )
}

export default ProfileSummary
