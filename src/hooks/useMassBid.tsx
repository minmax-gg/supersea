import { useToast } from '@chakra-ui/toast'
import { useEffect, useRef, useState } from 'react'
import Toast from '../components/Toast'
import { Asset, fetchOffers } from '../utils/api'
import { MassBidState } from '../components/SearchResults/MassBidStatus'

const DEFAULT_MASS_BID_PROCESS: {
  processNumber: number
  processingIndex: number
  status: 'idle' | 'processing' | 'stopped'
} = {
  processingIndex: -1,
  processNumber: 0,
  status: 'idle',
}

const useMassBid = ({
  tokens,
}: {
  tokens: { asset: Asset | null; tokenId: string }[]
}) => {
  const massBidProcessRef = useRef({ ...DEFAULT_MASS_BID_PROCESS })

  const [massBid, setMassBid] = useState<{
    price: number
    expirationTime: number
    skipOnHigherOffer: boolean
    currentIndex: number
  } | null>(null)
  const [massBidStates, setMassBidStates] = useState<
    Record<string, MassBidState>
  >({})

  const toast = useToast()

  useEffect(() => {
    if (
      !massBid ||
      massBidProcessRef.current.processingIndex === massBid.currentIndex ||
      massBidProcessRef.current.status !== 'idle'
    ) {
      return
    }
    massBidProcessRef.current = {
      processNumber: massBidProcessRef.current.processNumber,
      processingIndex: massBid.currentIndex,
      status: 'processing',
    }

    const asset = tokens[massBid.currentIndex].asset
    const processNumber = massBidProcessRef.current.processNumber

    // Listen for errors, unsubscribe
    const messageListener = (event: any) => {
      let state: MassBidState | null = null
      let initializeNext = false
      if (event.data.params?.tokenId !== asset!.token_id) {
        return
      }

      if (event.data.method === 'SuperSea__Bid__Error') {
        if (/declined to authorize/i.test(event.data.params.error.message)) {
          state = 'SKIPPED'
          initializeNext = true
        } else if (
          /insufficient balance/i.test(event.data.params.error.message)
        ) {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={`You don't have enough WETH to place this bid. Make sure to wrap some first.`}
                type="error"
              />
            ),
          })
          state = 'FAILED'
          massBidProcessRef.current.status = 'stopped'
        } else {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={`Unable to place bid on item, will retry. Received error "${event.data.params.error.message}"`}
                type="error"
              />
            ),
          })
          console.log(event.data.params.error)
          state = 'RETRYING'
        }
      } else if (event.data.method === 'SuperSea__Bid__Skipped') {
        state = event.data.params.reason === 'outbid' ? 'OUTBID' : 'SKIPPED'
        initializeNext = true
      } else if (event.data.method === 'SuperSea__Bid__Signed') {
        state = 'SIGNED'
      } else if (event.data.method === 'SuperSea__Bid__Success') {
        state = 'COMPLETED'
        initializeNext = true
      }
      if (!state) return
      if (
        massBid.currentIndex === tokens.length - 1 ||
        massBidProcessRef.current.status === 'stopped' ||
        massBidProcessRef.current.processNumber !== processNumber
      ) {
        initializeNext = false
      }
      if (initializeNext) {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
          [tokens[massBid.currentIndex + 1].tokenId]: 'PROCESSING',
        }))
        massBidProcessRef.current.status = 'idle'
        setMassBid({
          ...massBid,
          currentIndex: massBid.currentIndex + 1,
        })
      } else if (state === 'RETRYING') {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
        }))
        massBidProcessRef.current.status = 'idle'
        massBidProcessRef.current.processingIndex = -1
        setMassBid({
          ...massBid,
        })
      } else {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
        }))
      }
      if (state !== 'SIGNED') {
        window.removeEventListener('message', messageListener)
      }
    }

    ;(async () => {
      let offers: any[] = []

      if (massBid.skipOnHigherOffer) {
        const res = await fetchOffers(
          asset!.asset_contract.address,
          asset!.token_id,
        )
        offers = res.offers
      }

      window.addEventListener('message', messageListener)
      window.postMessage({
        method: 'SuperSea__Bid',
        params: {
          asset,
          offers,
          tokenId: asset?.token_id,
          address: asset?.asset_contract.address,
          price: massBid.price,
          expirationTime: massBid.expirationTime,
        },
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [massBid, tokens])

  return {
    massBidStates,
    isMassBidding: Boolean(massBid),
    startMassBid: ({
      price,
      expirationTime,
      skipOnHigherOffer,
    }: {
      price: number
      expirationTime: number
      skipOnHigherOffer: boolean
    }) => {
      massBidProcessRef.current = {
        processingIndex: -1,
        processNumber: massBidProcessRef.current.processNumber + 1,
        status: 'idle',
      }
      setMassBidStates({
        [tokens[0].tokenId]: 'PROCESSING',
      })
      setMassBid({
        price,
        skipOnHigherOffer,
        expirationTime,
        currentIndex: 0,
      })
    },
    stopMassBid: () => {
      massBidProcessRef.current.status = 'stopped'
      setMassBid(null)
    },
    clearMassBid: () => {
      setMassBid(null)
      setMassBidStates({})
      massBidProcessRef.current = { ...DEFAULT_MASS_BID_PROCESS }
    },
  }
}

export default useMassBid
