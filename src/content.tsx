import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'
import queryString from 'query-string'
import AppProvider from './components/AppProvider'
import BundleVerification from './components/BundleVerification'
import AssetInfo from './components/AssetInfo/AssetInfo'
import ProfileSummary from './components/ProfileSummary'
import GlobalStyles from './components/GlobalStyles'
import RarityDisclaimer from './components/RarityDisclaimer'
import { getExtensionConfig } from './utils/extensionConfig'
import { fetchGlobalCSS, fetchRemoteConfig, getUser } from './utils/api'
import { injectElement, selectElement, Selectors } from './utils/selector'
import SearchResults from './components/SearchResults/SearchResults'
import CollectionMenuItem from './components/CollectionMenuItem'
import Activity from './components/Activity/Activity'
import TransferInfo from './components/TransferInfo'
import { isSubscriber } from './utils/user'
import { createRouteParams } from './utils/route'
import ReplacementNotice from './components/Activity/ReplacementNotice'

const NODE_PROCESSED_DATA_KEY = '__SuperSea__Processed'

const addGlobalStyle = () => {
  const globalContainer = document.createElement('div')
  document.body.appendChild(globalContainer)
  injectReact(<GlobalStyles />, globalContainer)
  fetchGlobalCSS().then((css) => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  })
}

const injectAssetInfo = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()

  const gridNodes = Array.from(
    document.querySelectorAll(selectors.assetInfo.grid.node.selector),
  )
  const listNodes = Array.from(
    document.querySelectorAll(selectors.assetInfo.list.node.selector),
  )
  const itemNode = document.querySelector(
    selectors.assetInfo.item.node.selector,
  )
  const sellNode = document.querySelector(
    selectors.assetInfo.sell.node.selector,
  )

  const nodes = [
    ...gridNodes.map((node) => ({
      node,
      type: 'grid',
      selectorConfig: selectors.assetInfo.grid,
    })),
    ...listNodes.map((node) => ({
      node,
      type: 'list',
      selectorConfig: selectors.assetInfo.list,
    })),
    ...(itemNode
      ? [
          {
            node: itemNode,
            type: 'item',
            selectorConfig: selectors.assetInfo.item,
          },
        ]
      : []),
    ...(sellNode
      ? [
          {
            node: sellNode,
            type: 'sell',
            selectorConfig: selectors.assetInfo.sell,
          },
        ]
      : []),
  ] as {
    node: HTMLElement
    type: React.ComponentProps<typeof AssetInfo>['type']
    selectorConfig: Selectors['assetInfo'][keyof Selectors['assetInfo']]
  }[]

  nodes.forEach(({ node, type, selectorConfig }) => {
    if (node.dataset[NODE_PROCESSED_DATA_KEY]) return
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'

    const { address, tokenId, chain, collectionSlug } = (() => {
      let collectionSlug = (() => {
        let collectionLink = selectElement(node, selectorConfig.collectionLink)
        if (collectionLink) {
          return (
            (collectionLink
              .getAttribute('href')
              ?.split('/')
              .filter((s) => s.length)
              .slice(-1) || [])[0] || ''
          )
        }
        return ''
      })()

      if (type === 'item') {
        const path = window.location.pathname.split('/')
        const [tokenType, address, tokenId] = path.slice(-3)
        return {
          address: address.toLowerCase(),
          tokenId: tokenId,
          collectionSlug,
          chain:
            tokenType === 'matic'
              ? ('polygon' as const)
              : ('ethereum' as const),
        }
      }
      if (type === 'sell') {
        const path = window.location.pathname.split('/')
        const [tokenType, address, tokenId] = path.slice(-4, -1)
        return {
          address: address.toLowerCase(),
          tokenId: tokenId,
          collectionSlug,
          chain:
            tokenType === 'matic'
              ? ('polygon' as const)
              : ('ethereum' as const),
        }
      }

      let link = selectElement(node, selectorConfig.link)
      if (link) {
        const [tokenType, address, tokenId] =
          link
            .getAttribute('href')
            ?.split('/')
            .filter((s) => s.length)
            .slice(-3) || []

        return {
          address,
          tokenId,
          collectionSlug,
          chain:
            tokenType === 'matic'
              ? ('polygon' as const)
              : ('ethereum' as const),
        }
      }
      return {}
    })()
    if (!(address && tokenId && chain)) return

    const container = document.createElement('div')
    container.classList.add('SuperSea__AssetInfo')
    container.classList.add(`SuperSea__AssetInfo--${type}`)
    container.classList.add('SuperSea__AssetInfo--Unrendered')
    injectElement(node, container, selectorConfig.node.injectionMethod)
    container.dataset['address'] = address
    container.dataset['tokenId'] = tokenId
    container.dataset['collectionSlug'] = collectionSlug
    container.dataset['chain'] = chain
    container.dataset['type'] = type
  })
}

