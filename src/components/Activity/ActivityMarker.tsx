import { memo } from 'react'
import { Box, Flex } from '@chakra-ui/react'

const ActivityMarker = memo(
  ({ newCount }: { newCount: number }) => {
    return (
      <Flex
        alignItems="center"
        width="100%"
        animation="SuperSea__FadeOut 5s ease both"
        height="0px"
        position="relative"
        top="-6px"
      >
        <Box height="1px" width="100%" bg="blue.400" />
        <Box
          color="white"
          bg="blue.400"
          borderRadius="md"
          py="2px"
          px="4px"
          fontSize="9px"
          fontWeight="semibold"
          textTransform="uppercase"
          whiteSpace="nowrap"
          ml="1"
        >
          +{newCount}
        </Box>
      </Flex>
    )
  },
  () => true,
)

export default ActivityMarker
