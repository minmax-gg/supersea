import { useEffect, useState } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import { Chain, fetchFloorPrice, Floor, floorPriceLoader } from '../utils/api'

const FLOOR_REFRESH_INTERVAL = 1000 * 60 * 3

const floorReloadCallbacks: Record<string, (() => void)[]> = {}
const floorsLoadedAt: Record<string, number> = {}
const loadFloor = async (slug: string, onReload: () => void) => {
  let timeout: any = null
  const reload = () => {
    floorPriceLoader.clear(slug)
    const callbacks = floorReloadCallbacks[slug]
    delete floorReloadCallbacks[slug]
    delete floorsLoadedAt[slug]
    callbacks.forEach((callback) => callback())
    if (timeout) clearTimeout(timeout)
  }

  if (!floorReloadCallbacks[slug]) {
    floorReloadCallbacks[slug] = []
    timeout = setTimeout(reload, FLOOR_REFRESH_INTERVAL)
  }

  floorReloadCallbacks[slug].push(onReload)

  const floor = await fetchFloorPrice(slug).finally(() => {
    if (!floorsLoadedAt[slug]) {
      floorsLoadedAt[slug] = Date.now()
    }
  })

  return {
    floor,
    forceReload: reload,
  }
}

const useFloor = (collectionSlug?: string, chain: Chain = 'ethereum') => {
  const [loading, setLoading] = useState(chain === 'ethereum' ? true : false)
  const [floor, setFloor] = useState<Floor | null | undefined>(
    chain === 'ethereum' ? undefined : null,
  )
  const [loadedAt, setLoadedAt] = useState(0)
  const [floorRefreshCount, setFloorRefreshCount] = useState(0)
  const [forceReload, setForceReload] = useState(() => {
    return () => {}
  })

  useEffect(() => {
    ;(async () => {
      if (!collectionSlug) return
      try {
        const { floor, forceReload } = await loadFloor(collectionSlug, () => {
          unstable_batchedUpdates(() => {
            setLoading(true)
            setFloorRefreshCount((c) => c + 1)
          })
        })
        unstable_batchedUpdates(() => {
          setLoading(false)
          setFloor(floor)
          setLoadedAt(floorsLoadedAt[collectionSlug])
          setForceReload(() => forceReload)
        })
      } catch (err) {
        unstable_batchedUpdates(() => {
          setLoading(false)
          setFloor(null)
          setLoadedAt(floorsLoadedAt[collectionSlug])
        })
      }
    })()
  }, [collectionSlug, floorRefreshCount])

  return { floor, forceReload, loading, loadedAt }
}

export default useFloor