let injectedReactContainers: ReactDOM.Container[] = []
const injectReact = (
  content: React.ReactElement,
  target: ReactDOM.Container,
  opts?: { callback?: () => void; autoDestroy?: boolean },
) => {
  if (opts?.autoDestroy !== false) {
    injectedReactContainers.push(target)
  }
  ReactDOM.render(<AppProvider>{content}</AppProvider>, target, opts?.callback)
}

let cleanupActive = true
const destroyRemovedInjections = () => {
  window.requestIdleCallback(() => {
    if (!cleanupActive) return
    injectedReactContainers = injectedReactContainers.filter((container) => {
      if (!document.body.contains(container)) {
        ReactDOM.unmountComponentAtNode(container as Element)
        return false
      }
      return true
    })
  })
}

const injectBundleVerification = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const bundleFrames = Array.from(
    document.querySelectorAll(selectors.bundleVerification.frameSelector),
  ) as HTMLElement[]

  bundleFrames.forEach((bundleFrame) => {
    if (!bundleFrame || bundleFrame.dataset[NODE_PROCESSED_DATA_KEY]) return

    bundleFrame.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const assets = Array.from(
      bundleFrame.querySelectorAll(selectors.bundleVerification.linkSelector),
    ) as HTMLAnchorElement[]
    if (assets.length) {
      const addresses = _.groupBy(
        assets,
        // @ts-ignore
        (asset) => asset.attributes.href.value.split('/')[2],
      )
      const numAddresses = Object.keys(addresses).length

      const header = bundleFrame.querySelector(
        selectors.bundleVerification.headerSelector,
      )
      if (header) {
        const container = document.createElement('div')
        container.classList.add('SuperSea__BundleVerification')
        header.parentNode?.insertBefore(container, header.nextSibling)
        injectReact(
          <BundleVerification numAddresses={numAddresses} />,
          container,
        )
      }
    }
  })
}

const injectProfileSummary = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const accountTitle = document.querySelector(
    selectors.profileSummary.accountTitleSelector,
  ) as HTMLElement
  const accountBanner = accountTitle?.parentElement

  if (!accountBanner || accountBanner.dataset[NODE_PROCESSED_DATA_KEY]) return
  accountBanner.dataset[NODE_PROCESSED_DATA_KEY] = '1'
  const container = document.createElement('div')
  accountBanner.appendChild(container)
  const shortenedAddress = (document.querySelector(
    selectors.profileSummary.shortenedAddressSelector,
  ) as HTMLElement).innerText
  injectReact(<ProfileSummary shortenedAddress={shortenedAddress} />, container)
}

const throttledInjectAssetInfo = _.throttle(injectAssetInfo, 250)
const throttledInjectBundleVerification = _.throttle(
  injectBundleVerification,
  250,
)
const throttledInjectProfileSummary = _.throttle(injectProfileSummary, 250)
const throttledDestroyRemovedInjections = _.throttle(
  destroyRemovedInjections,
  1000,
)

const injectInPageContextScript = (onComplete: () => void) => {
  const s = document.createElement('script')
  s.src = chrome.runtime.getURL('static/js/pageContextInject.js')
  document.head.appendChild(s)
  s.onload = function () {
    s.remove()
    onComplete()
  }
}

let previouslyRenderedSearchResults: {
  container: HTMLElement | null
  collectionSlug: string | null
  scrollY: number
} = {
  container: null,
  collectionSlug: null,
  scrollY: 0,
}

