import { SignOutButton } from '../../../features/auth'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './creator-app-shell.module.scss'

type CreatorAppShellProps = {
  children: ReactNode
  /** Contenu à droite dans la barre du haut (recherche, filtres rapides, etc.) */
  topBarTrailing?: ReactNode
  /** Barre du haut simplifiée : avatar vers la gestion compte (ex. page /account) */
  accountTopBar?: boolean
}

export function CreatorAppShell({ children, topBarTrailing, accountTopBar }: CreatorAppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const goToDashboard = () => {
    setIsMenuOpen(false)
    navigate('/dashboard')
  }

  const goToAccount = () => {
    setIsMenuOpen(false)
    navigate('/account')
  }

  const resolvedTrailing = accountTopBar ? (
    <button
      type="button"
      className={styles.profileButton}
      onClick={goToAccount}
      aria-label="Gestion utilisateur"
    >
      <span className={styles.profileAvatar}>MC</span>
    </button>
  ) : (
    topBarTrailing
  )

  return (
    <main className={styles.shell}>
      {isMenuOpen ? (
        <button
          type="button"
          className={styles.mobileNavOverlay}
          onClick={() => setIsMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      ) : null}
      <aside className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ''}`}>
        <button
          type="button"
          className={styles.mobileNavClose}
          onClick={() => setIsMenuOpen(false)}
          aria-label="Fermer le menu burger"
        >
          ×
        </button>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>C</span>
          creacontenu
        </div>
        <nav className={styles.menu} aria-label="Navigation principale">
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === '/dashboard' ? styles.menuItemActive : ''}`}
            onClick={goToDashboard}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${location.pathname === '/account' ? styles.menuItemActive : ''}`}
            onClick={goToAccount}
          >
            Gestion utilisateur
          </button>
          <SignOutButton className={styles.menuItem} />
        </nav>
      </aside>

      <section className={styles.main}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <h2>creacontenu</h2>
          {resolvedTrailing ? <div className={styles.topBarRight}>{resolvedTrailing}</div> : null}
        </header>
        {children}
      </section>
    </main>
  )
}
