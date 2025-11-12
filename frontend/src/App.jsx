import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Keno from './pages/games/Keno';
import Limbo from './pages/games/Limbo';
import Crash from './pages/games/Crash';
import DragonTower from './pages/games/DragonTower';
import Dice from './pages/games/Dice';
import History from './pages/History';
import Admin from './pages/Admin';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1f2e' }}>
        <div style={{ color: '#4299e1' }}>Loading...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1f2e' }}>
        <div style={{ color: '#4299e1' }}>Loading...</div>
      </div>
    );
  }
  
  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e2433',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
          },
          success: {
            iconTheme: {
              primary: '#48bb78',
              secondary: '#1e2433',
            },
          },
          error: {
            iconTheme: {
              primary: '#f56565',
              secondary: '#1e2433',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/keno"
          element={
            <ProtectedRoute>
              <Keno />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/limbo"
          element={
            <ProtectedRoute>
              <Limbo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/crash"
          element={
            <ProtectedRoute>
              <Crash />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/dragon-tower"
          element={
            <ProtectedRoute>
              <DragonTower />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/dice"
          element={
            <ProtectedRoute>
              <Dice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
