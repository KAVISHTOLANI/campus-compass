import { useEffect, useMemo, useState } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { CATEGORIES, DAYS, dayIndex, filterResources, hoursLabel, openState, toMin, validateResource, type Filters, type Resource } from './lib/campus';
import { DEMO_RESOURCES } from './lib/demo';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/directory', label: 'Directory' },
  { to: '/favorites', label: 'Favourites' },
  { to: '/add', label: 'Add a resource' },
];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const [route, navigate] = useRoute();
  const [resources, setResources] = usePersistentState<Resource[]>('campus:resources', DEMO_RESOURCES);
  const [favorites, setFavorites] = usePersistentState<string[]>('campus:favorites', ['lib-main', 'it']);
  const toggleFav = (id: string) => setFavorites(favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]);
  const detail = route.match(/^\/place\/(.+)$/);
  let page;
  if (route === '/') page = <Home />;
  else if (route === '/directory') page = <Directory resources={resources} favorites={favorites} toggleFav={toggleFav} setResources={setResources} />;
  else if (route === '/favorites') page = <Directory resources={resources} favorites={favorites} toggleFav={toggleFav} setResources={setResources} favoritesView />;
  else if (route === '/add') page = <AddResource onAdd={(r) => { setResources([...resources, r]); navigate(`/place/${r.id}`); }} />;
  else if (detail) {
    const r = resources.find((x) => x.id === detail[1]);
    page = r ? <Detail r={r} fav={favorites.includes(r.id)} toggleFav={() => toggleFav(r.id)} /> : <EmptyState title="Place not found" actions={<a className="btn btn-primary" href="#/directory">Back to the directory</a>}>It may have been removed.</EmptyState>;
  } else page = <NotFound />;
  return (
    <Shell name="Campus Compass" wordmark={['Campus', 'Compass']} nav={NAV} route={route} cta={{ to: '/directory', label: 'Search campus' }} footerNote="All places and contacts are fictional demo data for “Demo University”.">
      {page}
    </Shell>
  );
}

function Status({ r, now }: { r: Resource; now: Date }) {
  const s = openState(r.hours, now);
  return <span className={`status status-${s.state}`}>{s.label}</span>;
}

function HeroSearch() {
  const now = useNow();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const list = filterResources(DEMO_RESOURCES, { query: q, categories: cat ? [cat] : [], openNow: false, favoritesOnly: false }, [], now).slice(0, 4);
  return (
    <div className="hero-search">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “printing”, “GP” or “coffee”" aria-label="Search the demo campus" />
      <div className="chip-row" role="group" aria-label="Category">
        {['Library', 'Health', 'Food', 'Study spaces'].map((c) => (
          <button key={c} type="button" className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
        ))}
      </div>
      <ul className="hs-results">
        {list.map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <span className="hint">{r.building}{r.room ? ` · ${r.room}` : ''}</span>
            </div>
            <Status r={r} now={now} />
          </li>
        ))}
        {list.length === 0 && <li className="muted small">Nothing matches — try a broader word.</li>}
      </ul>
    </div>
  );
}

function Home() {
  return (
    <Landing
      compact
      eyebrow="Campus resource directory"
      title={<>What’s open on campus, <em>right now?</em></>}
      lead="Search libraries, health services, food, study spaces and support offices in one place. Every listing shows live opening status, where to find it, how to get in, and who to contact."
      primary={{ href: '#/directory', label: 'Search the directory' }}
      secondary={{ href: '#/favorites', label: 'My favourites' }}
      previewLabel="Live search — demo campus"
      preview={<HeroSearch />}
      meta={['Live opening status', 'Works offline', 'Fictional demo campus']}
      steps={[
        { title: 'Search or filter', body: 'Type what you need or pick categories. “Open now” hides anything closed.' },
        { title: 'Check the details', body: 'Weekly hours with today highlighted, building and room, access notes, contacts.' },
        { title: 'Save favourites', body: 'Star the places you use most so they are one tap away.' },
      ]}
      features={[
        { title: 'Live status', body: '“Open until 22:00”, “Closes soon” or “Opens tomorrow 09:00”, updated every minute.' },
        { title: 'Late-night aware', body: 'Hours that run past midnight are handled, so a 2 am library close is shown correctly.' },
        { title: 'Accessibility notes', body: 'Step-free entrances, lifts and hearing loops are listed where known.' },
        { title: 'Add missing places', body: 'Add a resource to your own copy of the directory, with validated hours and contacts.' },
      ]}
      note="This directory describes a fictional campus with fictional contact details. Swap the data in src/lib/demo.ts for a real institution's listings."
      closing={{ title: <>Find what you need <em>in seconds.</em></>, action: { href: '#/directory', label: 'Open the directory' } }}
    />
  );
}

