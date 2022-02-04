import { OpenSeaPort, Network, orderFromJSON, assetFromJSON } from 'opensea-js'
import { OrderSide } from 'opensea-js/lib/types'
import { RateLimit } from 'async-sema'
import { readableEthValue } from './utils/ethereum'
;((window: any) => {
  // Restore console for debugging
  // const i = document.createElement('iframe')
  // i.style.display = 'none'
  // document.body.appendChild(i)
  // window.console = (i.contentWindow as any).console

  const getEthAccount = async () => {
    const eth = (window as any).ethereum
    if (!eth) return null
    if (eth.selectedAddress) return eth.selectedAddress
    let accounts = await eth.request({ method: 'eth_accounts' })
    if (!accounts?.length) {
      accounts = await eth.request({
        method: 'eth_requestAccounts',
      })
    }
    if (accounts?.length) return accounts[0]
    return null
  }

  const bidRateLimit = RateLimit(1 / 3, { uniformDistribution: true })

  window.addEventListener('message', async (event: any) => {
    if (event.origin !== 'https://opensea.io') return
    if (event.data.method === 'SuperSea__Buy') {
      try {
        const order = event.data.params.asset.orders.filter(
          (order: any) => order.side === OrderSide.Sell,
        )[0]
        const seaport = new OpenSeaPort((window as any).ethereum, {
          networkName: Network.Main,
        })
        seaport.gasIncreaseFactor = 1.3
        const _sendTransactionAsync =
          // @ts-ignore
          seaport._wyvernProtocol.wyvernExchange.atomicMatch_
            .sendTransactionAsync

        if (event.data.params.gasPreset) {
          // @ts-ignore
          seaport._wyvernProtocol.wyvernExchange.atomicMatch_.sendTransactionAsync = (
            ...args: any
          ) => {
            args[args.length - 1].maxPriorityFeePerGas = (
              event.data.params.gasPreset.priorityFee *
              10 ** 9
            ).toString(16)
            args[args.length - 1].maxFeePerGas = (
              event.data.params.gasPreset.fee *
              10 ** 9
            ).toString(16)
            return _sendTransactionAsync.apply(
              (seaport as any)._wyvernProtocol.wyvernExchange.atomicMatch_,
              args,
            )
          }
        }
        if (
          event.data.params.displayedPrice &&
          Number(order.base_price) > Number(event.data.params.displayedPrice)
        ) {
          throw new Error(
            `Transaction cancelled due to price change, the actual price was ${readableEthValue(
              order.base_price,
            )} ETH`,
          )
        }
        await seaport.fulfillOrder({
          order: orderFromJSON(order),
          accountAddress: await getEthAccount(),
        })
        window.postMessage({
          method: 'SuperSea__Buy__Success',
          params: { ...event.data.params },
        })
      } catch (error: any) {
        console.error(error)
        window.postMessage({
          method: 'SuperSea__Buy__Error',
          params: { ...event.data.params, error },
        })
      }
    } else if (event.data.method === 'SuperSea__Bid') {
      try {
        await bidRateLimit()
        const seaport = new OpenSeaPort((window as any).ethereum, {
          networkName: Network.Main,
          apiKey: '2f6f419a083c46de9d83ce3dbe7db601',
        })

        const validateAndPostOrder = seaport.validateAndPostOrder.bind(seaport)
        seaport.validateAndPostOrder = async (orderWithSignature) => {
          window.postMessage({
            method: 'SuperSea__Bid__Signed',
            params: { ...event.data.params },
          })
          return validateAndPostOrder(orderWithSignature)
        }

        const getAsset = seaport.api.getAsset.bind(seaport)
        seaport.api.getAsset = async (asset) => {
          if (asset.tokenId === event.data.params.tokenId) {
            return assetFromJSON(event.data.params.asset)
          }
          return getAsset(asset)
        }

        await seaport.createBuyOrder({
          asset: {
            tokenId: event.data.params.tokenId,
            tokenAddress: event.data.params.address,
          },
          accountAddress: await getEthAccount(),
          startAmount: event.data.params.price,
          expirationTime: event.data.params.expirationTime,
        })
        window.postMessage({
          method: 'SuperSea__Bid__Success',
          params: { ...event.data.params },
        })
      } catch (error: any) {
        console.error(error)
        window.postMessage({
          method: 'SuperSea__Bid__Error',
          params: { ...event.data.params, error },
        })
      }
    } else if (event.data.method === 'SuperSea__Navigate') {
      window.next.router.push(
        event.data.params.url,
        event.data.params.as,
        event.data.params.options,
      )
    } else if (event.data.method === 'SuperSea__GetEthAddress') {
      window.postMessage({
        method: 'SuperSea__GetEthAddress__Success',
        params: {
          ethAddress: await getEthAccount(),
        },
      })
    }
  })

  if (window.next && window.next.router) {
    window.next.router.events.on('routeChangeComplete', (url: string) => {
      window.postMessage({
        method: 'SuperSea__Next__routeChangeComplete',
        params: { url: url, scrollY: window.scrollY },
      })
    })
    window.next.router.events.on('routeChangeStart', (url: string) => {
      window.postMessage({
        method: 'SuperSea__Next__routeChangeStart',
        params: { url: url, scrollY: window.scrollY },
      })
    })
  }
})(window)
