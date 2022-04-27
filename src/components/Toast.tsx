import { Box, Text, Icon, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import LogoFlippedSvg from '../assets/logo-flipped.svg'

const Toast = ({
  text,
  type = 'success',
}: {
  text: string
  type?: 'success' | 'error'
}) => {
  const bgs: Record<typeof type, React.ComponentProps<typeof Box>['bg']> = {
    success: useColorModeValue('green.500', 'green.600'),
    error: useColorModeValue('red.500', 'red.700'),
  }

  return (
    <Box
      bg={bgs[type]}
      borderRadius="md"
      px="6"
      pr="14"
      py="2"
      mx="5"
      minWidth="380px"
      position="relative"
      overflow="hidden"
    >
      <Text color="white">{text}</Text>
      <Icon
        as={LogoFlippedSvg as any}
        position="absolute"
        opacity={0.35}
        color="white"
        width="50px"
        height="50px"
        top="50%"
        right="8px"
        transform="translateY(-50%)"
      />
    </Box>
  )
}

export default Toast
