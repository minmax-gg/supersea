import { RouteConfig } from './api'

const interpolate = (str: string, variables: Record<string, string>) => {
  return str.replace(/\{([^}]+)\}/g, (_, key) => {
    return variables[key]
  })
}

export const createRouteParams = (
  routeConfig: RouteConfig,
  params?: Record<string, string>,
) => {
  return {
    url: interpolate(routeConfig.url, params || {}),
    as: interpolate(routeConfig.as, params || {}),
  }
}
