import { useColorModeValue } from '@chakra-ui/color-mode'
import React from 'react'
import Zoom from 'react-medium-image-zoom'

const ImageZoom = (props: React.ComponentProps<typeof Zoom>) => {
  return (
    <Zoom
      {...props}
      overlayBgColorStart={useColorModeValue(
        'rgba(255, 255, 255, 0)',
        'rgba(0, 0, 0, 0)',
      )}
      overlayBgColorEnd={useColorModeValue(
        'rgba(255, 255, 255, 0.9)',
        'rgba(0, 0, 0, 0.9)',
      )}
      zoomMargin={50}
    ></Zoom>
  )
}

export default ImageZoom
