import { useState } from 'react'
import { Alert, AlertIcon, Button, HStack, Text } from '@chakra-ui/react'
import { StoredActivityState } from '../../utils/extensionConfig'

const getCollectionSummary = (
  collections: StoredActivityState['collections'],
) => {
  if (collections.length === 0) return ''
  let collectionNames = collections.map((c) => c.name)
  if (collectionNames.length > 3) {
    collectionNames = collectionNames.slice(0, 3)
    collectionNames.push('...')
  }
  return `(${collectionNames.join(', ')})`
}

const StateRestore = ({
  collections,
  notifiers,
  onDiscard,
  onRestore,
}: {
  collections: StoredActivityState['collections']
  notifiers: StoredActivityState['notifiers']
  onDiscard: () => void
  onRestore: () => void
}) => {
  const [loading, setLoading] = useState(false)

  return (
    <Alert status="info" borderRadius="md">
      <AlertIcon />
      <Text>
        Found a previous activity configuration with {collections.length}{' '}
        watched collection{collections.length === 1 ? '' : 's'}{' '}
        {getCollectionSummary(collections)}
        {notifiers.length
          ? ` and ${notifiers.length}
        listing alert${notifiers.length === 1 ? '' : 's'}`
          : ''}
        . Would you like to restore{' '}
        {collections.length + notifiers.length > 1 ? 'them' : 'it'}?
      </Text>
      <HStack justify="flex-end" spacing="2" pl="5">
        <Button onClick={onDiscard} disabled={loading}>
          Discard
        </Button>
        <Button
          color="white"
          bg="blue.500"
          _hover={{ bg: 'blue.400' }}
          _active={{ bg: 'blue.300' }}
          onClick={() => {
            setLoading(true)
            onRestore()
          }}
          isLoading={loading}
        >
          Restore
        </Button>
      </HStack>
    </Alert>
  )
}

export default StateRestore
