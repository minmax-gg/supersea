import React from 'react'
import { Story } from '@storybook/react'
import { Center, Box } from '@chakra-ui/react'

import SearchAsset from '../components/SearchResults/SearchAsset'

export default {
  title: 'SearchAsset',
  component: SearchAsset,
}

const Template: Story<React.ComponentProps<typeof SearchAsset>> = (args) => (
  <Center height="100%">
    <Box width="200px">
      <SearchAsset {...args} />
    </Box>
  </Center>
)

export const Default = Template.bind({})
Default.args = {
  address: '0x1a92f7381b9f03921564a437210bb9396471050c',
  tokenId: '2288',
  asset: {
    id: 15,
    token_id: '2288',
    asset_contract: {
      address: '0x1a92f7381b9f03921564a437210bb9396471050c',
      image_url: '',
    },
    name: 'Cool Cat #2288',
    collection: {
      name: 'Cool Cats NFT',
    },
    image_url:
      'https://lh3.googleusercontent.com/Z1Ij5TLaq5I0Ts3bhJxChGXfyN92IqbVAkSvb7ZUyFMLJx_t3Y8OJAvcBfhADE34nUN7JUbJeeFa4hBmRMjw7w1r3pJXlvMK8Dgz=w600',
    sell_orders: [
      {
        current_price: '500',
        base_price: '500',
        payment_token_contract: {
          symbol: 'ETH',
        },
      },
    ],
  },
}
