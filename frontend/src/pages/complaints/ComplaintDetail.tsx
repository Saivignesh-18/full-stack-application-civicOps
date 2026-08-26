import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as complaintService from '../../services/complaints';
import type { Complaint } from '../../services/complaints';
import * as employeeService from '../../services/employees';
import type { Employee } from '../../services/employees';
import { useAuth } from '../../context/AuthContext';

const ASSIGN_ROLES = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN', 'COMMISSIONER', 'ZONAL_OFFICER', 'DEPARTMENT_OFFICER'];
const STATUS_ROLES = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN', 'COMMISSIONER', 'ZONAL_OFFICER', 'DEPARTMENT_OFFICER', 'FIELD_OFFICER', 'EMPLOYEE'];

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const statusFlow = ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const role = user?.role || '';
  const canAssign = ASSIGN_ROLES.includes(role);
  const canUpdateStatus = STATUS_ROLES.includes(role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchComplaint();
    }
  }, [id]);

  useEffect(() => {
    if (canAssign) {
      employeeService.getEmployees().then(setEmployees).catch(() => setEmployees([]));
    }
  }, [canAssign]);

  async function handleAssign() {
    if (!id || !selectedEmployee) return;
    setActing(true);
    try {
      await complaintService.assignComplaint(id, selectedEmployee);
      toast.success('Complaint assigned');
      setSelectedEmployee('');
      fetchComplaint();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign');
    } finally {
      setActing(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!id) return;
    setActing(true);
    try {
      await complaintService.updateComplaintStatus(id, status);
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      fetchComplaint();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActing(false);
    }
  }

  async function fetchComplaint() {
    try {
      setLoading(true);
      const data = await complaintService.getComplaint(id!);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !id) return;

    setSubmittingComment(true);
    try {
      await complaintService.addComplaintComment(id, comment);
      toast.success('Comment added');
      setComment('');
      fetchComplaint();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 max-w-md mx-auto">
          {error || 'Complaint not found'}
        </div>
        <Link to="/complaints" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          &larr; Back to complaints
        </Link>
      </div>
    );
  }

  const currentStatusIndex = statusFlow.indexOf(complaint.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/complaints" className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to complaints
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{complaint.complaintNumber}</h1>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[complaint.status]}`}>
            {complaint.status.replace('_', ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[complaint.priority]}`}>
            {complaint.priority}
          </span>
        </div>
      </div>

      {/* Status Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Progress</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"></div>
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all"
            style={{ width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%` }}
          ></div>
          <div className="relative flex justify-between">
            {statusFlow.map((status, index) => (
              <div key={status} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                    index <= currentStatusIndex
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}
                >
                  {index < currentStatusIndex ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-600">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Complaint Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-gray-900">{complaint.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-gray-900">{complaint.description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-gray-900">{complaint.address}</dd>
              </div>
              {complaint.resolutionNotes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Resolution Notes</dt>
                  <dd className="mt-1 text-gray-900">{complaint.resolutionNotes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            <div className="flow-root">
              <ul className="-mb-8">
                {complaint.timeline && complaint.timeline.length > 0 ? (
                  complaint.timeline.map((item, index) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {index !== complaint.timeline!.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900">{item.action}</div>
                            <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(item.createdAt).toLocaleString()}
                              {item.user && ` by ${item.user.name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 text-sm">No activity yet</li>
                )}
              </ul>
            </div>

            {/* Add Comment */}
            <form onSubmit={handleAddComment} className="mt-6 pt-6 border-t">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Add a comment
              </label>
              <textarea
                id="comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Write your comment..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!comment.trim() || submittingComment}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Officer Actions */}
          {(canAssign || canUpdateStatus) && !['CLOSED', 'REJECTED'].includes(complaint.status) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

              {/* Assign to employee */}
              {canAssign && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select an employee…</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.userId}>
                        {emp.name} — {emp.designation}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={acting || !selectedEmployee}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Assign
                  </button>
                </div>
              )}

              {/* Status transitions */}
              {canUpdateStatus && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-1">Update status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {complaint.status !== 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={acting}
                        className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
                      >
                        Start Progress
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange('RESOLVED')}
                      disabled={acting}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleStatusChange('CLOSED')}
                      disabled={acting}
                      className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                    >
                      Close
                    </button>
                    {canAssign && (
                      <button
                        onClick={() => handleStatusChange('REJECTED')}
                        disabled={acting}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignment Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
            <dl className="space-y-4">
              {complaint.department ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Department</dt>
                  <dd className="mt-1 text-gray-900">{complaint.department.name}</dd>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not assigned to a department</p>
              )}
              {complaint.assignedTo ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 text-gray-900">{complaint.assignedTo.name}</dd>
                  <dd className="text-sm text-gray-500">{complaint.assignedTo.email}</dd>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not assigned to an employee</p>
              )}
            </dl>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(complaint.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                  <dd className="mt-1 text-gray-900">
                    {new Date(complaint.resolvedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Citizen Info (for admins/employees) */}
          {complaint.citizen && user?.role !== 'CITIZEN' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Complainant</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-gray-900">{complaint.citizen.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-gray-900">{complaint.citizen.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-gray-900">{complaint.citizen.phone}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