const injectSearchResults = async () => {
  const collectionSlug = window.location.pathname
    .split('/')
    .filter(Boolean)
    .pop()!

  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const container = document.querySelector(
    selectors.searchResults.containerSelector,
  )!.parentElement as HTMLElement | null
  if (container) {
    const collectionMenu = document.querySelector(
      selectors.searchResults.menuSelector,
    ) as HTMLElement | null
    if (collectionMenu) {
      collectionMenu.classList.add('SuperSea--tabActive')
    }

    let reactContainer: null | HTMLElement = null
    if (previouslyRenderedSearchResults.collectionSlug === collectionSlug) {
      reactContainer = previouslyRenderedSearchResults.container!
    } else {
      reactContainer = document.createElement('div')
      previouslyRenderedSearchResults = {
        container: reactContainer,
        collectionSlug,
        scrollY: 0,
      }
      reactContainer.classList.add('SuperSea__SearchResults')
      injectReact(
        <SearchResults collectionSlug={collectionSlug!} />,
        reactContainer,
        { autoDestroy: false },
      )
    }

    container.replaceWith(reactContainer)
    window.scrollTo({ top: previouslyRenderedSearchResults.scrollY })
    cleanupActive = false

    const messageListener = (event: MessageEvent) => {
      if (event.data.method === 'SuperSea__Next__routeChangeStart') {
        previouslyRenderedSearchResults.scrollY = event.data.params.scrollY
      } else if (event.data.method === 'SuperSea__Next__routeChangeComplete') {
        reactContainer!.replaceWith(container)
        if (collectionMenu) {
          collectionMenu.classList.remove('SuperSea--tabActive')
        }
        window.removeEventListener('message', messageListener)
        cleanupActive = true
      }
    }

    window.addEventListener('message', messageListener)
  }
}

const injectCollectionMenu = async () => {
  const { injectionSelectors: selectors, routes } = await fetchRemoteConfig()
  const collectionMenu = document.querySelector(
    selectors.searchResults.menuSelector,
  ) as HTMLElement | null
  if (collectionMenu && !collectionMenu.dataset[NODE_PROCESSED_DATA_KEY]) {
    collectionMenu.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const container = document.createElement('li')
    container.classList.add('SuperSea__CollectionMenuItem')
    container.classList.add('SuperSea__CollectionMenuItem--items')
    collectionMenu.append(container)
    injectReact(
      <CollectionMenuItem
        type="items"
        onClick={() => {
          const collectionSlug = window.location.pathname
            .split('/')
            .filter(Boolean)
            .pop()
          window.postMessage({
            method: 'SuperSea__Navigate',
            params: {
              ...createRouteParams(routes.searchResults, {
                collectionSlug: collectionSlug!,
              }),
              options: {
                scroll: false,
              },
            },
          })
        }}
      />,
      container,
    )
  }
}
const throttledInjectCollectionMenu = _.throttle(injectCollectionMenu, 250)

const injectRarityDisclaimer = async () => {
  const user = await getUser()
  if (user && isSubscriber(user.role)) {
    chrome.storage.local.get(
      ['rarityDisclaimerSeenAt'],
      ({ rarityDisclaimerSeenAt }) => {
        if (rarityDisclaimerSeenAt) return
        const container = document.createElement('div')
        document.body.appendChild(container)
        injectReact(
          <RarityDisclaimer
            onClose={() => {
              chrome.storage.local.set({ rarityDisclaimerSeenAt: Date.now() })
              ReactDOM.unmountComponentAtNode(container as Element)
            }}
          />,
          container,
        )
      },
    )
  }
}

const injectActivity = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const node = document.querySelector(
    selectors.activity.button.selector,
  ) as HTMLElement | null
  if (node && !node.dataset[NODE_PROCESSED_DATA_KEY]) {
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const container = document.createElement('div')
    container.classList.add('SuperSea__Activity')
    injectElement(node, container, selectors.activity.button.injectionMethod)
    injectReact(<Activity />, container)
  }
}

const throttledInjectActivity = _.throttle(injectActivity, 250)

