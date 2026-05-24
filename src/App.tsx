/**
 * APP COMPONENT
 *
 * This is your main React component - the root of your component tree.
 * It sets up routing for the application using React Router.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import EditExpenses from "./pages/EditExpenses";
import ChatGPTEditExpenses from "./pages/ChatGPTEditExpenses";
import CreditCardExpenses from "./pages/CreditCardExpenses";
import ImportPage from "./pages/ImportPage";
import { isAuthEnabled } from "./auth/msalConfig";
import { USE_API } from "./config/api";
import "./App.css";

function App() {
  const showLogin = USE_API && isAuthEnabled;

  return (
    <BrowserRouter>
      <Routes>
        {showLogin ? <Route path="/login" element={<LoginPage />} /> : null}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/expenses/edit" element={<EditExpenses />} />
            <Route path="/expenses/chatgptedit" element={<ChatGPTEditExpenses />} />
            <Route path="/expenses/creditcard" element={<CreditCardExpenses />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/expenses/edit/:id" element={<EditExpenses />} />
            <Route path="/expenses/edit/new" element={<EditExpenses />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Export the component so it can be used in other files (like main.tsx)
export default App;
