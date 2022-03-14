import {
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Switch,
  Tooltip,
  Text,
  TypographyProps,
} from '@chakra-ui/react'
import { FiHelpCircle } from 'react-icons/fi'

export const TraitCountToggle = ({
  excludeTraitCount,
  onToggle,
  fontSize = 'md',
  isDisabled,
}: {
  excludeTraitCount: boolean
  onToggle: (exclude: boolean) => void
  fontSize?: TypographyProps['fontSize']
  isDisabled?: boolean
}) => {
  return (
    <FormControl display="flex" alignItems="center" isDisabled={isDisabled}>
      <FormLabel
        htmlFor="include-trait-count"
        mb="0"
        fontSize={fontSize}
        fontWeight="regular"
      >
        Include Trait Count Score{' '}
        <Tooltip
          label={
            <>
              <Text>
                Enabling trait count score will increase the ranks of items that
                have a rarer number of traits.
              </Text>
              <Text mt="2">
                For example, if most items in a collection have 5 traits, and
                only one has 3 traits, then the item with only 3 traits would
                receive a high score in the trait count category.
              </Text>
            </>
          }
          fontSize="sm"
          hasArrow
          bg="gray.700"
          placement="top"
          color="white"
          px="3"
          py="3"
          mr="2"
          borderRadius="sm"
        >
          <Flex
            height="100%"
            alignItems="center"
            px="2px"
            top="2px"
            position="relative"
            display="inline-flex"
          >
            <Icon as={FiHelpCircle} />
          </Flex>
        </Tooltip>
      </FormLabel>
      <Switch
        mt="1"
        id="include-trait-count"
        isChecked={!excludeTraitCount}
        onChange={(e) => onToggle(!e.target.checked)}
        isDisabled={isDisabled}
      />
    </FormControl>
  )
}
