import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as licenseService from '../services/licenses';
import type { TradeLicense, LicenseWorkflowStep } from '../services/licenses';
import { useAuth } from '../context/AuthContext';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  DOCUMENT_REVIEW: 'bg-indigo-100 text-indigo-800',
  INSPECTION: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  ISSUED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const APPROVER_ROLES = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN', 'COMMISSIONER'];
const REVIEWER_ROLES = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN', 'COMMISSIONER', 'ZONAL_OFFICER', 'DEPARTMENT_OFFICER'];
const APPROVABLE_STATUSES = ['SUBMITTED', 'DOCUMENT_REVIEW', 'OFFICER_REVIEW', 'INSPECTION'];

const formatCurrency = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
    : '-';

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

export default function LicenseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [license, setLicense] = useState<(TradeLicense & { workflow?: LicenseWorkflowStep[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const role = user?.role || '';
  const canApprove = APPROVER_ROLES.includes(role);
  const canReview = REVIEWER_ROLES.includes(role);

  useEffect(() => {
    if (id) fetchLicense();
  }, [id]);

  async function fetchLicense() {
    try {
      setLoading(true);
      setError(null);
      const data = await licenseService.getLicense(id!);
      setLicense(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load license');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartReview() {
    if (!id) return;
    setActing(true);
    try {
      await licenseService.startDocumentReview(id);
      toast.success('Document review started');
      fetchLicense();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActing(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setActing(true);
    try {
      await licenseService.approveLicense(id);
      toast.success('License approved');
      fetchLicense();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!id) return;
    if (rejectReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }
    setActing(true);
    try {
      await licenseService.rejectLicense(id, rejectReason.trim());
      toast.success('License rejected');
      setShowReject(false);
      setRejectReason('');
      fetchLicense();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setActing(false);
    }
  }

  async function handlePay() {
    if (!id) return;
    setActing(true);
    try {
      await licenseService.payLicenseFee(id, 'UPI');
      toast.success('Payment recorded, license issued');
      fetchLicense();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 max-w-md mx-auto">
          {error || 'License not found'}
        </div>
        <Link to="/licenses" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          &larr; Back to licenses
        </Link>
      </div>
    );
  }

  const canApproveNow = canApprove && APPROVABLE_STATUSES.includes(license.status);
  const canRejectNow = canApprove && !['ISSUED', 'CANCELLED', 'REJECTED'].includes(license.status);
  const canReviewNow = canReview && license.status === 'SUBMITTED';
  const canPayNow = license.status === 'APPROVED';

  const hasActions = canApproveNow || canRejectNow || canReviewNow || canPayNow;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/licenses" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to licenses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{license.businessName}</h1>
          <p className="text-gray-500">{license.applicationNumber}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[license.status]}`}>
          {license.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">License Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                <dd className="mt-1 text-gray-900">{license.businessType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-gray-900">{license.businessCategory || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900">{license.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employees</dt>
                <dd className="mt-1 text-gray-900">{license.employeeCount ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Annual Turnover</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(license.annualTurnover)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fee</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(license.fee)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">License Number</dt>
                <dd className="mt-1 text-gray-900">{license.licenseNumber || 'Not issued'}</dd>
              </div>
            </dl>
          </div>

          {/* Workflow timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow History</h2>
            {license.workflow && license.workflow.length > 0 ? (
              <ul className="space-y-4">
                {license.workflow.map((step) => (
                  <li key={step.id} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                      step.status === 'APPROVED' || step.status === 'COMPLETED' ? 'bg-green-500'
                        : step.status === 'REJECTED' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {step.step.replace(/_/g, ' ')} — <span className="font-normal text-gray-500">{step.status}</span>
                      </p>
                      {step.comments && <p className="text-sm text-gray-600">{step.comments}</p>}
                      <p className="text-xs text-gray-400">{new Date(step.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No workflow activity yet</p>
            )}
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

            {!hasActions && (
              <p className="text-sm text-gray-500">
                No actions available for your role in the current status.
              </p>
            )}

            <div className="space-y-3">
              {canReviewNow && (
                <button
                  onClick={handleStartReview}
                  disabled={acting}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Start Document Review
                </button>
              )}

              {canApproveNow && (
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Approve License
                </button>
              )}

              {canRejectNow && !showReject && (
                <button
                  onClick={() => setShowReject(true)}
                  disabled={acting}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              )}

              {canRejectNow && showReject && (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for rejection (min 10 characters)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={acting}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setShowReject(false); setRejectReason(''); }}
                      disabled={acting}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {canPayNow && (
                <button
                  onClick={handlePay}
                  disabled={acting}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Pay Fee &amp; Issue
                </button>
              )}
            </div>

            {license.status === 'REJECTED' && (license as any).rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-medium text-red-700">Rejection reason</p>
                <p className="text-sm text-red-600">{(license as any).rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Applied</dt>
                <dd className="text-gray-900">{formatDate(license.applicationDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Approved</dt>
                <dd className="text-gray-900">{formatDate(license.approvalDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Issued</dt>
                <dd className="text-gray-900">{formatDate(license.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Valid Until</dt>
                <dd className="text-gray-900">{formatDate(license.expiryDate)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
