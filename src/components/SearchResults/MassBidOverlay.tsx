import ScopedCSSPortal from '../ScopedCSSPortal'
import { Box, Flex, Button, Text, useTheme } from '@chakra-ui/react'

const MassBidOverlay = ({ onStop }: { onStop: () => void }) => {
  const theme = useTheme()
  return (
    <ScopedCSSPortal>
      <Flex
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex="999999"
        boxShadow={`inset 0 0 0 8px ${theme.colors.blue['500']}`}
        alignItems="flex-end"
        justifyContent="center"
        pb="8"
        cursor="not-allowed"
      >
        <Flex
          boxShadow="0 0 10px rgba(0, 0, 0, 0.05)"
          width="400px"
          py="3"
          px="4"
          borderRadius="md"
          alignItems="center"
          cursor="auto"
          color="white"
          bg="blue.600"
        >
          <Box flex="1">
            <Text fontWeight="bold">Mass Bidding</Text>
            <Text fontSize="14px">
              Bids need to be signed one by one in MetaMask. You can reject a
              signature request to skip to the next item.
            </Text>
          </Box>
          <Button
            color="white"
            bg="blue.700"
            _hover={{ bg: 'blue.500' }}
            _active={{ bg: 'blue.800' }}
            mr="2"
            onClick={onStop}
          >
            Stop
          </Button>
        </Flex>
      </Flex>
    </ScopedCSSPortal>
  )
}

export default MassBidOverlay
