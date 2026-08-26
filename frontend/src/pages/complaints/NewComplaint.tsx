import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import * as complaintService from '../../services/complaints';

const complaintSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  address: z.string().min(10, 'Please provide a detailed address'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

const categories = [
  'Garbage Collection',
  'Street Light',
  'Road Damage',
  'Drainage Problem',
  'Water Supply',
  'Illegal Construction',
  'Encroachment',
  'Noise Pollution',
  'Sanitation',
  'Public Safety',
  'Other',
];

export default function NewComplaint() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      priority: 'MEDIUM',
    },
  });

  const selectedPriority = watch('priority');

  const onSubmit = async (data: ComplaintFormData) => {
    setIsLoading(true);
    try {
      await complaintService.createComplaint(data);
      toast.success('Complaint submitted successfully!');
      navigate('/complaints');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit complaint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit a Complaint</h1>
        <p className="text-gray-600">Report civic issues in your area</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              {...register('category')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Provide a detailed description of the issue..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Location / Address <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('address')}
              rows={2}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                errors.address ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Provide the exact location of the issue..."
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                <label
                  key={priority}
                  className={`flex items-center justify-center p-3 border-2 rounded-md cursor-pointer transition-colors ${
                    selectedPriority === priority
                      ? priority === 'URGENT'
                        ? 'border-red-500 bg-red-50'
                        : priority === 'HIGH'
                        ? 'border-orange-500 bg-orange-50'
                        : priority === 'MEDIUM'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-500 bg-gray-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    {...register('priority')}
                    type="radio"
                    value={priority}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-medium ${
                      priority === 'URGENT'
                        ? 'text-red-600'
                        : priority === 'HIGH'
                        ? 'text-orange-600'
                        : priority === 'MEDIUM'
                        ? 'text-yellow-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {priority}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attach Photos (Optional)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to upload photos</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                </div>
                <input type="file" className="hidden" accept="image/*" multiple />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/complaints')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Complaint'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
