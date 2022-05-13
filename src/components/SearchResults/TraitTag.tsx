import { Text, Box, Tag, TagLabel, TagCloseButton } from '@chakra-ui/react'

const TraitTag = ({
  traitJson,
  closeable = false,
  onClickClose = () => {},
}: {
  traitJson: string
  closeable?: boolean
  onClickClose?: () => void
}) => {
  const { groupName, value: name } = JSON.parse(traitJson)

  return (
    <Tag mr="2" mb="2" size="sm" fontSize="xs">
      <Box py="1" pr="0.5">
        <Text
          fontSize="10px"
          fontWeight="600"
          textTransform="uppercase"
          opacity={0.5}
          mb="1px"
        >
          {groupName}
        </Text>
        <TagLabel>{name}</TagLabel>
      </Box>
      {closeable ? <TagCloseButton onClick={onClickClose} /> : null}
    </Tag>
  )
}

export default TraitTag
