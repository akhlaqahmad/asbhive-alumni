import React from 'react';
import { Clock, CheckCircle, AlertCircle, Users, Zap, TrendingUp } from 'lucide-react';
import { ScrapingJob } from '../types';

interface ScrapingProgressProps {
  job: ScrapingJob;
}

const ScrapingProgress: React.FC<ScrapingProgressProps> = ({ job }) => {
  const progressPercentage = job.totalProfiles > 0 
    ? Math.round((job.processedProfiles / job.totalProfiles) * 100)
    : 0;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'running':
        return <Zap className="w-6 h-6 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'text-yellow-600';
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Initializing scraper...';
      case 'running':
        return job.currentProfile ? `Processing: ${job.currentProfile}` : 'Analyzing LinkedIn profiles...';
      case 'completed':
        return 'Analysis completed successfully!';
      case 'failed':
        return 'Analysis failed. Please try again.';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
          {getStatusIcon()}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Alumni Profile Analysis
        </h1>
        <p className={`text-lg ${getStatusColor()}`}>
          {getStatusText()}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
            <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{job.processedProfiles} of {job.totalProfiles} profiles processed</span>
            <span>
              {job.status === 'running' && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>In progress...</span>
                </div>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{job.successfulProfiles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{job.failedProfiles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Profiles</p>
              <p className="text-2xl font-bold text-gray-900">{job.totalProfiles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      {job.status === 'running' && job.currentProfile && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-medium text-blue-900">Currently Processing</p>
              <p className="text-blue-700">{job.currentProfile}</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {job.errors.length > 0 && (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-2">Processing Errors</h4>
              <div className="space-y-1">
                {job.errors.slice(0, 3).map((error, index) => (
                  <p key={index} className="text-red-700 text-sm">{error}</p>
                ))}
                {job.errors.length > 3 && (
                  <p className="text-red-600 text-sm">... and {job.errors.length - 3} more errors</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {job.status === 'completed' && (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Analysis Complete!
          </h3>
          <p className="text-green-700 mb-4">
            Successfully processed {job.successfulProfiles} alumni profiles. 
            Redirecting to dashboard...
          </p>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapingProgress;