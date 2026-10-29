import { useEffect, useState } from 'react';
import { ShowMeAroundButton, WhatsNewButton } from './tour';

type Page = 'notes' | 'settings';

function pageFromHash(): Page {
  return window.location.hash === '#/settings' ? 'settings' : 'notes';
}

const SAMPLE_NOTES = ['Groceries', 'Sprint planning', 'Book ideas', 'Trip to Lisbon'];

export default function App() {
  // A tiny hash "router" so the demo can show a tour step on another page.
  const [page, setPageState] = useState<Page>(pageFromHash);
  useEffect(() => {
    const onHash = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setPage = (p: Page) => (window.location.hash = p === 'settings' ? '/settings' : '/');
  const [notes, setNotes] = useState(SAMPLE_NOTES);
  const [query, setQuery] = useState('');

  return (
    <div className="app">
      <header className="header">
        <strong>Notely</strong>
        <div className="tour-buttons" data-tour="tour-buttons">
          <ShowMeAroundButton className="btn" />
          <WhatsNewButton className="btn icon" />
        </div>
      </header>

      <nav className="sidebar" data-tour="sidebar-nav">
        <button className={page === 'notes' ? 'nav active' : 'nav'} onClick={() => setPage('notes')}>
          Notes
        </button>
        <button className={page === 'settings' ? 'nav active' : 'nav'} onClick={() => setPage('settings')}>
          Settings
        </button>
      </nav>

      <main className="main">
        {page === 'notes' ? (
          <>
            <div className="toolbar">
              <button
                className="btn primary"
                data-tour="new-note-button"
                onClick={() => setNotes([`Untitled ${notes.length + 1}`, ...notes])}
              >
                New note
              </button>
              <input
                className="search"
                data-tour="search-box"
                placeholder="Search notes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="btn" data-tour="export-button">
                Export
              </button>
            </div>
            <ul className="notes" data-tour="note-list">
              {notes
                .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
                .map((n) => (
                  <li key={n}>{n}</li>
                ))}
            </ul>
          </>
        ) : (
          <section className="settings" data-tour="theme-setting">
            <h2>Settings</h2>
            <label>
              Theme{' '}
              <select>
                <option>System</option>
                <option>Light</option>
                <option>Dark</option>
              </select>
            </label>
          </section>
        )}
      </main>
    </div>
  );
}
