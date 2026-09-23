import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { LocaleContext } from './i18n';
import './index.css';

// Locale is fixed to English for launch. It is threaded through a context
// rather than imported directly so that switching it later is a state change
// in one place instead of an edit to every component.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleContext.Provider value="en">
      <RouterProvider router={router} />
    </LocaleContext.Provider>
  </React.StrictMode>,
);
