import { LockIcon } from '@chakra-ui/icons'
import { Link, HStack, Box, Tag, useColorModeValue } from '@chakra-ui/react'
import React from 'react'

const LockedFeature = ({
  level = 'subscriber',
  linkProps = {},
  ...tagProps
}: {
  level?: 'subscriber' | 'founder'
  linkProps?: React.ComponentProps<typeof Link>
} & React.ComponentProps<typeof Tag>) => {
  return (
    <Link
      href="https://nonfungible.tools/connect"
      target="_blank"
      _hover={{ textDecoration: 'none' }}
      {...linkProps}
    >
      <Tag
        bg={useColorModeValue(
          level === 'founder' ? 'orange.200' : 'blue.200',
          level === 'founder' ? 'orange.500' : 'blue.500',
        )}
        size="sm"
        px="4px"
        pointerEvents="none"
        {...tagProps}
      >
        <HStack spacing="2px">
          <LockIcon height="10px" mt="-1px" />
          <Box>{level === 'subscriber' ? 'Member' : 'Founding Member'}</Box>
        </HStack>
      </Tag>
    </Link>
  )
}
export default LockedFeature
