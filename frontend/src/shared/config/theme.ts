export const theme = {
  fontFamily: {
    body: '"Spartan", sans-serif',
    display: '"Oswald", sans-serif',
  },
  color: {
    primary: '#f51304',
    primaryHover: '#d60e02',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceStrong: '#0f0e0e',
    surfaceMuted: '#f8f8f8',
    text: '#0f0e0e',
    textMuted: '#646464',
    border: 'rgba(15, 14, 14, 0.12)',
    onPrimary: '#ffffff',
  },
  shadow: {
    soft: '0 18px 50px rgba(15, 14, 14, 0.08)',
  },
  radius: {
    card: 24,
  },
} as const

export type Theme = typeof theme
