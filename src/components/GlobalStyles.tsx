import { Global } from '@emotion/react'
import ScopedCSSReset from './ScopedCSSReset'

const GlobalStyles = () => {
  return (
    <>
      <Global
        styles={(theme: any) => ({
          ':host, :root': theme.__cssVars,
        })}
      />
      <Global
        styles={`
          [data-rmiz-wrap="visible"],
          [data-rmiz-wrap="hidden"] {
            position: relative;
            display: inline-flex;
            align-items: flex-start;
          }
          [data-rmiz-wrap="hidden"] {
            visibility: hidden;
          }
          [data-rmiz-overlay] {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transition-property: background-color;
          }
          [data-rmiz-btn-open],
          [data-rmiz-btn-close] {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100%;
          
            /* reset styles */
            margin: 0;
            padding: 0;
            border: none;
            border-radius: 0;
            font: inherit;
            color: inherit;
            background: none;
            -webkit-appearance: none;
              -moz-appearance: none;
                    appearance: none;
          }
          [data-rmiz-btn-open] {
            cursor: zoom-in;
          }
          [data-rmiz-btn-close] {
            cursor: zoom-out;
          }
          [data-rmiz-modal-content] {
            position: absolute;
            transition-property: transform;
            transform-origin: center center;
          }

          @keyframes SuperSea__FadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes SuperSea__FadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }

          @keyframes SuperSea__ActivityItemAppear {
            0% {
              opacity: 0;
              transform: translateY(-5px);
            }
            40% {
              opacity: 1;
            }
          }
          
          @keyframes SuperSea__Rotate {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      />
      <ScopedCSSReset />
    </>
  )
}

export default GlobalStyles
