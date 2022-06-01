import React from 'react'
import { Story } from '@storybook/react'
import { Center } from '@chakra-ui/react'

import Filters from '../components/SearchResults/Filters'

export default {
  title: 'Filters',
  component: Filters,
}

const Template: Story<React.ComponentProps<typeof Filters>> = (args) => (
  <Center height="100%">
    <Filters {...args} />
  </Center>
)

export const Default = Template.bind({})
Default.args = {
  filters: {
    status: [],
    priceRange: [undefined, undefined],
    includedIds: null,
    includedRanks: null,
    rarityOrder: 'desc',
    traits: [],
  },
  showSearchProgress: false,
  searchNumber: 0,
  onApplyFilters: () => {},
}
