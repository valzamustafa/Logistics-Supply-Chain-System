
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Truck, MapPin, Navigation, RefreshCw, User, Eye } from 'lucide-react';
import { vehicleService, Vehicle, Driver } from '../services/driverService';
import { driverService } from '../services/driverService';
import { useToast } from '../hooks/useToast';
import { ConfirmModal } from '../components/ConfirmModal';
import { VehicleManagementModal } from '../components/vehicles/VehicleManagementModal';
import { AssignVehicleToDriverModal } from '../components/vehicles/AssignVehicleToDriverModal';
import { VehicleLiveTracker } from '../components/vehicles/VehicleLiveTracker';
import { useAuth } from '../hooks/useAuth';

export function VehiclesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
  const [vehicleStats, setVehicleStats] = useState<Record<number, { status: string; progress: number; location: string }>>({});

  const isAdmin = user?.roles.includes('Admin');
  const isManager = user?.roles.includes('Manager');
  const canEdit = isAdmin || isManager;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesData, driversData] = await Promise.all([
        vehicleService.getAll(),
        driverService.getAll(),
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      
      const stats: Record<number, any> = {};
      for (const vehicle of vehiclesData) {
        stats[vehicle.id] = {
          status: vehicle.isAvailable ? 'available' : 'maintenance',
          progress: Math.floor(Math.random() * 100),
          location: Math.random() > 0.5 ? t('vehicles.inRouteHighway', 'In Route - Highway A1') : t('inventory.warehouse', 'Warehouse'),
        };
      }
      setVehicleStats(stats);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      showToast('error', t('vehicles.failedToLoad', 'Failed to load vehicles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (vehicle: Vehicle) => {
    setConfirmDialog({
      title: t('vehicles.deleteVehicle', 'Delete Vehicle'),
      message: t('vehicles.deleteVehicleConfirmation', 'Are you sure you want to delete vehicle {{plate}}?', { plate: vehicle.plateNumber }),
      onConfirm: async () => {
        try {
          await vehicleService.delete(vehicle.id);
          await fetchData();
          showToast('success', t('vehicles.deletedSuccessfully', 'Vehicle deleted successfully'));
        } catch (error: any) {
          showToast('error', error.message || t('vehicles.failedToDelete', 'Failed to delete vehicle'));
        }
      }
    });
  };

  const statusColors: Record<string, string> = {
    'available': 'bg-green-500/20 text-green-400',
    'in-transit': 'bg-blue-500/20 text-blue-400',
    'maintenance': 'bg-red-500/20 text-red-400',
    'offline': 'bg-slate-500/20 text-slate-400'
  };

  const statusLabels: Record<string, string> = {
    'available': t('vehicles.available', 'Available'),
    'in-transit': t('vehicles.inTransit', 'In Transit'),
    'maintenance': t('vehicles.maintenance', 'Maintenance'),
    'offline': t('vehicles.offline', 'Offline')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">{t('vehicles.loading', 'Loading vehicles...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('vehicles.managementTitle', 'Vehicle Management')}</h1>
          <p className="text-slate-500 mt-1">{t('vehicles.managementDescription', 'Manage fleet vehicles, track locations, and assign to drivers')}</p>
        </div>
        {canEdit && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingVehicle(null);
                setShowVehicleModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('vehicles.addVehicle', 'Add Vehicle')}
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <User className="w-4 h-4" />
              {t('adminDashboard.assignToDriver', 'Assign to Driver')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => {
          const stats = vehicleStats[vehicle.id] || { status: vehicle.isAvailable ? 'available' : 'offline', progress: 0, location: t('adminDashboard.unknown', 'Unknown') };
          const assignedDriver = drivers.find(d => d.id === vehicle.driverId);
          
          return (
            <div key={vehicle.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-cyan-500/50 transition-all duration-300">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {vehicle.imageUrl ? (
                      <img src={vehicle.imageUrl} alt={vehicle.model} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-cyan-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{vehicle.plateNumber}</h3>
                      <p className="text-slate-500 text-sm">{vehicle.model} ({vehicle.year})</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[stats.status]}`}>
                    {statusLabels[stats.status]}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">{t('vehicles.type', 'Vehicle Type')}</p>
                    <p className="text-slate-900 font-medium capitalize">{vehicle.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('vehicles.capacity', 'Capacity')}</p>
                    <p className="text-slate-900 font-medium">{vehicle.capacity} kg</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('adminDashboard.color', 'Color')}</p>
                    <div className="flex items-center gap-2">
                      {vehicle.color && (
                        <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: vehicle.color }} />
                      )}
                      <p className="text-slate-900 font-medium">{vehicle.color || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('vehicles.driver', 'Driver')}</p>
                    <p className="text-slate-900 font-medium">{assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : t('adminDashboard.notAssigned', 'Not assigned')}</p>
                  </div>
                </div>

                {stats.location && (
                  <div className="flex items-center gap-2 text-sm bg-slate-100 rounded-lg p-2">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    <span className="text-slate-600">{stats.location}</span>
                  </div>
                )}

                {stats.status === 'in-transit' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('adminDashboard.routeProgress', 'Route Progress')}</span>
                      <span className="text-cyan-500 font-semibold">{stats.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: `${stats.progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowTrackerModal(vehicle)}
                    className="flex-1 btn-primary text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    {t('driverDashboard.liveTracking', 'Live Tracking')}
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setShowVehicleModal(true);
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
            <Truck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">{t('vehicles.noVehicles', 'No vehicles found')}</p>
            {canEdit && (
              <button
                onClick={() => setShowVehicleModal(true)}
                className="mt-4 btn-primary"
              >
                {t('vehicles.addFirstVehicle', 'Add your first vehicle')}
              </button>
            )}
          </div>
        )}
      </div>

      {showVehicleModal && (
        <VehicleManagementModal
          vehicle={editingVehicle}
          onClose={() => {
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {showAssignModal && (
        <AssignVehicleToDriverModal
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setShowAssignModal(false)}
          onSuccess={fetchData}
        />
      )}

      {showTrackerModal && (
        <VehicleLiveTracker
          vehicleId={showTrackerModal.id}
          plateNumber={showTrackerModal.plateNumber}
          model={showTrackerModal.model}
          imageUrl={showTrackerModal.imageUrl}
          color={showTrackerModal.color}
          onClose={() => setShowTrackerModal(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={t('common.delete', 'Delete')}
          cancelLabel={t('common.cancel', 'Cancel')}
          onConfirm={async () => {
            await confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
