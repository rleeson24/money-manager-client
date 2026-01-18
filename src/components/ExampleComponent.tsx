/**
 * EXAMPLE COMPONENT
 * 
 * This is an example of how to create a new React component.
 * Components are reusable pieces of UI that you can use anywhere in your app.
 * 
 * How to use this component:
 * 1. Import it: import ExampleComponent from './components/ExampleComponent'
 * 2. Use it: <ExampleComponent message="Hello!" />
 */

// Props are the data passed to a component from its parent
// TypeScript helps by defining what props the component expects
interface ExampleComponentProps {
  message: string  // This component expects a "message" prop (required)
  count?: number   // This prop is optional (the ? means optional)
}

/**
 * Component Function
 * 
 * This is a React component. It's just a JavaScript function that:
 * 1. Takes props as an argument
 * 2. Returns JSX (what to display)
 */
function ExampleComponent({ message, count = 0 }: ExampleComponentProps) {
  // You can use JavaScript inside components!
  const doubledCount = count * 2

  // Components must return JSX
  // JSX looks like HTML but it's actually JavaScript
  return (
    <div style={{ 
      padding: '1rem', 
      border: '2px solid #4CAF50', 
      borderRadius: '8px',
      margin: '1rem 0'
    }}>
      {/* Display the message prop */}
      <h3>{message}</h3>
      
      {/* Display the count prop */}
      <p>Count: {count}</p>
      
      {/* Use JavaScript expressions in JSX with { } */}
      <p>Doubled: {doubledCount}</p>
      
      {/* Conditional rendering - only show if count > 0 */}
      {count > 0 && (
        <p style={{ color: 'green' }}>
          ✓ Count is greater than zero!
        </p>
      )}
    </div>
  )
}

// Export the component so other files can import and use it
export default ExampleComponent
