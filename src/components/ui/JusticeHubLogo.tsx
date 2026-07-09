/**
 * JusticeHub logo — image-based mark + wordmark.
 *
 * Assets:
 *   /logo-full.png    — JH symbol + "JusticeHub" wordmark
 *   /logo-symbol.png  — JH symbol only (collapsed sidebar / favicon)
 *
 * The component renders both images. CSS classes control which is visible:
 *   .logo-full     — hidden when sidebar is collapsed (via .logo-wordmark rule)
 *   .logo-symbol   — shown only when sidebar is collapsed
 */
export function JusticeHubLogo({
  size = '1.25rem',
  showSymbolOnly = false,
}: {
  variant?: 'dark' | 'light'
  size?: string
  showSymbolOnly?: boolean
}) {
  /* Compute pixel height from the rem-based size prop */
  const sizeNum = parseFloat(size)
  const fullHeight  = `${sizeNum * 2.2}rem`
  const symbolHeight = `${sizeNum * 2.4}rem`

  if (showSymbolOnly) {
    return (
      <img
        src="/logo-symbol.png"
        alt="JusticeHub"
        draggable={false}
        style={{
          height: symbolHeight,
          width: 'auto',
          objectFit: 'contain',
          userSelect: 'none',
          display: 'block',
          margin: '0 auto',
        }}
      />
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* Full logo (symbol + wordmark) — hidden on collapsed sidebar via CSS */}
      <img
        src="/logo-full.png"
        alt="JusticeHub"
        className="logo-wordmark"
        draggable={false}
        style={{
          height: fullHeight,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Symbol-only — shown only when collapsed sidebar hides .logo-wordmark */}
      <img
        src="/logo-symbol.png"
        alt="JusticeHub"
        className="logo-symbol-only"
        draggable={false}
        style={{
          height: symbolHeight,
          width: 'auto',
          objectFit: 'contain',
          display: 'none',
        }}
      />
    </span>
  )
}
