import React from 'react'
import { Platform } from 'react-native'

// Cross-platform wrapper for react-content-loader
// - Web: use 'react-content-loader'
// - Native (iOS/Android): use 'react-content-loader/native'

// Using require to avoid bundler resolving both at build time
// and to keep the same API: default ContentLoader, named Rect/Circle/Path
let ContentLoader: any
let Rect: any
let Circle: any
let Path: any

function resolveExports(mod: any) {
  const d = mod?.default ?? mod
  // Prefer named exports from the module directly
  const R = mod?.Rect ?? d?.Rect
  const C = mod?.Circle ?? d?.Circle
  const P = mod?.Path ?? d?.Path
  return { d, R, C, P }
}

if (Platform.OS === 'web') {
  const mod = require('react-content-loader')
  const { d } = resolveExports(mod)
  ContentLoader = d
  // On web, react-content-loader expects lowercase SVG elements.
  // Expose compatible components so the rest of the app can use <Rect/>, <Circle/>, <Path/> uniformly.
  Rect = (props: any) => React.createElement('rect', props)
  Circle = (props: any) => React.createElement('circle', props)
  Path = (props: any) => React.createElement('path', props)
} else {
  const mod = require('react-content-loader/native')
  const { d, R, C, P } = resolveExports(mod)
  ContentLoader = d
  Rect = R
  Circle = C
  Path = P
}

// Safe fallbacks to avoid crashes if named shapes are unavailable
if (!Rect) Rect = (props: any) => null
if (!Circle) Circle = (props: any) => null
if (!Path) Path = (props: any) => null

export { ContentLoader as default, Rect, Circle, Path }
