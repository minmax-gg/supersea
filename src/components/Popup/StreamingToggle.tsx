import {
  Switch,
  FormControl,
  FormHelperText,
  FormLabel,
  Tag,
} from '@chakra-ui/react'

const StreamingToggle = ({
  isChecked,
  onChange,
  ...rest
}: {
  isChecked: boolean
  onChange: (isChecked: boolean) => void
} & Omit<React.ComponentProps<typeof FormControl>, 'onChange'>) => {
  return (
    <FormControl {...rest}>
      <FormLabel htmlFor="quick-buy" fontSize="sm">
        Enable Streaming API{' '}
        <Tag ml="1" mt="-1px">
          Experimental
        </Tag>
      </FormLabel>
      <Switch
        id="quick-buy"
        isChecked={isChecked}
        onChange={() => {
          onChange(!isChecked)
        }}
      />
      <FormHelperText color="gray.400" lineHeight="1.35em">
        Use OpenSea's new streaming API to fetch listings and sales in the
        Activity modal. This should result in faster updates without any rate
        limiting, but may break occasionally due to the API still being in beta.
      </FormHelperText>
    </FormControl>
  )
}

export default StreamingToggle
