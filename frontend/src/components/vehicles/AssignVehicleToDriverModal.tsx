// frontend/src/components/vehicles/AssignVehicleToDriverModal.tsx
import { useState } from 'react';
import { X, User } from 'lucide-react';
import { Vehicle, vehicleService, Driver } from '../../services/driverService';
import { useToast } from '../../hooks/useToast';

interface AssignVehicleToDriverModalProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignVehicleToDriverModal({ drivers, vehicles, onClose, onSuccess }: AssignVehicleToDriverModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!selectedDriverId || !selectedVehicleId) {
      showToast('error', 'Please select both a driver and a vehicle');
      return;
    }

    setLoading(true);
    try {
      await vehicleService.assignToDriver({
        driverId: selectedDriverId,
        vehicleId: selectedVehicleId,
      });
      showToast('success', 'Vehicle assigned to driver successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to assign vehicle');
    } finally {
      setLoading(false);
    }
  };

  const availableVehicles = vehicles.filter(v => v.isAvailable);
  const availableDrivers = drivers.filter(d => d.isAvailable);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Assign Vehicle to Driver</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Select Driver</label>
            <select
              value={selectedDriverId || ''}
              onChange={(e) => setSelectedDriverId(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Choose a driver...</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName} - {driver.licenseNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">Select Vehicle</label>
            <select
              value={selectedVehicleId || ''}
              onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Choose a vehicle...</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} - {vehicle.model} ({vehicle.capacity}kg)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}