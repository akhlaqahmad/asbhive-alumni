import React, { useState, useEffect } from 'react';
import { Upload, Users, Download, Search, Filter, Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import ScrapingProgress from './components/ScrapingProgress';
import { AlumniData, ScrapingJob } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'upload' | 'dashboard' | 'scraping'>('upload');
  const [alumniData, setAlumniData] = useState<AlumniData[]>([]);
  const [scrapingJob, setScrapingJob] = useState<ScrapingJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Upload the file
      console.log('Uploading file...');
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { jobId, totalProfiles } = await uploadResponse.json();
      console.log('File uploaded successfully. Job ID:', jobId);

      // Step 2: Start the scraping job
      console.log('Starting scraping job...');
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json();
        throw new Error(errorData.error || 'Failed to start scraping');
      }

      console.log('Scraping job started successfully');

      // Step 3: Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/job/${jobId}`);
          if (!statusResponse.ok) {
            throw new Error('Failed to get job status');
          }

          const jobStatus = await statusResponse.json();
          console.log('Job status:', jobStatus);

          if (jobStatus.status === 'completed') {
            clearInterval(pollInterval);
            setIsLoading(false);
            setCurrentView('dashboard');
            // Fetch all profiles
            const profilesResponse = await fetch('/api/profiles');
            if (profilesResponse.ok) {
              const profiles = await profilesResponse.json();
              setAlumniData(profiles);
            }
          } else if (jobStatus.status === 'failed') {
            clearInterval(pollInterval);
            setIsLoading(false);
            setError(`Scraping failed: ${jobStatus.errors[0]?.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error polling job status:', error);
          clearInterval(pollInterval);
          setIsLoading(false);
          setError('Failed to get job status');
        }
      }, 2000);

      // Cleanup interval on component unmount
      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Error in file upload process:', error);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      console.log(`📥 Exporting data as ${format}`);
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: alumniData }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `alumni_data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      console.log(`✅ Data exported successfully as ${format}`);
    } catch (error) {
      console.error('❌ Export error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ASB Alumni Tracker</h1>
                <p className="text-sm text-gray-500">LinkedIn Career Intelligence Platform</p>
              </div>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                disabled={alumniData.length === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : alumniData.length > 0
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'upload' && (
          <UploadSection onFileUpload={handleFileUpload} isLoading={isLoading} error={error} />
        )}
        
        {currentView === 'scraping' && scrapingJob && (
          <ScrapingProgress job={scrapingJob} />
        )}
        
        {currentView === 'dashboard' && (
          <Dashboard data={alumniData} onExport={handleExport} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2025 ASB Alumni Office. Built for career intelligence and engagement.
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                Ethical Scraping
              </span>
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                Public Data Only
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;