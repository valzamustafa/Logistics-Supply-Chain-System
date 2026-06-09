// frontend/src/components/vehicles/VehicleManagementModal.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Truck, Package, Car, Bike } from 'lucide-react';
import { vehicleService, DriverVehicle } from '../../services/driverService';
import { useToast } from '../../hooks/useToast';

interface VehicleManagementModalProps {
  vehicle?: DriverVehicle | null;
  onClose: () => void;
  onSuccess: () => void;
  isDriverMode?: boolean;
}

export function VehicleManagementModal({ vehicle, onClose, onSuccess, isDriverMode = false }: VehicleManagementModalProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    capacity: 0,
    isAvailable: true,
    vehicleType: 'truck' as 'truck' | 'van' | 'car' | 'motorcycle',
    year: new Date().getFullYear(),
    color: '',
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        capacity: vehicle.capacity,
        isAvailable: vehicle.isAvailable,
        vehicleType: vehicle.vehicleType || 'truck',
        year: vehicle.year || new Date().getFullYear(),
        color: vehicle.color || '',
      });
      setImagePreview(vehicle.imageUrl || null);
    }
  }, [vehicle]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!formData.plateNumber || !formData.model) {
      showToast('error', 'Plate number and model are required');
      return;
    }

    setLoading(true);
    try {
      const imageUrl = imageFile ? await readFileAsDataUrl(imageFile) : imagePreview;
      const submitData = {
        plateNumber: formData.plateNumber,
        model: formData.model,
        capacity: formData.capacity,
        isAvailable: formData.isAvailable,
        vehicleType: formData.vehicleType,
        year: formData.year,
        color: formData.color,
        imageUrl,
      };

      if (isDriverMode) {
        if (vehicle) {
          await vehicleService.updateMyVehicle(vehicle.id, submitData);
        } else {
          await vehicleService.createMyVehicle(submitData);
        }
      } else {

        if (vehicle) {
          await vehicleService.update(vehicle.id, submitData);
        } else {
          await vehicleService.create(submitData);
        }
      }

      showToast('success', vehicle ? 'Vehicle updated successfully' : 'Vehicle created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save vehicle:', error);
      showToast('error', error.message || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleTypeIcon = () => {
    switch (formData.vehicleType) {
      case 'truck': return <Truck className="w-5 h-5" />;
      case 'van': return <Package className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      case 'motorcycle': return <Bike className="w-5 h-5" />;
      default: return <Truck className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {vehicle ? 'Edit Vehicle' : (isDriverMode ? 'Register Your Vehicle' : 'Add New Vehicle')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Vehicle Photo</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Vehicle preview"
                    className="w-24 h-24 rounded-xl object-cover border border-slate-200"
                  />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  {getVehicleTypeIcon()}
                </div>
              )}
                  <label className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-sm cursor-pointer text-center transition">
                    <Upload className="w-4 h-4 inline mr-2" />
                    {t('vehicles.uploadImage', 'Upload Image')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      readFileAsDataUrl(file)
                        .then(setImagePreview)
                        .catch(() => showToast('error', 'Failed to read image file'));
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">Vehicle Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['truck', 'van', 'car', 'motorcycle'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicleType: type })}
                  className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                    formData.vehicleType === type
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {type === 'truck' && <Truck className="w-5 h-5" />}
                  {type === 'van' && <Package className="w-5 h-5" />}
                  {type === 'car' && <Car className="w-5 h-5" />}
                  {type === 'motorcycle' && <Bike className="w-5 h-5" />}
                  <span className="text-xs capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-1">Plate Number *</label>
            <input
              type="text"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g., AA 123 BB"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-1">Model *</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
              placeholder="e.g., Mercedes Actros, Ford Transit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-500 mb-1">Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                placeholder="e.g., White, Red"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-1">Capacity (kg)</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
              placeholder="Max load capacity in kg"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-slate-700">{t('vehicles.availableForAssignments', 'Available for assignments')}</span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 btn-ghost">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary">
            {loading ? t('common.saving', 'Saving...') : (vehicle ? t('vehicles.update', 'Update') : (isDriverMode ? t('vehicles.register', 'Register') : t('vehicles.create', 'Create')))}
          </button>
        </div>
      </div>
    </div>
  );
}
