type WyvernListing = {
  current_price: string
  base_price: string
  payment_token_contract: {
    symbol: 'ETH' | 'WETH'
  }
}

type SeaportListing = {
  current_price: string
  order_type: string
}

type NormalizedListing = {
  price: string
  currency: 'ETH' | 'WETH'
}

export const getCheapestListing = (
  wyvernListings: WyvernListing[] | undefined | null,
  seaportListings: SeaportListing[] | undefined | null,
) => {
  const listings = [
    ...(wyvernListings || []).map((listing: any) => ({
      ...listing,
      protocol: 'wyvern',
    })),
    ...(seaportListings || []).map((listing: any) => ({
      ...listing,
      protocol: 'seaport',
    })),
  ].sort((a, b) => Number(a.current_price) - Number(b.current_price))

  return listings[0]
}

export const normalizeListing = (listing: WyvernListing | SeaportListing) => {
  if (!listing) return null

  const currency = (() => {
    if ((listing as WyvernListing).payment_token_contract?.symbol === 'WETH')
      return 'WETH'
    if ((listing as SeaportListing).order_type !== 'basic') return 'WETH'
    return 'ETH'
  })()

  return {
    price: (listing as WyvernListing).base_price || listing.current_price,
    currency,
  } as NormalizedListing
}
