interface TopBarProps {
  firmName: string
  title: string
  children?: React.ReactNode
}

export function TopBar({ firmName, title, children }: TopBarProps) {
  return (
    <header className="app-topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {children}
        <span className="topbar-firm">{firmName}</span>
      </div>
    </header>
  )
}
