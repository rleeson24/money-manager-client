/**
 * MAIN ENTRY POINT
 * 
 * This is the first file that runs when your React app starts.
 * It's responsible for:
 * 1. Rendering your React app into the HTML page (index.html)
 * 2. Setting up the root of your React component tree
 * 
 * Think of it as the "starting point" of your application.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// This creates the root container for your React app
// It finds the <div id="root"> element in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode is a development tool that helps catch problems
  // It doesn't affect production builds
  <React.StrictMode>
    {/* App is your main component - everything else will be inside it */}
    <App />
  </React.StrictMode>,
)
