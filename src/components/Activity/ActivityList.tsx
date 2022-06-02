import React, { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { Box, Flex, VStack, Icon, Text } from '@chakra-ui/react'
import { MdPause } from 'react-icons/md'
import ActivityMarker from './ActivityMarker'

const ActivityList = <T extends { listingId: string }>({
  items,
  renderItem,
  contentKey,
}: {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  contentKey: string
}) => {
  const markersRef = useRef<Record<string, boolean>>({})
  const [hovering, setHovering] = useState(false)
  const [itemsSnapshot, setItemsSnapshot] = useState<T[]>(items)

  const displayedItems = hovering ? itemsSnapshot : items

  useEffect(() => {
    if (!displayedItems[0]) return
    markersRef.current[displayedItems[0].listingId] = true
  }, [displayedItems])

  useLayoutEffect(() => {
    markersRef.current = {}
  }, [contentKey])

  let markerIndex = displayedItems.findIndex(
    (item, index) => markersRef.current[item.listingId] && index !== 0,
  )

  return (
    <VStack
      alignItems="flex-start"
      width="100%"
      spacing="11px"
      onMouseEnter={() => {
        setHovering(true)
        setItemsSnapshot(items)
      }}
      onMouseLeave={() => {
        setHovering(false)
      }}
      position="relative"
    >
      <Flex
        position="absolute"
        bottom="100%"
        pointerEvents="none"
        justifyContent="center"
        width="100%"
        mb="38px"
      >
        <Flex
          background="blue.500"
          color="white"
          py="1"
          px="3"
          borderRadius="full"
          fontSize="sm"
          fontWeight="semibold"
          transition="all 225ms ease"
          opacity={hovering ? 1 : 0}
          transform={
            hovering ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.9)'
          }
          alignItems="center"
        >
          <Icon as={MdPause} mr="1" />
          <Text as="span">Paused on hover</Text>
        </Flex>
      </Flex>
      {displayedItems.map((item, index) => {
        return (
          <Box key={item.listingId} width="100%">
            {index !== 0 && markersRef.current[item.listingId] ? (
              <Box
                width="100%"
                animation="SuperSea__ActivityItemAppear 625ms ease both"
              >
                <ActivityMarker newCount={index} />
              </Box>
            ) : null}
            <Box
              width="100%"
              animation={
                index < markerIndex
                  ? 'SuperSea__ActivityItemAppear 625ms ease both'
                  : undefined
              }
            >
              {renderItem(item)}
            </Box>
          </Box>
        )
      })}
    </VStack>
  )
}

export default ActivityList
