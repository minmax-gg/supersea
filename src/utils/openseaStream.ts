import {
  EventType,
  ItemListedEvent,
  ItemSoldEvent,
  OpenSeaStreamClient,
  // @ts-ignore
} from '@opensea/stream-js'
import { Event } from '../components/Activity/ActivityEvent'
import { Chain } from './api'

class OpenSeaStream extends EventTarget {
  client: OpenSeaStreamClient = new OpenSeaStreamClient({
    token: '2f6f419a083c46de9d83ce3dbe7db601',
  })
  events: Event[] = []
  saleEvents: Event[] = []
  listingEvents: Event[] = []
  activeStreams: Record<string, () => void> = {}

  handleEvent(event: ItemSoldEvent | ItemListedEvent) {
    const [chain, contractAddress, tokenId] = event.payload.item.nft_id.split(
      '/',
    )

    const formattedEvent: Event = {
      listingId: `${event.event_type}:${event.payload.item.nft_id}:${event.sent_at}`,
      tokenId,
      contractAddress,
      chain: chain as Chain,
      name: event.payload.item.metadata.name || `#${tokenId}`,
      image: event.payload.item.metadata.image_url,
      price:
        event.event_type === 'item_sold'
          ? (event as ItemSoldEvent).payload.sale_price
          : (event as ItemListedEvent).payload.base_price,
      currency: event.payload.payment_token.symbol,
      timestamp: event.payload.event_timestamp.split('+')[0],
      eventType: event.event_type === 'item_sold' ? 'SUCCESSFUL' : 'CREATED',
    }

    this.events = [formattedEvent, ...this.events].slice(0, 50)
    if (formattedEvent.eventType === 'SUCCESSFUL') {
      this.saleEvents = [formattedEvent, ...this.saleEvents].slice(0, 50)
    } else {
      this.listingEvents = [formattedEvent, ...this.listingEvents].slice(0, 50)
    }

    this.dispatchEvent(
      new CustomEvent('eventAdded', { detail: formattedEvent }),
    )
  }

  subscribe(collectionSlug: string) {
    this.activeStreams[collectionSlug] = this.client.onEvents(
      collectionSlug,
      [EventType.ITEM_LISTED, EventType.ITEM_SOLD],
      // @ts-ignore
      this.handleEvent.bind(this),
    )
  }

  unsubscribe(collectionSlug: string) {
    this.activeStreams[collectionSlug]()
    delete this.activeStreams[collectionSlug]
  }

  syncActiveStreams(collectionSlugs: string[]) {
    const streamsToAdd = collectionSlugs.filter(
      (slug) => !this.activeStreams[slug],
    )
    const streamsToRemove = Object.keys(this.activeStreams).filter(
      (slug) => !collectionSlugs.includes(slug),
    )
    streamsToAdd.forEach((slug) => this.subscribe(slug))
    streamsToRemove.forEach((slug) => this.unsubscribe(slug))
  }

  getEvents(type: 'ALL' | 'CREATED' | 'SUCCESSFUL') {
    if (type === 'CREATED') return this.listingEvents
    if (type === 'SUCCESSFUL') return this.saleEvents

    return this.events
  }
}

export default new OpenSeaStream()
