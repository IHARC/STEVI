#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const tokensPath = path.join(cwd, 'tokens', 'material3.json')
const cssPath = path.join(cwd, 'src', 'styles', 'main.css')

const markerStart = '/* @tokens:start */'
const markerEnd = '/* @tokens:end */'

function formatSection(selector, values) {
  const lines = Object.entries(values).map(([key, value]) => `  ${key}: ${value};`)
  return `${selector} {\n${lines.join('\n')}\n}\n`
}

function ensureMarkers(buffer) {
  const start = buffer.indexOf(markerStart)
  const end = buffer.indexOf(markerEnd)
  if (start === -1 || end === -1) {
    throw new Error('Token markers were not found in src/styles/main.css')
  }
  return { start, end }
}

try {
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'))
  const css = readFileSync(cssPath, 'utf8')
  const { start, end } = ensureMarkers(css)

  const generatedBlock = `${markerStart}\n${formatSection(':root', tokens.root)}\n${formatSection('.dark', tokens.dark)}${markerEnd}`
  const afterMarkerIndex = end + markerEnd.length
  const before = css.slice(0, start)
  const after = css.slice(afterMarkerIndex)
  const needsLeadingNewline = !after.startsWith('\n')
  const nextCss = `${before}${generatedBlock}${needsLeadingNewline ? '\n' : ''}${after}`

  writeFileSync(cssPath, nextCss)
  console.log('Updated Material 3 tokens from tokens/material3.json')
} catch (error) {
  console.error('Failed to update Material 3 tokens')
  console.error(error)
  process.exit(1)
}
