import React from 'react'
import { Story } from '@storybook/react'
import { Center } from '@chakra-ui/react'

import CollectionStats from '../components/CollectionStats'

export default {
  title: 'CollectionStats',
  component: CollectionStats,
}

const Template: Story<React.ComponentProps<typeof CollectionStats>> = (
  args,
) => (
  <Center height="100%">
    <CollectionStats {...args} />
  </Center>
)

export const Default = Template.bind({})
Default.args = {
  collectionSlug: 'cool-cats-nft',
}
