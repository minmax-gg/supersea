import { IconButton, Tooltip } from '@chakra-ui/react'
import React from 'react'

const TooltipIconButton = (
  props: Omit<React.ComponentProps<typeof IconButton>, 'aria-label'> & {
    label: string
  },
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
      <IconButton {...props} aria-label={props.label} />
    </Tooltip>
  )
}

export default TooltipIconButton
