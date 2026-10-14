import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RosPage from './pages/RosPage';
import ReplayPage from './pages/ReplayPage';
import Layout from './components/Layout/Layout';

// Hash routes support refreshes on static GitHub Pages without server rewrites.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/app"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />
        <Route
          path="/app/replay"
          element={
            <Layout>
              <ReplayPage />
            </Layout>
          }
        />
        <Route
          path="/app/ros"
          element={
            <div className="app-shell">
              <main className="workspace">
                <RosPage />
              </main>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{ style: { background: '#172033', color: '#fff' }, duration: 4000 }}
      />
    </Router>
  );
}
