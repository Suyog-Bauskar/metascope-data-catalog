import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import './App.css';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DataUpload from './pages/DataUpload';
import TableBrowser from './pages/TableBrowser';
import TableDetail from './pages/TableDetail';
import LineageView from './pages/LineageView';
import SearchResults from './pages/SearchResults';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
              <Routes>
                <Route path="/" element={<DataUpload />} />
                <Route path="/upload" element={<DataUpload />} />
                <Route path="/tables" element={<TableBrowser />} />
                <Route path="/tables/:schema/:table" element={<TableDetail />} />
                <Route path="/lineage/:tableName" element={<LineageView />} />
                <Route path="/search" element={<SearchResults />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
