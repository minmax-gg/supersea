import { useEffect, useState } from 'react'
import { fetchRemoteConfig, RemoteConfig } from '../utils/api'

const useRemoteConfig = () => {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null)
  useEffect(() => {
    ;(async () => {
      const remoteConfig = await fetchRemoteConfig()
      setRemoteConfig(remoteConfig)
    })()
  }, [])
  return remoteConfig
}

export default useRemoteConfig
