import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import * as buildingService from '../services/buildingPermits';

const schema = z.object({
  plotAddress: z.string().min(10, 'Please provide the full plot address'),
  buildingType: z.string().min(1, 'Please select a building type'),
  plotArea: z.coerce.number().positive('Plot area must be greater than 0'),
  proposedBuiltUpArea: z.coerce.number().positive('Built-up area must be greater than 0'),
  numberOfFloors: z.coerce.number().min(1, 'At least 1 floor'),
});

type FormData = z.infer<typeof schema>;

const buildingTypes = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE'];

export default function NewBuildingPermit() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { numberOfFloors: 1 },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const created = await buildingService.createBuildingApplication(data);
      toast.success('Application submitted');
      navigate(`/building-permits/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apply for Building Permit</h1>
        <p className="text-gray-600">Submit a new construction / building permit application</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plot Address <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('plotAddress')}
              rows={2}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.plotAddress ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Full address of the plot"
            />
            {errors.plotAddress && <p className="mt-1 text-sm text-red-600">{errors.plotAddress.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('buildingType')}
              defaultValue=""
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.buildingType ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="" disabled>Select building type</option>
              {buildingTypes.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            {errors.buildingType && <p className="mt-1 text-sm text-red-600">{errors.buildingType.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plot Area (sq ft) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('plotArea')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.plotArea ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. 2400"
              />
              {errors.plotArea && <p className="mt-1 text-sm text-red-600">{errors.plotArea.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Built-up Area (sq ft) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('proposedBuiltUpArea')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.proposedBuiltUpArea ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. 1800"
              />
              {errors.proposedBuiltUpArea && <p className="mt-1 text-sm text-red-600">{errors.proposedBuiltUpArea.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floors <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('numberOfFloors')}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.numberOfFloors ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. 2"
              />
              {errors.numberOfFloors && <p className="mt-1 text-sm text-red-600">{errors.numberOfFloors.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/building-permits')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
