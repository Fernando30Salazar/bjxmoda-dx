import React from 'react';
import { createRoot } from 'react-dom/client';

// Fuentes autoalojadas (sin peticiones a terceros; fiables para el canvas).
import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource/bodoni-moda/600.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/700.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/forms.css';
import './styles/test.css';
import './styles/result.css';
import './styles/gallery.css';
import './styles/print.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
