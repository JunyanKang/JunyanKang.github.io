import { Component, type ReactNode } from 'react';
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
registerWebComponents();
createRoot(document.getElementById('root')!).render(<>
  <a className="atlas-skip" href="#atlas-main">Skip to content</a>
  <header className="atlas-header"><div className="atlas-header-inner"><a href="/" className="atlas-brand" aria-label="Kang Lab home"><LabLogo variant="horizontal" /></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/research/">Research</a><a href="/publications/">Publications</a><a href="/team/">Team</a><a href="/resources/" aria-current="true">Resources</a><a href="/contact/">Contact</a></nav></div></header>
  <main id="atlas-main"><AtlasBoundary><BrowserRouter><Routes>
    <Route path="/expression-atlas/" element={<ExpressionAtlasPage />} />
    <Route path="/internal-resources" element={<ResourcesRedirect />} />
    <Route path="*" element={<Navigate to="/expression-atlas/" replace />} />
  </Routes></BrowserRouter></AtlasBoundary></main>
  <footer className="atlas-footer"><div className="kl-footer-identity"><a href="https://app.pagescms.org/sign-in" aria-label="Admin sign-in" title="Admin sign-in"><LabLogo variant="symbol" /></a><p>Public expression atlas · Shanghai Ninth People's Hospital</p></div><div><a href="/assets/atlas/v1/manifest.json">Dataset manifest</a></div></footer>
</>);
