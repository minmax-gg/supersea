import { Tag, useColorModeValue, Spinner, Text } from '@chakra-ui/react'
import { CheckIcon, CloseIcon, ArrowRightIcon } from '@chakra-ui/icons'
import { motion } from 'framer-motion'

export type MassBidState =
  | 'PROCESSING'
  | 'SIGNED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED'

const MassBidStatus = ({ state }: { state: MassBidState }) => {
  const spinnerColor = useColorModeValue('gray.500', 'white')
  const backgroundColors = useColorModeValue(
    {
      PROCESSING: 'gray.100',
      SIGNED: 'gray.100',
      COMPLETED: 'green.400',
      FAILED: 'red.400',
      SKIPPED: 'orange.400',
    },
    {
      PROCESSING: 'gray.500',
      SIGNED: 'gray.500',
      COMPLETED: 'green.500',
      FAILED: 'red.500',
      SKIPPED: 'orange.500',
    },
  )
  const isCompletedState = state !== 'PROCESSING' && state !== 'SIGNED'
  return (
    <motion.div
      style={{ pointerEvents: 'none' }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        y: {
          type: 'spring',
          stiffness: 400,
          damping: 15,
        },
        default: { duration: 0.1 },
      }}
      initial={{
        y: -10,
        opacity: 0,
      }}
    >
      <motion.div
        animate={{
          y: isCompletedState ? [0, -2, 0] : 0,
        }}
        transition={{ duration: 0.15 }}
        initial={false}
      >
        <Tag
          size="sm"
          bg={backgroundColors[state]}
          fontSize="11px"
          boxShadow={useColorModeValue(
            '0 1px 2px rgba(0, 0, 0, 0.05)',
            '0 1px 2px rgba(0, 0, 0, 0.075)',
          )}
        >
          {(state === 'PROCESSING' || state === 'SIGNED') && (
            <Text>
              <Spinner
                color={spinnerColor}
                width="8px"
                height="8px"
                mr="5px"
                verticalAlign="middle"
                position="relative"
                top="-1px"
              />
              {state === 'PROCESSING' ? 'Signing' : 'Bidding'}
            </Text>
          )}
          {state === 'COMPLETED' && (
            <Text color="white">
              <CheckIcon
                color="white"
                width="8px"
                height="auto"
                mr="5px"
                position="relative"
                top="-1px"
              />
              Bid Placed
            </Text>
          )}
          {state === 'FAILED' && (
            <Text color="white">
              <CloseIcon
                color="white"
                width="8px"
                height="auto"
                mr="5px"
                position="relative"
                top="-1px"
              />
              Failed
            </Text>
          )}{' '}
          {state === 'SKIPPED' && (
            <Text color="white">
              <ArrowRightIcon
                color="white"
                width="8px"
                height="auto"
                mr="5px"
                position="relative"
                top="-1px"
              />
              Skipped
            </Text>
          )}
        </Tag>
      </motion.div>
    </motion.div>
  )
}

export default MassBidStatus
