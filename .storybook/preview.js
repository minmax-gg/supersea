import { useToolbarActions } from 'storybook-addon-toolbar-actions'
import {
  ChakraProvider,
  ColorModeScript,
  Box,
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react'
import { SunIcon } from '@chakra-ui/icons'
import theme from '../src/theme'
import GlobalStyles from '../src/components/GlobalStyles'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  layout: 'fullscreen',
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

const Container = ({ children }) => {
  const { colorMode, toggleColorMode } = useColorMode()
  useToolbarActions('colorMode', <SunIcon />, {
    onClick: () => {
      toggleColorMode()
    },
  })
  return (
    <Box
      width="100%"
      height="100vh"
      bg={useColorModeValue('white', 'gray.700')}
    >
      {children}
    </Box>
  )
}

export const decorators = [
  (Story) => (
    <ChakraProvider theme={theme}>
      <Container>
        <GlobalStyles />
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <Story />
      </Container>
    </ChakraProvider>
  ),
]
