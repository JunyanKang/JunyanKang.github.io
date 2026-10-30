import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ExpressionAtlasPage } from './pages/ExpressionAtlasPage';
import { registerWebComponents } from './web-components/register';
import './atlas.scss';

class AtlasBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <div className="container section"><h1>Unable to display the atlas</h1><p>Please reload this page to try again.</p><button type="button" onClick={() => window.location.reload()}>Reload</button></div>;
    return this.props.children;
  }
}
function ResourcesRedirect() { window.location.replace('/resources/'); return <a href="/resources/">Back to resources</a>; }
function LabLogo({ variant }: { variant: 'horizontal' | 'stacked' | 'symbol' }) {
  return <span className={`kl-logo kl-logo--${variant}`} aria-hidden="true"><img className="kl-logo__symbol" src="/assets/img/brand/kanglab-symbol-v17.png" width="256" height="256" alt="" />{variant !== 'symbol' && <span className="kl-logo__wordmark">Kang Lab</span>}</span>;
}
function LabHeader() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const resize = () => { setMobile(query.matches); setOpen(false); };
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
    };
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('click', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('click', outside); };
  }, [open]);
  return <header ref={header} className="atlas-header"><div className="atlas-header-inner">
    <a href="/" className="atlas-brand" aria-label="Kang Lab home"><LabLogo variant="horizontal" /></a>
    <button ref={toggle} className="atlas-menu-toggle" type="button" hidden={!mobile} aria-expanded={open} aria-controls="atlas-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
    <nav id="atlas-navigation" aria-label="Main navigation" hidden={mobile && !open}>
      <a href="/">Home</a><a href="/research/">Research</a><a href="/publications/">Publications</a><a href="/team/">Team</a><a href="/resources/" aria-current="true">Resources</a><a href="/news/">News</a><a href="/contact/">Contact</a>
    </nav>
  </div></header>;
}
registerWebComponents();
createRoot(document.getElementById('root')!).render(<>
  <a className="atlas-skip" href="#atlas-main">Skip to content</a>
  <LabHeader />
  <main id="atlas-main" tabIndex={-1}><AtlasBoundary><BrowserRouter><Routes>
    <Route path="/expression-atlas/" element={<ExpressionAtlasPage />} />
    <Route path="/internal-resources" element={<ResourcesRedirect />} />
    <Route path="*" element={<Navigate to="/expression-atlas/" replace />} />
  </Routes></BrowserRouter></AtlasBoundary></main>
  <footer className="atlas-footer"><div className="kl-footer-identity"><a href="https://app.pagescms.org/sign-in" aria-label="Admin sign-in" title="Admin sign-in"><LabLogo variant="symbol" /></a><p>Public expression atlas · Shanghai Ninth People's Hospital</p></div><div><a href="/assets/atlas/v1/manifest.json">Dataset manifest</a></div></footer>
</>);
