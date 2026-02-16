/**
 * APP COMPONENT
 *
 * This is your main React component - the root of your component tree.
 * It sets up routing for the application using React Router.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import EditExpenses from "./pages/EditExpenses";
import ChatGPTEditExpenses from "./pages/ChatGPTEditExpenses";
import CreditCardExpenses from "./pages/CreditCardExpenses";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/expenses/edit" element={<EditExpenses />} />
        <Route path="/expenses/chatgptedit" element={<ChatGPTEditExpenses />} />
        <Route path="/expenses/creditcard" element={<CreditCardExpenses />} />
        <Route path="/expenses/edit/:id" element={<EditExpenses />} />
        <Route path="/expenses/edit/new" element={<EditExpenses />} />
      </Routes>
    </BrowserRouter>
  );
}

// Export the component so it can be used in other files (like main.tsx)
export default App;
