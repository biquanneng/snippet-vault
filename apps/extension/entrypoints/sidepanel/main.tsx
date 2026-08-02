// SPDX-License-Identifier: MPL-2.0

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'sonner/dist/styles.css';

import { trackAnalyticsEvent } from '../../lib/analytics';
import { openSidePanel } from '../../lib/analytics-events';
import { initializeLanguage } from '../../lib/i18n';
import {
  applyThemeToElement,
  getThemeSnapshot,
  initializeTheme,
} from '../../lib/theme';
import './style.css';
import { App } from './App';

async function mountApp() {
  applyThemeToElement(
    document.documentElement,
    getThemeSnapshot(),
  );
  await Promise.all([
    initializeLanguage(),
    initializeTheme(),
  ]);
  applyThemeToElement(
    document.documentElement,
    getThemeSnapshot(),
  );
  if (!(browser.sidePanel as { onOpened?: unknown }).onOpened) {
    // Chrome before 141 has no sidePanel.onOpened event.
    trackAnalyticsEvent(openSidePanel());
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void mountApp();
