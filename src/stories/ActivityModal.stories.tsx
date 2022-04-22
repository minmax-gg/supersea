import React, { useEffect, useState } from 'react'
import { Story } from '@storybook/react'
import _ from 'lodash'
import { Center } from '@chakra-ui/react'

import ActivityModal from '../components/Activity/ActivityModal'
import { Event } from '../components/Activity/ActivityEvent'

export default {
  title: 'ActivityModal',
  component: ActivityModal,
}

const DEFAULT_EVENTS = [
  {
    listingId: '1',
    tokenId: '100',
    contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
    chain: 'ethereum',
    name: 'Cool Cat #100',
    image:
      'https://lh3.googleusercontent.com/C7ZN75ly1rxvZ_LpRlfm5Q6GD5lbedmfubhmGHIvUxXawh7-nhXKvl_UIvOjuYrWFPmiYbr4wJn4hA1WRUbYXBiakSFuKLhZth2smvY=w600',
    price: '10000000000000000000',
    currency: 'ETH',
    timestamp: new Date().toISOString().replace('Z', ''),
    eventType: 'CREATED',
  },
  {
    listingId: '2',
    tokenId: '200',
    contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
    chain: 'ethereum',
    name: 'Cool Cat #200',
    image:
      'https://lh3.googleusercontent.com/Nim5ISaX8Kc9sAQ_WjyEXh5Vl87yWPnXbbmCAwFADwH8gbIZwtrc__57W7V6MK7E-1CUWVWvqSTsP5xKqEQEGb9ukT0X9jLv6h1nWw=w600',
    price: '15000000000000000000',
    currency: 'ETH',
    timestamp: new Date().toISOString().replace('Z', ''),
    eventType: 'CREATED',
  },
  {
    listingId: '3',
    tokenId: '300',
    contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
    chain: 'ethereum',
    name: 'Cool Cat #200',
    image:
      'https://lh3.googleusercontent.com/DFn2OdxeVZtbmXpaXBf8m3eobkjrzryaetfr7q3T8KPrg04ssOmfi3zHSSVh8yQ0XruqFq4qRzdc4Dj4uz6cPZb6p77FMVXnYHLWPQ=w600',
    price: '12500000000000000000',
    currency: 'ETH',
    timestamp: new Date().toISOString().replace('Z', ''),
    eventType: 'SUCCESSFUL',
  },
] as Event[]

const Template: Story<
  React.ComponentProps<typeof ActivityModal> & { simulateActivity: boolean }
> = (args) => {
  const [events, setEvents] = useState(args.events)

  useEffect(() => {
    if (!args.simulateActivity) return
    const interval = setInterval(() => {
      setEvents((e) => {
        const newEvents = _.times(_.random(1, 5), (index) => {
          const newEvent = { ..._.sample(DEFAULT_EVENTS) } as Event
          newEvent.listingId = `${e.length + 1 + index}`
          return newEvent
        })
        return [...newEvents, ...e]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [args.simulateActivity])

  return (
    <Center height="100%">
      <ActivityModal {...args} events={events} />
    </Center>
  )
}

export const Default = Template.bind({})
Default.args = {
  isOpen: true,
  events: DEFAULT_EVENTS,
  matchedAssets: [
    {
      listingId: '1',
      tokenId: '100',
      contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
      chain: 'ethereum',
      name: 'Cool Cat #100',
      image:
        'https://lh3.googleusercontent.com/C7ZN75ly1rxvZ_LpRlfm5Q6GD5lbedmfubhmGHIvUxXawh7-nhXKvl_UIvOjuYrWFPmiYbr4wJn4hA1WRUbYXBiakSFuKLhZth2smvY=w600',
      price: '10000000000000000000',
      currency: 'ETH',
      timestamp: new Date().toISOString().replace('Z', ''),
      notifier: {
        id: '1',
      },
    },
  ],
  status: 'STARTING',
  pollInterval: 2,
  collections: [
    {
      name: 'Cool Cats NFT',
      slug: 'cool-cats-nft',
      imageUrl:
        'https://lh3.googleusercontent.com/LIov33kogXOK4XZd2ESj29sqm_Hww5JSdO7AFn5wjt8xgnJJ0UpNV9yITqxra3s_LMEW1AnnrgOVB_hDpjJRA1uF4skI5Sdi_9rULi8=s130',
      contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
      rarities: {
        tokenRank: {},
        noTraitCountTokenRank: {},
        tokenCount: 0,
        isRanked: false,
        traits: [],
      },
    },
    {
      name: 'Bad Bunnies NFT',
      slug: 'bad-bunnies-nft',
      imageUrl:
        'https://lh3.googleusercontent.com/tN2L7innajqWjmO_hHT4N2cydu3FLacoaHEXmZKJ_q1Xk2CCPDbYeTx91ytTQOuz33AVqjC_HBUd5L7XSxQnzIdqJF7mPd4hptRJF3M=s130',
      contractAddress: '0x103ffe3aee66a048e22821145a00c4cabc0ff05b',
      rarities: {
        tokenRank: {},
        noTraitCountTokenRank: {},
        tokenCount: 0,
        isRanked: false,
        traits: [],
      },
    },
  ],
  activeCollectionSlug: 'wonderpals',
  notifiers: [
    {
      id: '1',
      collection: {
        name: 'Cool Cats NFT',
        slug: 'cool-cats-nft',
        imageUrl:
          'https://lh3.googleusercontent.com/LIov33kogXOK4XZd2ESj29sqm_Hww5JSdO7AFn5wjt8xgnJJ0UpNV9yITqxra3s_LMEW1AnnrgOVB_hDpjJRA1uF4skI5Sdi_9rULi8=s130',
        contractAddress: '0x1a92f7381b9f03921564a437210bb9396471050c',
        rarities: {
          tokenRank: {},
          noTraitCountTokenRank: {},
          tokenCount: 0,
          isRanked: false,
          traits: [],
        },
      },
      minPrice: null,
      maxPrice: 15,
      lowestRarity: 'Rare',
      lowestRankNumber: null,
      includeAuctions: false,
      traits: ['{"value": "faceface", "groupName": "face"}'],
      autoQuickBuy: true,
      gasOverride: { fee: 300, priorityFee: 25 },
      tokenEligibilityMap: {},
    },
  ],
}

export const SimulatedActivity = Template.bind({})
SimulatedActivity.args = { ...Default.args, simulateActivity: true }
