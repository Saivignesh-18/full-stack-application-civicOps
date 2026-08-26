import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as buildingService from '../services/buildingPermits';
import type { BuildingApplication, BuildingWorkflowStep } from '../services/buildingPermits';
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

const APPROVER_ROLES = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN', 'COMMISSIONER'];
const APPROVABLE_STATUSES = ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'INSPECTION', 'OFFICER_REVIEW', 'SENIOR_REVIEW'];

const formatCurrency = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
    : '-';

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function BuildingPermitDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [app, setApp] = useState<(BuildingApplication & { workflow?: BuildingWorkflowStep[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const role = user?.role || '';
  const canApprove = APPROVER_ROLES.includes(role);

  useEffect(() => {
    if (id) fetchApp();
  }, [id]);

  async function fetchApp() {
    try {
      setLoading(true);
      setError(null);
      setApp(await buildingService.getBuildingApplication(id!));
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setActing(true);
    try {
      await buildingService.approveBuilding(id);
      toast.success('Application approved');
      fetchApp();
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
      await buildingService.rejectBuilding(id, rejectReason.trim());
      toast.success('Application rejected');
      setShowReject(false);
      setRejectReason('');
      fetchApp();
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
      await buildingService.payBuildingFee(id, 'UPI');
      toast.success('Payment recorded, permit issued');
      fetchApp();
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

  if (error || !app) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 max-w-md mx-auto">
          {error || 'Application not found'}
        </div>
        <Link to="/building-permits" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          &larr; Back to building permits
        </Link>
      </div>
    );
  }

  const canApproveNow = canApprove && APPROVABLE_STATUSES.includes(app.status);
  const canRejectNow = canApprove && !['REJECTED', 'PERMIT_ISSUED'].includes(app.status);
  const canPayNow = app.status === 'APPROVED';
  const hasActions = canApproveNow || canRejectNow || canPayNow;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/building-permits" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to building permits
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{app.applicationNumber}</h1>
          <p className="text-gray-500">{app.plotAddress}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[app.status]}`}>
          {app.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Building Type</dt>
                <dd className="mt-1 text-gray-900">{app.buildingType.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Plot Area</dt>
                <dd className="mt-1 text-gray-900">{app.plotArea} sq ft</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Proposed Built-up Area</dt>
                <dd className="mt-1 text-gray-900">{app.proposedBuiltUpArea} sq ft</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Floors</dt>
                <dd className="mt-1 text-gray-900">{app.numberOfFloors}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fee</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(app.fee)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Permit Number</dt>
                <dd className="mt-1 text-gray-900">{app.permitNumber || 'Not issued'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow History</h2>
            {app.workflow && app.workflow.length > 0 ? (
              <ul className="space-y-4">
                {app.workflow.map((step) => (
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

        {/* Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

            {!hasActions && (
              <p className="text-sm text-gray-500">No actions available for your role in the current status.</p>
            )}

            <div className="space-y-3">
              {canApproveNow && (
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Application
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
                  Pay Fee &amp; Get Permit
                </button>
              )}
            </div>

            {app.status === 'REJECTED' && app.rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-medium text-red-700">Rejection reason</p>
                <p className="text-sm text-red-600">{app.rejectionReason}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-gray-500">Applied</dt><dd className="text-gray-900">{formatDate(app.applicationDate)}</dd></div>
              <div><dt className="text-gray-500">Approved</dt><dd className="text-gray-900">{formatDate(app.approvalDate)}</dd></div>
              <div><dt className="text-gray-500">Permit Issued</dt><dd className="text-gray-900">{formatDate(app.permitIssueDate)}</dd></div>
              <div><dt className="text-gray-500">Permit Expires</dt><dd className="text-gray-900">{formatDate(app.permitExpiryDate)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
