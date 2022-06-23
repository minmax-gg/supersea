import EthereumLightSVG from '../assets/ethereum_light.svg'
import EthereumDarkSVG from '../assets/ethereum_dark.svg'
import WrappedEthereumSVG from '../assets/wrapped_ethereum.svg'
import { useColorModeValue, Icon } from '@chakra-ui/react'
import React from 'react'

const EthereumIcon = ({
  wrapped = false,
  colorMode,
  ...rest
}: { wrapped?: boolean; colorMode?: 'light' | 'dark' } & React.ComponentProps<
  typeof Icon
>) => {
  const themeColorMode = useColorModeValue('light', 'dark')
  const icon = (() => {
    const usedColorMode = colorMode || themeColorMode
    if (wrapped) {
      return WrappedEthereumSVG
    }
    return usedColorMode === 'light' ? EthereumLightSVG : EthereumDarkSVG
  })()
  return (
    // @ts-ignore
    <Icon
      as={icon as any}
      width="0.5em"
      mr="0.25em"
      verticalAlign="middle"
      display="inline-block"
      {...rest}
    />
  )
}

export default EthereumIcon
