# Components Folder

This folder contains reusable React components.

## What are Components?

Components are reusable pieces of UI. They're like building blocks that you can combine to build your application.

## Creating a New Component

1. Create a new file: `YourComponent.tsx`
2. Write your component:
   ```tsx
   function YourComponent() {
     return <div>Your component content</div>
   }
   
   export default YourComponent
   ```
3. Import and use it in other components:
   ```tsx
   import YourComponent from './components/YourComponent'
   
   function App() {
     return <YourComponent />
   }
   ```

## Examples

- `ExampleComponent.tsx` - A simple example component with props

## Best Practices

- **One component per file** - Keep components in separate files
- **Name components clearly** - Use descriptive names like `TransactionCard` not `Card`
- **Use TypeScript** - Define prop types with interfaces
- **Export components** - Always export so other files can use them
