import { Button, Tooltip, Text, Box } from '@chakra-ui/react'
import Logo from '../Logo'

const ReplacementNotice = () => {
  return (
    <Tooltip
      label={
        <Text>
          The functionality of the Listing Notifier has been replaced by the
          Activity view, found in the top header menu.
        </Text>
      }
      fontSize="sm"
      hasArrow
      bg="gray.700"
      placement="top"
      color="white"
      px="5"
      py="1"
      borderRadius="sm"
    >
      <Box cursor="not-allowed" display="inline-block">
        <Button
          rightIcon={<Logo width="20px" height="20px" flipped color="white" />}
          color="white"
          iconSpacing="3"
          bg="blue.500"
          _hover={{ bg: 'blue.400' }}
          _active={{ bg: 'blue.300' }}
          pointerEvents="none"
          opacity="0.5"
        >
          Listing Notifiers
        </Button>
      </Box>
    </Tooltip>
  )
}

export default ReplacementNotice
