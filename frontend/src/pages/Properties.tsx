import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as propertyService from '../services/properties';
import type { Property } from '../services/properties';
import { useAuth } from '../context/AuthContext';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

const typeColors: Record<string, string> = {
  RESIDENTIAL: 'bg-blue-100 text-blue-700',
  COMMERCIAL: 'bg-purple-100 text-purple-700',
  INDUSTRIAL: 'bg-orange-100 text-orange-700',
  AGRICULTURAL: 'bg-green-100 text-green-700',
  MIXED_USE: 'bg-yellow-100 text-yellow-700',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function Properties() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCitizen = user?.role === 'CITIZEN';
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProperties();
  }, [filter, page]);

  async function fetchProperties() {
    try {
      setLoading(true);
      setError(null);
      if (isCitizen) {
        // Citizens see only their own properties (no server-side pagination)
        const mine = await propertyService.getMyProperties();
        const filtered = filter === 'all' ? mine : mine.filter((p) => p.propertyType === filter);
        setProperties(filtered);
        setTotalPages(1);
      } else {
        const filters: propertyService.PropertyFilters = { page, limit: 10 };
        if (filter !== 'all') {
          filters.propertyType = filter;
        }
        const response = await propertyService.getProperties(filters);
        setProperties(response.data);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isCitizen ? 'My Properties' : 'Properties'}</h1>
        <p className="text-gray-600">
          {isCitizen ? 'View your properties and pay tax online' : 'Property tax assessment and records'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'MIXED_USE'].map((type) => (
          <button
            key={type}
            onClick={() => { setFilter(type); setPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === type ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'All' : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{p.propertyNumber || p.propertyId}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate">{p.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.ownerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[p.propertyType]}`}>
                      {p.propertyType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.ward?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(p.annualTax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View / Pay Tax &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {properties.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">No properties found</div>
        )}
      </div>

      {/* Pagination */}
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