const injectTransferInfo = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()

  const transferForm = document.querySelector(
    selectors.transferInfo.formSelector,
  ) as HTMLElement | null

  const injectionNode = document.querySelector(
    selectors.transferInfo.node.selector,
  )?.parentNode

  if (!injectionNode || !transferForm) return

  const [address] = transferForm?.textContent?.match(/0x[0-9a-fA-F]{40}/) || []
  if (!address || transferForm.dataset[NODE_PROCESSED_DATA_KEY] === address)
    return

  transferForm.dataset[NODE_PROCESSED_DATA_KEY] = address

  let container = document.querySelector('.SuperSea__TransferInfo')

  if (!container) {
    container = document.createElement('div')
    container.classList.add('SuperSea__TransferInfo')
    injectElement(
      injectionNode as HTMLElement,
      container as HTMLElement,
      selectors.transferInfo.node.injectionMethod,
    )
  }

  injectReact(<TransferInfo address={address} />, container)
}

const throttledInjectTransferInfo = _.throttle(injectTransferInfo, 100)

const setupInjections = async () => {
  injectBundleVerification()
  injectAssetInfo()
  injectRarityDisclaimer()
  injectCollectionMenu()
  injectActivity()
  injectListingNotifier()
  injectTransferInfo()

  const observer = new MutationObserver(() => {
    throttledInjectBundleVerification()
    throttledInjectAssetInfo()
    throttledInjectCollectionMenu()
    throttledInjectListingNotifier()
    throttledDestroyRemovedInjections()
    throttledInjectActivity()
    throttledInjectTransferInfo()
  })

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  })
}

const setupDelayedInjections = async () => {
  injectProfileSummary()

  const observer = new MutationObserver(() => {
    throttledInjectProfileSummary()
  })

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  })
}

const setupAssetInfoRenderer = () => {
  const render = () => {
    try {
      const selectedNodes = document.querySelectorAll(
        '.SuperSea__AssetInfo--Unrendered',
      )
      if (selectedNodes.length !== 0) {
        const nodes = [...Array.from(selectedNodes)] as HTMLElement[]
        nodes.forEach((node: HTMLElement) => {
          const {
            address,
            tokenId,
            chain,
            type,
            collectionSlug,
          } = node.dataset as any
          injectReact(
            <AssetInfo
              address={address}
              tokenId={tokenId}
              chain={chain}
              type={type}
              collectionSlug={collectionSlug}
              container={node.parentElement!}
            />,
            node,
          )
          node.classList.remove('SuperSea__AssetInfo--Unrendered')
        })
      }
    } catch (err) {
      console.error('AssetInfo inject error', err)
    }
    setTimeout(() => {
      window.requestIdleCallback(render, { timeout: 500 })
    }, 250)
  }
  window.requestIdleCallback(render, { timeout: 500 })
}

const setupSearchResultsTab = () => {
  const query = queryString.parse(window.location.search)
  if (query.tab === 'supersea') {
    injectSearchResults()
  }
  window.addEventListener('message', (event) => {
    if (event.data.method === 'SuperSea__Next__routeChangeComplete') {
      const query = queryString.parse(event.data.params.url.split('?')[1])
      if (query.tab === 'supersea') {
        injectSearchResults()
      }
    }
  })
}

const injectListingNotifier = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const node = document.querySelector(
    selectors.listingNotifier.node.selector,
  ) as HTMLElement | null
  if (node && !node.dataset[NODE_PROCESSED_DATA_KEY]) {
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const container = document.createElement('div')
    container.classList.add('SuperSea__ListingNotifier')
    injectElement(
      node,
      container,
      selectors.listingNotifier.node.injectionMethod,
    )
    injectReact(<ReplacementNotice />, container)
  }
}

const throttledInjectListingNotifier = _.throttle(injectListingNotifier, 250)

// We need to keep the background script alive for webRequest handlers
const setupKeepAlivePing = () => {
  setInterval(() => {
    chrome.runtime.sendMessage({
      method: 'ping',
    })
  }, 5000)
}

const initialize = async () => {
  const config = await getExtensionConfig()
  if (config.enabled) {
    setupInjections()
    setupKeepAlivePing()
    addGlobalStyle()
    setupAssetInfoRenderer()
    setupSearchResultsTab()
    injectInPageContextScript(setupDelayedInjections)
  }
}

initialize()
