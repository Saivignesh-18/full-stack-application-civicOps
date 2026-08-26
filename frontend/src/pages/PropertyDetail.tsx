import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as propertyService from '../services/properties';
import type { Property, TaxDue, TaxPayment } from '../services/properties';

const formatCurrency = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
    : '-';

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'CASH', 'CHEQUE'];

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [taxDue, setTaxDue] = useState<TaxDue | null>(null);
  const [history, setHistory] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState('UPI');

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [prop, due, hist] = await Promise.all([
        propertyService.getProperty(id!),
        propertyService.getTaxDue(id!).catch(() => null),
        propertyService.getPaymentHistory(id!).catch(() => []),
      ]);
      setProperty(prop);
      setTaxDue(due);
      setHistory(hist);
    } catch (err: any) {
      setError(err.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!id || !taxDue) return;
    setPaying(true);
    try {
      await propertyService.payTax(id, taxDue.financialYear, method);
      toast.success('Tax paid successfully');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 max-w-md mx-auto">
          {error || 'Property not found'}
        </div>
        <Link to="/properties" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          &larr; Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link to="/properties" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to properties
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{property.propertyNumber || property.propertyId}</h1>
        <p className="text-gray-500">{property.address}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-gray-900">{property.ownerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-gray-900">{property.propertyType.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward</dt>
                <dd className="mt-1 text-gray-900">{property.ward?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Built-up Area</dt>
                <dd className="mt-1 text-gray-900">{property.builtUpArea ? `${property.builtUpArea} sq ft` : '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Floors</dt>
                <dd className="mt-1 text-gray-900">{property.floors ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Annual Tax</dt>
                <dd className="mt-1 text-gray-900 font-medium">{formatCurrency(property.annualTax)}</dd>
              </div>
            </dl>
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Paid On</th>
                      <th className="py-2">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 pr-4 text-gray-900">{p.financialYear}</td>
                        <td className="py-2 pr-4 text-gray-900">{formatCurrency(p.totalAmount)}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500">{formatDate(p.paymentDate)}</td>
                        <td className="py-2 text-gray-500">{p.receiptNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No payment records yet.</p>
            )}
          </div>
        </div>

        {/* Tax due / pay */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tax — {taxDue?.financialYear || 'Current Year'}
            </h2>

            {taxDue?.status === 'PAID' ? (
              <div className="text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900">Tax Paid</p>
                <p className="text-sm text-gray-500 mt-1">Receipt: {taxDue.receiptNumber}</p>
                <p className="text-sm text-gray-500">Paid on {formatDate(taxDue.paidOn)}</p>
              </div>
            ) : taxDue ? (
              <div>
                <dl className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Annual Tax</dt>
                    <dd className="text-gray-900">{formatCurrency(taxDue.amount)}</dd>
                  </div>
                  {taxDue.penalty ? (
                    <div className="flex justify-between">
                      <dt className="text-red-500">Penalty (overdue)</dt>
                      <dd className="text-red-600">{formatCurrency(taxDue.penalty)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <dt className="text-gray-900">Total Due</dt>
                    <dd className="text-gray-900">{formatCurrency(taxDue.totalDue ?? taxDue.amount)}</dd>
                  </div>
                  {taxDue.dueDate && (
                    <p className={`text-xs ${taxDue.isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                      Due date: {formatDate(taxDue.dueDate)} {taxDue.isOverdue ? '(overdue)' : ''}
                    </p>
                  )}
                </dl>

                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:ring-primary-500 focus:border-primary-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {paying ? 'Processing…' : `Pay ${formatCurrency(taxDue.totalDue ?? taxDue.amount)}`}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Tax information unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
