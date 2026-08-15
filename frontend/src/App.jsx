import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import UploadView from './components/UploadView';
import HistoryView from './components/HistoryView';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/upload" element={<UploadView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
