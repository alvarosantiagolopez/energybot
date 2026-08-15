import { useState } from 'react';
import UploadView from './components/UploadView';
import HistoryView from './components/HistoryView';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="app">
      <header className="app-header">
        <h1>EnergyBot</h1>
        <nav className="app-tabs">
          <button
            className={`app-tab ${activeTab === 'upload' ? 'app-tab--active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
          <button
            className={`app-tab ${activeTab === 'history' ? 'app-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'upload' ? <UploadView /> : <HistoryView />}
      </main>
    </div>
  );
}

export default App;
