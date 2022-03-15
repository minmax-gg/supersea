import BigNumber from 'bignumber.js'

// From https://github.com/euank/node-parse-numeric-range

const parseNumberRange = (value: string) => {
  let res = []
  let m

  for (let str of value.split(',').map((str) => str.trim())) {
    if (/^-?\d+$/.test(str)) {
      res.push(str)
    } else if (
      (m = str.match(/^(-?\d+)(-|\.\.\.?|\u2025|\u2026|\u22EF)(-?\d+)$/))
    ) {
      let [, lhs, sep, rhs] = m as [
        any,
        number | string,
        string,
        number | string,
      ]

      if (lhs && rhs) {
        let lhsNum = new BigNumber(lhs as string, 10)
        let rhsNum = new BigNumber(rhs as string, 10)
        const incr = lhsNum.lt(rhsNum) ? 1 : -1

        // Make it inclusive by moving the right 'stop-point' away by one.
        if (sep === '-' || sep === '..' || sep === '\u2025')
          rhsNum = rhsNum.plus(incr)
        // if (Math.abs(lhs - rhs) < 100000) {
        if (
          lhsNum.minus(rhsNum).absoluteValue().lt(new BigNumber(100000, 10))
        ) {
          for (let i = lhsNum; i.lt(rhsNum); i = i.plus(incr))
            res.push(i.toString(10))
        }
      }
    }
  }

  return res
}

export default parseNumberRange
