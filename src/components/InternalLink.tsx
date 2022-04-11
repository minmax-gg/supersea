import { Link } from '@chakra-ui/react'
import { forwardRef } from 'react'
import useRemoteConfig from '../hooks/useRemoteConfig'
import { RemoteConfig } from '../utils/api'
import { createRouteParams } from '../utils/route'

const InternalLink = forwardRef(
  <T extends keyof RemoteConfig['routes']>(
    {
      route,
      params,
      routeOptions,
      onClick,
      ...rest
    }: React.ComponentProps<typeof Link> & {
      route: T
      params?: Record<string, string>
      onClick?: () => void
      routeOptions?: any
    },
    ref: React.Ref<any>,
  ) => {
    const remoteConfig = useRemoteConfig()

    return (
      <Link
        {...rest}
        ref={ref}
        href={
          remoteConfig
            ? createRouteParams(remoteConfig.routes[route], params).as
            : undefined
        }
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || !remoteConfig) return
          event.preventDefault()
          window.postMessage({
            method: 'SuperSea__Navigate',
            params: {
              ...createRouteParams(remoteConfig.routes[route], params),
              options: routeOptions,
            },
          })
          onClick && onClick()
        }}
      />
    )
  },
)

export default InternalLink
