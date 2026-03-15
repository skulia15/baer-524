import type { CSSProperties } from 'react'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function getHouseholdStyle(color: string): CSSProperties {
  return {
    backgroundColor: color,
    color: getContrastColor(color),
  }
}

export function getHouseholdSharedStyle(color: string): CSSProperties {
  return {
    background: `repeating-linear-gradient(-45deg, ${color}, ${color} 8px, rgba(255,255,255,0.22) 8px, rgba(255,255,255,0.22) 16px)`,
    color: getContrastColor(color),
  }
}

export function getHouseholdFadedStyle(color: string): CSSProperties {
  const rgb = hexToRgb(color)
  if (!rgb) return { backgroundColor: color, color: '#000000', opacity: 0.33 }
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.33)`,
    color: color,
  }
}
