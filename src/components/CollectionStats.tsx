import { useEffect, useState } from 'react'
import { Collection, fetchCollection } from '../utils/api'
import {
  Box,
  Flex,
  Text,
  HStack,
  Button,
  Tooltip,
  Divider,
  Spinner,
  Table,
  Tbody,
  Tr,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
} from '@chakra-ui/react'
import { BellIcon } from '@chakra-ui/icons'
import TimeAgo from 'react-timeago'
import EthereumIcon from './EthereumIcon'
import Logo from './Logo'

const CollectionStats = ({ collectionSlug }: { collectionSlug: string }) => {
  const [collection, setCollection] = useState<Collection | null>(null)
  useEffect(() => {
    ;(async () => {
      setCollection(await fetchCollection(collectionSlug))
    })()
  })

  return (
    <Box mt="4" mb="4" width="100%" maxWidth="600px">
      <Box
        bg={useColorModeValue('gray.50', 'gray.700')}
        color={useColorModeValue('gray.700', 'white')}
        borderRadius="md"
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'transparent')}
        py="4"
        px="5"
        position="relative"
        pr="60px"
      >
        <Logo
          flipped
          position="absolute"
          opacity={0.35}
          width="45px"
          height="45px"
          top="50%"
          right="8px"
          transform="translateY(-50%)"
        />
        <HStack
          spacing="3"
          alignItems="flex-start"
          divider={
            <Divider
              orientation="vertical"
              borderColor={useColorModeValue('gray.300', 'whiteAlpha.200')}
              height="auto"
              alignSelf="stretch"
            />
          }
        >
          <Stat>
            <StatLabel mb="1">Sales today</StatLabel>
            <StatNumber fontSize="xl">
              {collection ? (
                <Tooltip
                  label={
                    <Table variant="unstyled" size="sm">
                      <Tbody>
                        {[
                          {
                            key: 'one_day_sales',
                            name: 'daily sales',
                          },
                          {
                            key: 'seven_day_sales',
                            name: 'weekly sales',
                          },
                          {
                            key: 'thirty_day_sales',
                            name: 'monthly sales',
                          },
                        ].map(({ key, name }) => {
                          const value =
                            collection.stats[key as keyof Collection['stats']]
                          return (
                            <Tr key={key}>
                              <Td textAlign="right" p="1">
                                {name}:
                              </Td>
                              <Td p="1" fontWeight="bold">
                                {value}
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  }
                  fontSize="xs"
                  hasArrow
                  bg="gray.800"
                  placement="top"
                  color="white"
                  p="2"
                >
                  <Text cursor="default">{collection.stats.one_day_sales}</Text>
                </Tooltip>
              ) : (
                <Spinner size="sm" />
              )}
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel mb="1">Weekly volume</StatLabel>
            <StatNumber fontSize="xl">
              {collection ? (
                <Tooltip
                  label={
                    <Table variant="unstyled" size="sm">
                      <Tbody>
                        {[
                          {
                            key: 'one_day_change',
                            name: 'daily change',
                          },
                          {
                            key: 'seven_day_change',
                            name: 'weekly change',
                          },
                          {
                            key: 'thirty_day_change',
                            name: 'monthly change',
                          },
                        ].map(({ key, name }) => {
                          const value =
                            collection.stats[key as keyof Collection['stats']]
                          return (
                            <Tr key={key}>
                              <Td textAlign="right" p="1">
                                {name}
                              </Td>
                              <Td p="1">
                                <StatHelpText key={key} m="0" fontWeight="bold">
                                  <StatArrow
                                    type={value >= 0 ? 'increase' : 'decrease'}
                                    mr="1"
                                  />
                                  {value >= 0 ? '+' : ''}
                                  {Math.round(value * 10000) / 100}%
                                </StatHelpText>
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  }
                  fontSize="xs"
                  hasArrow
                  bg="gray.800"
                  placement="top"
                  color="white"
                  p="2"
                >
                  <Text cursor="default" whiteSpace="nowrap">
                    <EthereumIcon mt="-3px" />
                    {Math.round(collection.stats.seven_day_volume * 100) / 100}
                    {collection.stats.seven_day_change !== 0 && (
                      <StatArrow
                        type={
                          collection.stats.seven_day_change >= 0
                            ? 'increase'
                            : 'decrease'
                        }
                        ml="1"
                        mt="-3px"
                      />
                    )}
                  </Text>
                </Tooltip>
              ) : (
                <Spinner size="sm" />
              )}
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel mb="1">Royalty</StatLabel>
            <StatNumber fontSize="xl">
              {collection ? (
                <Tooltip
                  label={
                    <Box>
                      <Text m="0">
                        Collected <EthereumIcon colorMode="dark" />
                        <Text as="span" fontWeight="bold">
                          {(
                            (collection.dev_seller_fee_basis_points /
                              100 /
                              100) *
                            collection.stats.total_volume
                          ).toFixed(2)}{' '}
                        </Text>{' '}
                        in royalties
                      </Text>
                      <Text opacity="0.75" mt="1" mb="0" fontSize="xs">
                        Assuming royalty has stayed constant
                      </Text>
                    </Box>
                  }
                  fontSize="sm"
                  hasArrow
                  bg="gray.800"
                  placement="top"
                  color="white"
                  p="2"
                >
                  <Text cursor="default">
                    {collection.dev_seller_fee_basis_points / 100}%
                  </Text>
                </Tooltip>
              ) : (
                <Spinner size="sm" />
              )}
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel mb="1">Age</StatLabel>
            <StatNumber fontSize="xl">
              {collection ? (
                <Tooltip
                  label={`Collection created on ${new Date(
                    collection.created_date,
                  ).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`}
                  fontSize="sm"
                  hasArrow
                  bg="gray.800"
                  placement="top"
                  color="white"
                  p="2"
                >
                  <Text cursor="default">
                    <TimeAgo
                      date={new Date(collection.created_date)}
                      live={false}
                      formatter={(value, unit) =>
                        `${value} ${unit}${value > 1 ? 's' : ''}`
                      }
                    />
                  </Text>
                </Tooltip>
              ) : (
                <Spinner size="sm" />
              )}
            </StatNumber>
          </Stat>
        </HStack>
      </Box>
      <Flex justifyContent="flex-end" width="100%">
        <Button
          as="a"
          ml="-1"
          mt="3"
          size="sm"
          leftIcon={<BellIcon />}
          href={`https://app.nonfungible.tools?create-alert=${collectionSlug}`}
          target="_blank"
          {...useColorModeValue(
            { bg: 'gray.50', border: '1px solid', borderColor: 'gray.200' },
            { bg: 'gray.700', color: 'white' },
          )}
        >
          Create floor alert
        </Button>
      </Flex>
    </Box>
  )
}

export default CollectionStats
