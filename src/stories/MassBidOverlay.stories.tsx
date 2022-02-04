import React from 'react'
import { Story } from '@storybook/react'
import { Center } from '@chakra-ui/react'
import MassBidOverlay from '../components/SearchResults/MassBidOverlay'

export default {
  title: 'MassBidOverlay',
  component: MassBidOverlay,
}

const Template: Story<React.ComponentProps<typeof MassBidOverlay>> = (args) => (
  <Center height="100%">
    <MassBidOverlay {...args} />
  </Center>
)

export const Default = Template.bind({})
Default.args = {}
