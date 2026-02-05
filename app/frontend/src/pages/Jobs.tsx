/**
 * Jobs Page
 *
 * Background job management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface Job {
  id: string;
  name: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface JobsResponse {
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  jobs: {
    waiting: Job[];
    active: Job[];
    completed: Job[];
    failed: Job[];
  };
}

const jobTypes = [
  { value: 'process-data', label: 'Process Data' },
  { value: 'send-notification', label: 'Send Notification' },
  { value: 'generate-report', label: 'Generate Report' },
  { value: 'cleanup', label: 'Cleanup' },
];

function Jobs() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newJob, setNewJob] = useState({ type: 'process-data', data: '{}' });

  const { data, isLoading, error, refetch } = useQuery<JobsResponse>({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs').then((res) => res.data),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (job: { type: string; data: Record<string, unknown> }) =>
      api.post('/jobs', job),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setNewJob({ type: 'process-data', data: '{}' });
    },
  });

  const cleanMutation = useMutation({
    mutationFn: () => api.post('/jobs/clean'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(newJob.data);
      createMutation.mutate({ type: newJob.type, data: parsedData });
    } catch {
      alert('Invalid JSON data');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load jobs
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Background Jobs</h2>
        <div className="space-x-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => cleanMutation.mutate()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clean Old Jobs
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Create Job'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{data?.counts.waiting || 0}</div>
          <div className="text-sm text-yellow-600">Waiting</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{data?.counts.active || 0}</div>
          <div className="text-sm text-blue-600">Active</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{data?.counts.completed || 0}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{data?.counts.failed || 0}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Type
            </label>
            <select
              value={newJob.type}
              onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {jobTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data (JSON)
            </label>
            <textarea
              value={newJob.data}
              onChange={(e) => setNewJob({ ...newJob, data: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder='{"key": "value"}'
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      )}

      {/* Job Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JobList title="Active Jobs" jobs={data?.jobs.active || []} status="active" />
        <JobList title="Waiting Jobs" jobs={data?.jobs.waiting || []} status="waiting" />
        <JobList title="Completed Jobs" jobs={data?.jobs.completed || []} status="completed" />
        <JobList title="Failed Jobs" jobs={data?.jobs.failed || []} status="failed" />
      </div>
    </div>
  );
}

interface JobListProps {
  title: string;
  jobs: Job[];
  status: string;
}

function JobList({ title, jobs, status }: JobListProps) {
  const statusColors: Record<string, string> = {
    active: 'border-blue-200',
    waiting: 'border-yellow-200',
    completed: 'border-green-200',
    failed: 'border-red-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${statusColors[status]}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No jobs
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{job.name}</div>
                  <div className="text-xs text-gray-500">ID: {job.id}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {job.timestamp && new Date(job.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Jobs;
