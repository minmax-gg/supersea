/* global chrome */
import { gql } from 'graphql-request'
import queryString from 'query-string'

const GRAPHQL_AUTH_URL =
  // @ts-ignore
  chrome.runtime.GRAPHQL_AUTH_URL || 'https://api.nonfungible.tools/graphql'

const pendingOpenSeaRequestBodies: Record<string, string> = {}
chrome.webRequest.onBeforeSendHeaders.addListener(
  ({ requestId, requestHeaders, url }) => {
    const body = pendingOpenSeaRequestBodies[requestId]
    if (body) {
      delete pendingOpenSeaRequestBodies[requestId]
      const bodyData = JSON.parse(body)
      if (bodyData.id) {
        chrome.storage.local.get(
          ['openSeaGraphQlRequests'],
          ({ openSeaGraphQlRequests }) => {
            // TODO: Handle quota exceeded?
            chrome.storage.local.set({
              openSeaGraphQlRequests: {
                ...openSeaGraphQlRequests,
                [bodyData.id]: {
                  url,
                  body,
                  headers: requestHeaders,
                },
              },
            })
          },
        )
      }
    }
  },
  { urls: ['https://api.opensea.io/*'] },
  ['requestHeaders'],
)
chrome.webRequest.onBeforeRequest.addListener(
  ({ tabId, url, requestId, requestBody }) => {
    if (
      typeof tabId === 'number' &&
      /graphql\/$/.test(url) &&
      requestBody?.raw?.length
    ) {
      const decoder = new TextDecoder('utf-8')
      pendingOpenSeaRequestBodies[requestId] = decoder.decode(
        requestBody.raw[0].bytes,
      )
    }
  },
  { urls: ['https://api.opensea.io/*'] },
  ['requestBody'],
)

const refreshTokenMutation = gql`
  mutation RefreshToken {
    refreshToken {
      success
      accessToken
      account {
        role
        membershipType
      }
    }
  }
`

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === 'fetch') {
    fetch(request.params.url)
      .then((res) => res.json())
      .then((res) => {
        sendResponse(res)
      })
  } else if (request.method === 'ping') {
    sendResponse('pong')
  } else if (request.method === 'openPopup') {
    const createWindow = (params = {}) => {
      chrome.windows.create({
        url: `index.html?${queryString.stringify(request.params)}`,
        type: 'panel',
        width: 400,
        height: 550,
        ...params,
      })
    }
    chrome.windows
      .getLastFocused()
      .then((window) => {
        const top = window.top || 0
        const left = (window.left || 0) + (window.width || 400) - 400
        createWindow({ left, top })
      })
      .catch(() => {
        createWindow()
      })
  } else if (request.method === 'getUser') {
    // Can't use graphl-request because it depends on XMLHttpRequest,
    // which isn't available in background scripts
    fetch(GRAPHQL_AUTH_URL, {
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: refreshTokenMutation }),
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        const {
          refreshToken: { accessToken, account },
        } = json.data

        sendResponse({
          accessToken,
          role: account?.role || 'FREE',
          membershipType: account?.membershipType,
        })
      })
  } else if (request.method === 'notify') {
    // Svg images not supported in notifications
    if (request.params.options.iconUrl.endsWith('.svg')) {
      request.params.options.iconUrl = chrome.runtime.getURL('icon.png')
    }
    chrome.notifications.create(
      request.params.id,
      request.params.options,
      (notifiedId) => {
        if (request.params.openOnClick) {
          chrome.notifications.onClicked.addListener((clickedId) => {
            if (clickedId === notifiedId) {
              chrome.tabs.create({ url: request.params.openOnClick })
              chrome.notifications.clear(clickedId)
            }
          })
        }
        sendResponse(notifiedId)
      },
    )
  } else if (request.method === 'clearNotifications') {
    // Svg images not supported in notifications
    request.params.ids.forEach((id: string) => {
      chrome.notifications.clear(id)
    })
  }
  return true
})
