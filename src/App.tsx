/**
 * APP COMPONENT
 * 
 * This is your main React component - the root of your component tree.
 * Every React app has one "App" component that contains all other components.
 * 
 * Components are like reusable pieces of UI. They can:
 * - Display data
 * - Handle user interactions (clicks, form input, etc.)
 * - Contain other components
 * 
 * In React, components are written as functions (or classes, but functions are preferred).
 * Components must return JSX (JavaScript XML) - it looks like HTML but it's JavaScript.
 */

import { useState } from 'react'
import ExampleComponent from './components/ExampleComponent'
import './App.css'

// This is a function component - it's just a JavaScript function that returns JSX
function App() {
  /**
   * STATE - Managing Data in React
   * 
   * useState is a "hook" - a special function that lets you add React features to your component.
   * 
   * const [count, setCount] = useState(0) means:
   * - count: the current value (starts at 0)
   * - setCount: a function to update the value
   * - useState(0): the initial value is 0
   * 
   * When you call setCount(newValue), React will:
   * 1. Update the count value
   * 2. Re-render the component with the new value
   * 
   * This is how React updates the UI - whenever state changes, the component re-renders.
   */
  const [count, setCount] = useState(0)

  /**
   * RETURN - What This Component Displays
   * 
   * This is JSX (JavaScript XML). It looks like HTML but:
   * - It's actually JavaScript
   * - You can embed JavaScript expressions with { }
   * - You can use JavaScript variables and functions
   * 
   * Important JSX rules:
   * - You must return ONE root element (or use React Fragments <> </>)
   * - class becomes className (because "class" is reserved in JavaScript)
   * - Use camelCase for HTML attributes (onClick, not onclick)
   */
  return (
    <div className="App">
      {/* This is a JSX comment - it won't appear in the HTML */}
      
      <header className="App-header">
        <h1>Money Manager</h1>
        <p>Welcome to your React application!</p>
      </header>

      <main className="App-main">
        <section>
          <h2>Interactive Counter Example</h2>
          <p>
            This demonstrates React state. Click the button to update the count:
          </p>
          
          {/* Display the current count value */}
          <div className="counter">
            <p>Count: <strong>{count}</strong></p>
            
            {/* 
              onClick is an event handler - when the button is clicked,
              it calls setCount to update the state
              
              setCount(count + 1) means: take the current count, add 1, and set it as the new value
            */}
            <button onClick={() => setCount(count + 1)}>
              Increment Count
            </button>
            
            <button onClick={() => setCount(count - 1)}>
              Decrement Count
            </button>
            
            <button onClick={() => setCount(0)}>
              Reset
            </button>
          </div>
        </section>

        <section>
          <h2>Component Example</h2>
          <p>This shows how to use components with props:</p>
          
          {/* Using a component with props (data passed to it) */}
          <ExampleComponent message="This is an example component!" count={count} />
        </section>

        <section>
          <h2>Learn More</h2>
          <p>
            Check out the README.md file for a complete guide to this project structure.
          </p>
        </section>
      </main>
    </div>
  )
}

// Export the component so it can be used in other files (like main.tsx)
export default App
