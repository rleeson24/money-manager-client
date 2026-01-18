# Money Manager Client

Port of spendings database from Microsoft Access to a modern React web application.

## 🚀 Getting Started

### Prerequisites

Before you begin, make sure you have Node.js installed on your computer:
- Download from [nodejs.org](https://nodejs.org/)
- Verify installation by running: `node --version` and `npm --version`

### Installation

1. **Install dependencies** (downloads all required packages):
   ```bash
   npm install
   ```

2. **Start the development server** (runs your app locally):
   ```bash
   npm run dev
   ```

3. **Open your browser** to the URL shown in the terminal (usually `http://localhost:5173`)

### Available Scripts

- `npm run dev` - Start the development server (use this while coding)
- `npm run build` - Create a production build of your app
- `npm run preview` - Preview the production build locally
- `npm run lint` - Check your code for errors and style issues

---

## 📚 Learning Guide: Understanding React Project Structure

This guide explains the structure of your React project in beginner-friendly terms.

### What is React?

React is a JavaScript library for building user interfaces (UIs). Think of it as a way to:
- Create reusable pieces of UI (called "components")
- Make your UI update automatically when data changes
- Build interactive web applications

### Project Structure Overview

```
money-manager-client/
│
├── public/              # Static files (images, icons, etc.) - not created yet
├── src/                 # Source code - this is where you write your React code
│   ├── App.tsx         # Main component (your app's entry point)
│   ├── App.css         # Styles for App component
│   ├── main.tsx        # JavaScript entry point - renders App into HTML
│   ├── index.css       # Global styles (applies to entire app)
│   └── vite-env.d.ts   # TypeScript definitions for Vite
│
├── index.html          # HTML template - the page React renders into
├── package.json        # Project configuration and dependencies
├── tsconfig.json       # TypeScript compiler settings
├── vite.config.ts      # Vite build tool configuration
└── README.md           # This file!
```

### File-by-File Explanation

#### 📄 `index.html`
- **What it is**: The HTML file that loads your React app
- **What it does**: Contains a `<div id="root">` where React injects your entire app
- **You usually don't edit this**: Vite handles it automatically

#### 📄 `src/main.tsx`
- **What it is**: The JavaScript entry point - the first code that runs
- **What it does**: 
  - Imports your `App` component
  - Tells React to render it into the `#root` div in `index.html`
- **Think of it as**: The "launcher" that starts your React app

#### 📄 `src/App.tsx`
- **What it is**: Your main React component - the root of your component tree
- **What it does**: 
  - Contains all the UI for your app
  - Can contain other components
  - Manages state (data that can change)
- **Think of it as**: The main "container" that holds everything else

#### 📄 `src/App.css`
- **What it is**: CSS stylesheet for your App component
- **What it does**: Defines how your App component looks (colors, layout, fonts, etc.)

#### 📄 `src/index.css`
- **What it is**: Global CSS stylesheet
- **What it does**: Styles that apply to your entire app (like base font, reset styles)

#### 📄 `package.json`
- **What it is**: Project configuration file
- **What it does**: 
  - Lists all dependencies (packages your app needs)
  - Defines scripts (commands you can run like `npm run dev`)
  - Contains project metadata

#### 📄 `tsconfig.json`
- **What it is**: TypeScript configuration
- **What it does**: Tells TypeScript how to compile your code
- **Note**: This project uses TypeScript (`.tsx` files) instead of plain JavaScript (`.jsx`)

#### 📄 `vite.config.ts`
- **What it is**: Vite build tool configuration
- **What it does**: Configures how Vite bundles and serves your app
- **What is Vite?**: A fast build tool that powers development and production builds

---

## 🎓 Key React Concepts Explained

### 1. Components

**What they are**: Reusable pieces of UI (like buttons, forms, cards, etc.)

**Example**:
```tsx
function WelcomeMessage() {
  return <h1>Welcome to Money Manager!</h1>
}
```

**Key points**:
- Components are just JavaScript functions
- They return JSX (looks like HTML but it's JavaScript)
- Components can be reused multiple times
- Components can contain other components

### 2. JSX

**What it is**: JavaScript syntax that looks like HTML

**Example**:
```tsx
const element = <h1>Hello, World!</h1>
```

**Key points**:
- Looks like HTML but it's actually JavaScript
- You can embed JavaScript expressions with `{ }`
- Must return one root element (or use fragments `<> </>`)
- Use `className` instead of `class` (because "class" is reserved in JavaScript)

### 3. Props (Properties)

**What they are**: Data passed from parent to child components

**Example**:
```tsx
// Parent component
<WelcomeMessage name="John" />

// Child component
function WelcomeMessage({ name }) {
  return <h1>Welcome, {name}!</h1>
}
```

**Key points**:
- Props are read-only (components can't change their props)
- Props flow down the component tree (parent → child)
- Props are like function parameters

### 4. State

**What it is**: Data that can change over time and causes re-renders

**Example**:
```tsx
const [count, setCount] = useState(0)
```

**Key points**:
- `useState` is a "hook" - a special React function
- First value (`count`) is the current state
- Second value (`setCount`) is a function to update state
- When state changes, React automatically re-renders the component

### 5. Event Handlers

**What they are**: Functions that respond to user interactions (clicks, typing, etc.)

**Example**:
```tsx
<button onClick={() => setCount(count + 1)}>
  Click me
</button>
```

**Key points**:
- Events are named with camelCase (`onClick`, not `onclick`)
- Usually call functions that update state
- Can be inline functions or separate function references

---

## 🏗️ Recommended Folder Structure (For Future Growth)

As your app grows, you'll want to organize files into folders. Here's a recommended structure:

```
src/
├── components/          # Reusable components (buttons, cards, etc.)
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.css
│   └── Card/
│       ├── Card.tsx
│       └── Card.css
│
├── pages/              # Page-level components (each page of your app)
│   ├── HomePage.tsx
│   ├── TransactionsPage.tsx
│   └── SettingsPage.tsx
│
├── hooks/              # Custom React hooks (reusable state logic)
│   └── useTransactions.ts
│
├── utils/              # Helper functions
│   └── formatCurrency.ts
│
├── types/              # TypeScript type definitions
│   └── transaction.ts
│
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

**Don't worry about this yet!** Start simple and organize as you grow.

---

## 🎯 Next Steps

1. **Explore the code**: Open `src/App.tsx` and read the comments
2. **Make changes**: Try modifying the text or colors
3. **Add a component**: Create a simple component in a new file
4. **Learn more**: Check out the [React documentation](https://react.dev)

### Creating Your First Component

Here's how to create a new component:

1. Create a file: `src/components/Welcome.tsx`
2. Write the component:
   ```tsx
   function Welcome() {
     return <h2>Welcome to Money Manager!</h2>
   }
   
   export default Welcome
   ```
3. Use it in `App.tsx`:
   ```tsx
   import Welcome from './components/Welcome'
   
   function App() {
     return (
       <div>
         <Welcome />
       </div>
     )
   }
   ```

---

## 🛠️ Technologies Used

- **React 18**: UI library for building interfaces
- **TypeScript**: Typed JavaScript for better code quality
- **Vite**: Fast build tool and development server
- **CSS3**: Styling

---

## 📖 Additional Resources

- [React Official Docs](https://react.dev) - Official React documentation
- [React Tutorial](https://react.dev/learn) - Step-by-step React tutorial
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Learn TypeScript
- [MDN Web Docs](https://developer.mozilla.org) - HTML, CSS, JavaScript reference

---

## ❓ Common Questions

**Q: Do I need to install Node.js?**
A: Yes! React apps need Node.js to run. Download it from [nodejs.org](https://nodejs.org/)

**Q: What's the difference between `.tsx` and `.jsx`?**
A: `.tsx` is TypeScript + JSX, `.jsx` is JavaScript + JSX. TypeScript adds type checking.

**Q: Why use Vite instead of Create React App?**
A: Vite is faster, has better performance, and is the modern standard for React projects.

**Q: How do I stop the development server?**
A: Press `Ctrl + C` in the terminal where it's running.

---

Happy coding! 🎉