function Directory({ resources, favorites, toggleFav, setResources, favoritesView }: { resources: Resource[]; favorites: string[]; toggleFav: (id: string) => void; setResources: (r: Resource[]) => void; favoritesView?: boolean }) {
  const now = useNow();
  const [f, setF] = useState<Filters>({ query: '', categories: [], openNow: false, favoritesOnly: !!favoritesView });
  const [sort, setSort] = useState<'open' | 'name'>('open');
  useEffect(() => setF((x) => ({ ...x, favoritesOnly: !!favoritesView })), [favoritesView]);
  const list = useMemo(() => {
    const l = filterResources(resources, f, favorites, now);
    const rank = (r: Resource) => ({ always: 0, open: 0, closing: 1, closed: 2 })[openState(r.hours, now).state];
    return l.sort((a, b) => (sort === 'open' ? rank(a) - rank(b) : 0) || a.name.localeCompare(b.name));
  }, [resources, f, favorites, now, sort]);
  const openCount = resources.filter((r) => openState(r.hours, now).state !== 'closed').length;
  const toggleCat = (c: string) => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] });
  return (
    <div className="stack">
      <PageHead
        eyebrow={favoritesView ? 'Workspace · Favourites' : 'Workspace · Directory'}
        title={favoritesView ? <>Your <em>favourites</em></> : <>Campus <em>directory</em></>}
        description={`${openCount} of ${resources.length} places open now · ${now.toLocaleDateString(undefined, { weekday: 'long' })} ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
        actions={resources.length === 0 ? <button type="button" className="btn" onClick={() => setResources(DEMO_RESOURCES)}>Load demo campus</button> : undefined}
      />
      <div className="dir-layout">
        <aside className="card filters" aria-label="Filters">
          <Field label="Search">{(c) => <input type="search" {...c} value={f.query} onChange={(e) => setF({ ...f, query: e.target.value })} placeholder="Name, building or service" />}</Field>
          <fieldset className="cat-filter">
            <legend className="label">Categories</legend>
            {CATEGORIES.map((c) => {
              const n = resources.filter((r) => r.category === c).length;
              return (
                <label key={c} className="check cat-opt">
                  <input type="checkbox" checked={f.categories.includes(c)} onChange={() => toggleCat(c)} />
                  <span>{c}</span>
                  <span className="muted small">{n}</span>
                </label>
              );
            })}
          </fieldset>
          <label className="check"><input type="checkbox" checked={f.openNow} onChange={(e) => setF({ ...f, openNow: e.target.checked })} /> Open now only</label>
          {!favoritesView && <label className="check"><input type="checkbox" checked={f.favoritesOnly} onChange={(e) => setF({ ...f, favoritesOnly: e.target.checked })} /> Favourites only</label>}
          <Field label="Sort">
            {(c) => (
              <select {...c} value={sort} onChange={(e) => setSort(e.target.value as 'open' | 'name')}>
                <option value="open">Open first</option>
                <option value="name">Name A–Z</option>
              </select>
            )}
          </Field>
          {(f.query || f.categories.length > 0 || f.openNow) && (
            <button type="button" className="btn btn-sm" onClick={() => setF({ query: '', categories: [], openNow: false, favoritesOnly: !!favoritesView })}>Clear filters</button>
          )}
        </aside>
        <div className="stack">
          <p className="small muted" aria-live="polite" data-testid="result-count">{list.length} result{list.length === 1 ? '' : 's'}</p>
          {list.length === 0 ? (
            favoritesView && favorites.length === 0 ? (
              <EmptyState title="No favourites yet" actions={<a className="btn btn-primary" href="#/directory">Browse the directory</a>}>Star a place to keep it here.</EmptyState>
            ) : (
              <EmptyState title="No places match">{f.openNow ? 'Everything matching is closed right now — try without “Open now”.' : 'Try a different word or fewer categories.'}</EmptyState>
            )
          ) : (
            <ul className="place-list">
              {list.map((r, i) => (
                <li key={r.id} className="card place" data-reveal style={{ ['--i' as string]: i % 5 }}>
                  <div className="place-main">
                    <span className="label-mono">{r.category}</span>
                    <h2><a href={`#/place/${r.id}`}>{r.name}</a></h2>
                    <p className="muted small">{r.description}</p>
                    <p className="small place-loc">{r.building}{r.room ? ` · ${r.room}` : ''} {r.demo && <DemoTag />}</p>
                  </div>
                  <div className="place-side">
                    <Status r={r} now={now} />
                    <button type="button" className={`fav ${favorites.includes(r.id) ? 'on' : ''}`} aria-pressed={favorites.includes(r.id)} aria-label={`${favorites.includes(r.id) ? 'Remove' : 'Add'} ${r.name} ${favorites.includes(r.id) ? 'from' : 'to'} favourites`} onClick={() => toggleFav(r.id)}>
                      {favorites.includes(r.id) ? '★' : '☆'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ r, fav, toggleFav }: { r: Resource; fav: boolean; toggleFav: () => void }) {
  const now = useNow();
  const today = dayIndex(now);
  return (
    <div className="stack">
      <PageHead
        eyebrow={<><a href="#/directory">← Directory</a> · {r.category}</>}
        title={r.name}
        description={<><Status r={r} now={now} /> {r.demo && <DemoTag />}</>}
        actions={<button type="button" className={`btn ${fav ? 'btn-primary' : ''}`} aria-pressed={fav} onClick={toggleFav}>{fav ? '★ Saved' : '☆ Save to favourites'}</button>}
      />
      <div className="grid-2">
        <section className="card" aria-labelledby="hours-title">
          <h2 id="hours-title">Opening hours</h2>
          <table className="table">
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d} className={i === today ? 'today' : ''}>
                  <th scope="row">{d}{i === today && <span className="badge badge-accent">Today</span>}</th>
                  <td className="num">{hoursLabel(r.hours[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card stack" aria-labelledby="where-title">
          <h2 id="where-title">Where &amp; how</h2>
          <p>{r.description}</p>
          <dl className="facts">
            <dt>Building</dt><dd>{r.building}</dd>
            <dt>Room</dt><dd>{r.room ?? <span className="muted">Not listed</span>}</dd>
            <dt>Access</dt><dd>{r.accessibility ?? <span className="muted">No accessibility information yet</span>}</dd>
            <dt>Phone</dt><dd>{r.phone ? <a href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a> : <span className="muted">No phone</span>}</dd>
            <dt>Email</dt><dd>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : <span className="muted">No email</span>}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}

function AddResource({ onAdd }: { onAdd: (r: Resource) => void }) {
  const [form, setForm] = useState({ name: '', category: 'Study spaces', building: '', room: '', description: '', email: '', phone: '', open: '09:00', close: '17:00', days: [0, 1, 2, 3, 4] });
  const [errors, setErrors] = useState<ReturnType<typeof validateResource>>({});
  const [flash, setFlash] = useFlash();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateResource(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFlash({ kind: 'error', text: 'Not added yet — check the highlighted fields.' });
      return;
    }
    const o = toMin(form.open)!;
    let c = toMin(form.close)!;
    if (c < o) c += 1440; // closes after midnight
    onAdd({
      id: uid('place'),
      name: form.name.trim(),
      category: form.category,
      building: form.building.trim(),
      room: form.room.trim() || undefined,
      description: form.description.trim() || 'No description yet.',
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      hours: Array.from({ length: 7 }, (_, i) => (form.days.includes(i) ? ([o, c] as [number, number]) : null)),
    });
  }
  return (
    <div className="stack narrow">
      <PageHead eyebrow="Workspace · Contribute" title={<>Add a <em>resource</em></>} description="Adds the place to the directory stored in this browser." />
      {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
      <form className="card stack" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Name" error={errors.name}>{(c) => <input type="text" {...c} value={form.name} onChange={set('name')} placeholder="e.g. Chemistry study room" />}</Field>
          <Field label="Category" error={errors.category}>{(c) => <select {...c} value={form.category} onChange={set('category')}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          <Field label="Building" error={errors.building}>{(c) => <input type="text" {...c} value={form.building} onChange={set('building')} />}</Field>
          <Field label="Room (optional)">{(c) => <input type="text" {...c} value={form.room} onChange={set('room')} />}</Field>
          <Field label="Email (optional)" error={errors.email}>{(c) => <input type="email" {...c} value={form.email} onChange={set('email')} />}</Field>
          <Field label="Phone (optional)" error={errors.phone}>{(c) => <input type="text" {...c} value={form.phone} onChange={set('phone')} />}</Field>
          <Field label="Opens" error={errors.open}>{(c) => <input type="time" {...c} value={form.open} onChange={set('open')} />}</Field>
          <Field label="Closes" error={errors.close} hint="Earlier than opening = closes after midnight">{(c) => <input type="time" {...c} value={form.close} onChange={set('close')} />}</Field>
        </div>
        <fieldset className="day-pick">
          <legend className="label">Open on</legend>
          <div className="row">
            {DAYS.map((d, i) => (
              <label key={d} className={`chip ${form.days.includes(i) ? 'on' : ''}`}>
                <input type="checkbox" checked={form.days.includes(i)} onChange={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i] })} />
                {d.slice(0, 3)}
              </label>
            ))}
          </div>
          {errors.days && <span className="error-text">{errors.days}</span>}
        </fieldset>
        <Field label="Description (optional)">{(c) => <textarea {...c} rows={3} value={form.description} onChange={set('description')} />}</Field>
        <button type="submit" className="btn btn-primary">Add to directory</button>
      </form>
    </div>
  );
}
