import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as buildingService from '../services/buildingPermits';
import type { BuildingApplication } from '../services/buildingPermits';
import { useAuth } from '../context/AuthContext';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  DOCUMENT_VERIFICATION: 'bg-indigo-100 text-indigo-800',
  INSPECTION: 'bg-purple-100 text-purple-800',
  OFFICER_REVIEW: 'bg-cyan-100 text-cyan-800',
  SENIOR_REVIEW: 'bg-teal-100 text-teal-800',
  APPROVED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  PERMIT_ISSUED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

const formatCurrency = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
    : '-';

const statusFilters = ['all', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PERMIT_ISSUED'];

export default function BuildingPermits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCitizen = user?.role === 'CITIZEN';
  const [items, setItems] = useState<BuildingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchItems();
  }, [filter, page]);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);
      const filters: buildingService.BuildingFilters = { page, limit: 10 };
      if (filter !== 'all') filters.status = filter;
      const response = await buildingService.getBuildingApplications(filters);
      setItems(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load building permits');
    } finally {
      setLoading(false);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Building Permits</h1>
          <p className="text-gray-600">
            {isCitizen ? 'Apply for and track building permits' : 'Building permit applications and approvals'}
          </p>
        </div>
        {isCitizen && (
          <button
            onClick={() => navigate('/building-permits/new')}
            className="btn-primary inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Application
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/building-permits/${b.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{b.applicationNumber}</div>
                    {b.permitNumber && <div className="text-xs text-gray-500">{b.permitNumber}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{b.plotAddress}</div>
                    <div className="text-xs text-gray-500">{b.proposedBuiltUpArea} sq ft, {b.numberOfFloors} floor(s)</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{b.buildingType.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(b.fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status]}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      {isCitizen ? 'View' : 'Review'} &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">No building permit applications found</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
