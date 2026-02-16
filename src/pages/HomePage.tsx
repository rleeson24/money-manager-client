/**
 * HOME PAGE
 *
 * The main landing page of the Money Manager application
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import ExampleComponent from "../components/ExampleComponent";
import "./HomePage.css";

function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Money Manager</h1>
        <p>Welcome to your React application!</p>
      </header>

      <main className="App-main">
        <section className="navigation-section">
          <h2>Navigation</h2>
          <div className="nav-links">
            <Link to="/expenses/edit" className="nav-link">
              📝 Edit Expenses
            </Link>
            <Link to="/expenses/chatgptedit" className="nav-link">
              🤖 ChatGPT Edit Expenses
            </Link>
            <Link to="/expenses/creditcard" className="nav-link">
              🤖 Credit Card Expenses
            </Link>
          </div>
        </section>

        <section>
          <h2>Interactive Counter Example</h2>
          <p>
            This demonstrates React state. Click the button to update the count:
          </p>

          <div className="counter">
            <p>
              Count: <strong>{count}</strong>
            </p>

            <button onClick={() => setCount(count + 1)}>Increment Count</button>

            <button onClick={() => setCount(count - 1)}>Decrement Count</button>

            <button onClick={() => setCount(0)}>Reset</button>
          </div>
        </section>

        <section>
          <h2>Component Example</h2>
          <p>This shows how to use components with props:</p>

          <ExampleComponent
            message="This is an example component!"
            count={count}
          />
        </section>

        <section>
          <h2>Learn More</h2>
          <p>
            Check out the README.md file for a complete guide to this project
            structure.
          </p>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
