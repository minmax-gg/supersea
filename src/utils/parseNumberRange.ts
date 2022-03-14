// From https://github.com/euank/node-parse-numeric-range
const parseNumberRange = (value: string) => {
  let res = []
  let m

  for (let str of value.split(',').map((str) => str.trim())) {
    if (/^-?\d+$/.test(str)) {
      res.push(parseInt(str, 10))
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
        lhs = parseInt(lhs as string)
        rhs = parseInt(rhs as string)
        const incr = lhs < rhs ? 1 : -1

        // Make it inclusive by moving the right 'stop-point' away by one.
        if (sep === '-' || sep === '..' || sep === '\u2025') rhs += incr
        if (Math.abs(lhs - rhs) < 100000) {
          for (let i = lhs; i !== rhs; i += incr) res.push(i)
        }
      }
    }
  }

  return res
}

export default parseNumberRange
