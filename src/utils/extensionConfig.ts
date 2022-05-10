import { useEffect, useState } from 'react'
import { Notifier } from '../components/Activity/ListingNotifierForm'

export type ExtensionConfig = {
  enabled: boolean
  quickBuyEnabled: boolean
  notificationSounds: boolean
  quickBuyGasPreset: 'none' | 'fixed' | 'optimal'
  fixedGas: { priorityFee: number; fee: number }
  useStreamClient: boolean
}

export type StoredActivityState = {
  collections: { slug: string; name: string }[]
  notifiers: (Omit<Notifier, 'collection' | 'tokenEligibilityMap'> & {
    collectionSlug: string
  })[]
}

const DEFAULTS: ExtensionConfig = {
  enabled: true,
  quickBuyEnabled: false,
  notificationSounds: true,
  quickBuyGasPreset: 'none',
  fixedGas: { priorityFee: 25, fee: 300 },
  useStreamClient: false,
}

let configPromise: null | Promise<Record<string, any>> = null
export const getExtensionConfig = async (
  cached = true,
): Promise<ExtensionConfig> => {
  if (!configPromise || !cached) {
    configPromise = new Promise((resolve) => {
      if (process.env.NODE_ENV === 'production') {
        chrome.storage.local.get(['extensionConfig'], resolve)
      } else {
        setTimeout(() => resolve({}), 250)
      }
    })
  }
  const val = await configPromise
  return { ...DEFAULTS, ...val?.extensionConfig }
}

export const saveExtensionConfig = (config: ExtensionConfig) => {
  if (process.env.NODE_ENV === 'production') {
    chrome.storage.local.set({ extensionConfig: config })
  }
}

export const useExtensionConfig = () => {
  const [config, setConfig] = useState<null | ExtensionConfig>(null)
  useEffect(() => {
    ;(async () => {
      setConfig(await getExtensionConfig())
    })()
  }, [])

  return [
    config,
    (updatedConfig: ExtensionConfig) => {
      setConfig(updatedConfig)
      saveExtensionConfig(updatedConfig)
    },
  ] as const
}

let storedActivityStatePromise: null | Promise<Record<string, any>> = null
export const getStoredActivityState = async () => {
  if (!storedActivityStatePromise) {
    storedActivityStatePromise = new Promise((resolve) => {
      if (process.env.NODE_ENV === 'production') {
        chrome.storage.local.get(['activityState'], resolve)
      } else {
        setTimeout(() => resolve({}), 250)
      }
    })
  }

  const val = await storedActivityStatePromise
  return (val?.activityState || null) as StoredActivityState | null
}

export const saveActivityState = (activityState: StoredActivityState) => {
  if (process.env.NODE_ENV === 'production') {
    chrome.storage.local.set({ activityState })
  }
}
