// SPDX-License-Identifier: MPL-2.0

import React from 'react';
import ReactDOM from 'react-dom/client';

import { registerBrandFonts } from '../../lib/brand-font';
import { initializeLanguage } from '../../lib/i18n';
import {
  applyThemeToElement,
  getThemeSnapshot,
  initializeTheme,
} from '../../lib/theme';
import './style.css';
import { App } from './App';

async function mountApp() {
  registerBrandFonts();
  applyThemeToElement(document.documentElement, getThemeSnapshot());
  await Promise.all([initializeLanguage(), initializeTheme()]);
  applyThemeToElement(document.documentElement, getThemeSnapshot());
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void mountApp();
