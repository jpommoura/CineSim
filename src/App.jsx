import { useEffect, useMemo, useState } from 'react'
import { formatBRL, useLocalStorage } from './utils.js'
import { I18nContext, LANGS, translate } from './i18n.jsx'
import FilmList from './components/FilmList.jsx'
import FilmEditor from './components/FilmEditor.jsx'
import UniverseManager from './components/UniverseManager.jsx'
import UniverseDetail from './components/UniverseDetail.jsx'

// Rotas por hash: #/films, #/universes, #/film/:id, #/universe/:id
const parseHash = () => {
  const [, page = 'films', id] = window.location.hash.replace(/^#/, '').split('/')
  return { page, id }
}

export default function App() {
  const [universes, setUniverses] = useLocalStorage('cinesim:universes', [])
  const [films, setFilms] = useLocalStorage('cinesim:films', [])
  const [lang, setLang] = useLocalStorage('cinesim:lang', 'en')
  const [theme, setTheme] = useLocalStorage('cinesim:theme', 'dark')
  const [route, setRoute] = useState(parseHash)
  const [depth, setDepth] = useState(0) // navegações feitas dentro do app (pro botão voltar)

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const i18n = useMemo(
    () => ({ lang, t: (key, vars) => translate(lang, key, vars), money: (v) => formatBRL(v, lang) }),
    [lang]
  )
  const { t } = i18n

  const go = (path) => { setDepth((d) => d + 1); window.location.hash = path }
  const back = (fallback) => {
    if (depth > 0) { setDepth((d) => d - 1); window.history.back() }
    else window.location.hash = fallback
  }

  const updateFilm = (id, patch) =>
    setFilms((prev) =>
      prev.map((f) => (f.id === id ? (typeof patch === 'function' ? patch(f) : { ...f, ...patch }) : f))
    )
  const createFilm = (film) => { setFilms((prev) => [film, ...prev]); go(`/film/${film.id}`) }
  const deleteFilm = (id) => { setFilms((prev) => prev.filter((f) => f.id !== id)); window.location.hash = '/films' }

  const updateUniverse = (id, patch) => setUniverses((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  const deleteUniverse = (id) => {
    setUniverses((prev) => prev.filter((u) => u.id !== id))
    setFilms((prev) => prev.map((f) => (f.universeId === id ? { ...f, universeId: null } : f)))
    window.location.hash = '/universes'
  }

  const film = route.page === 'film' && films.find((f) => f.id === route.id)
  const universe = route.page === 'universe' && universes.find((u) => u.id === route.id)
  const homeTab = route.page === 'universes' ? 'universes' : 'films'
  const isHome = route.page === 'films' || route.page === 'universes' || !route.page

  let page
  if (film) {
    page = (
      <FilmEditor
        key={film.id}
        film={film}
        universes={universes}
        onChange={(patch) => updateFilm(film.id, patch)}
        onDelete={() => deleteFilm(film.id)}
        onBack={() => back('/films')}
        onOpenUniverse={(id) => go(`/universe/${id}`)}
      />
    )
  } else if (universe) {
    page = (
      <UniverseDetail
        key={universe.id}
        universe={universe}
        films={films}
        onChange={(patch) => updateUniverse(universe.id, patch)}
        onDelete={() => deleteUniverse(universe.id)}
        onBack={() => back('/universes')}
        onOpenFilm={(id) => go(`/film/${id}`)}
        onCreateFilm={createFilm}
        onUpdateFilm={updateFilm}
      />
    )
  } else if (isHome) {
    page = (
      <>
        <div className="segmented-wrap">
          <div className="segmented" role="tablist">
            <span className={`segmented-thumb ${homeTab === 'universes' ? 'right' : ''}`} aria-hidden />
            <button role="tab" aria-selected={homeTab === 'films'} className={homeTab === 'films' ? 'active' : ''} onClick={() => (window.location.hash = '/films')}>
              {t('nav_films')} <span className="count">{films.length}</span>
            </button>
            <button role="tab" aria-selected={homeTab === 'universes'} className={homeTab === 'universes' ? 'active' : ''} onClick={() => (window.location.hash = '/universes')}>
              {t('nav_universes')} <span className="count">{universes.length}</span>
            </button>
          </div>
        </div>
        {homeTab === 'films' ? (
          <FilmList films={films} universes={universes} onCreate={createFilm} onOpen={(id) => go(`/film/${id}`)} />
        ) : (
          <UniverseManager universes={universes} films={films} setUniverses={setUniverses} onOpen={(id) => go(`/universe/${id}`)} />
        )}
      </>
    )
  } else {
    page = (
      <div className="empty">
        <p>{t('not_found')}</p>
        <button className="link" onClick={() => (window.location.hash = '/films')}>{t('back_generic')}</button>
      </div>
    )
  }

  return (
    <I18nContext.Provider value={i18n}>
      <div className="app">
        <header className="topbar">
          <button className="logo" onClick={() => (window.location.hash = '/films')}>
            CINE<span>SIM</span>
          </button>
          <nav>
            <div className="lang-switch" role="group" aria-label="Language">
              {Object.entries(LANGS).map(([code, label]) => (
                <button key={code} className={lang === code ? 'active' : ''} onClick={() => setLang(code)}>{label}</button>
              ))}
            </div>
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
              aria-label={theme === 'dark' ? t('theme_light') : t('theme_dark')}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </nav>
        </header>

        <main className="content">{page}</main>

        <footer className="footer">
          <span>{t('footer_data')} <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>.</span>
          <span>{t('footer_notice')}</span>
        </footer>
      </div>
    </I18nContext.Provider>
  )
}
