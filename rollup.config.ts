// See: https://rollupjs.org/introduction/

import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'

const config = [
  {
    input: 'src/update/index.ts',
    output: {
      esModule: true,
      file: 'dist/update/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      replace({
        preventAssignment: true,
        include: /node_modules\/jsdom\/.*XMLHttpRequest-impl\.js$/,
        delimiters: ['', ''],
        values: {
          'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;':
            'const syncWorkerFile = null;'
        }
      }),
      commonjs(),
      nodeResolve({ preferBuiltins: true }),
      typescript(),
      json()
    ]
  },
  {
    input: 'src/notify.ts',
    output: {
      esModule: true,
      file: 'dist/notify/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
  }
]

export default config
