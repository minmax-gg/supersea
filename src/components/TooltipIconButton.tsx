import { IconButton, Tooltip } from '@chakra-ui/react'
import React from 'react'

const TooltipIconButton = (
  props: React.ComponentProps<typeof IconButton> & { label: string },
) => {
  return (
    <Tooltip
      label={props.label}
      fontSize="xs"
      hasArrow
      bg="gray.800"
      placement="top"
      color="white"
      px="2"
      py="1"
    >
      <IconButton {...props} />
    </Tooltip>
  )
}

export default TooltipIconButton
