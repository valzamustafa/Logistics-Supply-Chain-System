import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Building2, PieChart, TrendingUp, TrendingDown, Box, Truck, Clock, CheckCircle, XCircle, Plus, Edit, Trash2, Users, MapPin, Phone } from 'lucide-react';
import { warehouseService, Warehouse, WarehouseZone, WarehouseStaff } from '../../services/warehouseService';
import { WarehouseInventory } from './Inventory';

type WarehouseDashboardView = 'warehouses' | 'inventory';

export function WarehouseDashboard() {
  const [activeView, setActiveView] = useState<WarehouseDashboardView>('warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [warehouseForm, setWarehouseForm] = useState({ name: '', location: '', phone: '' });
  const [zoneForm, setZoneForm] = useState({ warehouseId: 0, zoneName: '', description: '', capacity: 0 });
  const [staffForm, setStaffForm] = useState({ userId: 0, position: '', hireDate: '' });

  
  if (activeView === 'inventory') {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-slate-900">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setActiveView('warehouses')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              ← Back to Warehouses
            </button>
            <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          </div>
        </div>
        <WarehouseInventory />
      </div>
    );
  }

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getAll();
      setWarehouses(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
      setError('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async () => {
    try {
      await warehouseService.create(warehouseForm);
      await fetchWarehouses();
      setShowWarehouseModal(false);
      setWarehouseForm({ name: '', location: '', phone: '' });
    } catch (err) {
      console.error('Failed to create warehouse:', err);
    }
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;
    try {
      await warehouseService.update(editingWarehouse.id, {
        name: warehouseForm.name,
        location: warehouseForm.location,
        phone: warehouseForm.phone,
        isActive: editingWarehouse.isActive
      });
      await fetchWarehouses();
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: '', location: '', phone: '' });
    } catch (err) {
      console.error('Failed to update warehouse:', err);
    }
  };

  const handleDeleteWarehouse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await warehouseService.delete(id);
      await fetchWarehouses();
    } catch (err) {
      console.error('Failed to delete warehouse:', err);
    }
  };

  const handleCreateZone = async () => {
    if (!selectedWarehouse) return;
    try {
      await warehouseService.createZone({
        ...zoneForm,
        warehouseId: selectedWarehouse.id
      });
      await fetchWarehouses();
      setShowZoneModal(false);
      setZoneForm({ warehouseId: 0, zoneName: '', description: '', capacity: 0 });
    } catch (err) {
      console.error('Failed to create zone:', err);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedWarehouse) return;
    try {
      await warehouseService.assignStaff(selectedWarehouse.id, {
        userId: staffForm.userId,
        position: staffForm.position,
        hireDate: staffForm.hireDate
      });
      await fetchWarehouses();
      setShowStaffModal(false);
      setStaffForm({ userId: 0, position: '', hireDate: '' });
    } catch (err) {
      console.error('Failed to assign staff:', err);
    }
  };

  const handleRemoveStaff = async (staffId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await warehouseService.removeStaff(staffId);
      await fetchWarehouses();
    } catch (err) {
      console.error('Failed to remove staff:', err);
    }
  };

  const totalWarehouses = warehouses.length;
  const totalZones = warehouses.reduce((sum, w) => sum + (w.zones?.length || 0), 0);
  const totalStaff = warehouses.reduce((sum, w) => sum + (w.staff?.length || 0), 0);
  const totalCapacity = warehouses.reduce((sum, w) => 
    sum + (w.zones?.reduce((zoneSum, z) => zoneSum + z.capacity, 0) || 0), 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Warehouse Management</h1>
          <p className="text-slate-400 mt-1">Manage your warehouses, zones, and staff</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('inventory')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <TrendingDown className="w-4 h-4" />
            View Inventory
          </button>
          <button
            onClick={() => {
              setEditingWarehouse(null);
              setWarehouseForm({ name: '', location: '', phone: '' });
              setShowWarehouseModal(true);
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{totalWarehouses}</h3>
            <p className="text-slate-400 text-sm">Warehouses</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Box className="w-6 h-6 text-purple-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{totalZones}</h3>
            <p className="text-slate-400 text-sm">Zones</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{totalStaff}</h3>
            <p className="text-slate-400 text-sm">Staff Members</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-xl p-5 border border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <PieChart className="w-6 h-6 text-amber-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{totalCapacity.toLocaleString()}</h3>
            <p className="text-slate-400 text-sm">Total Capacity</p>
          </div>
        </div>
      </div>

      {/* Warehouses List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            {/* Warehouse Header */}
            <div className="p-5 border-b border-slate-700 bg-slate-800/80">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-white">{warehouse.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${warehouse.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {(warehouse.location || warehouse.phone) && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      {warehouse.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {warehouse.location}
                        </span>
                      )}
                      {warehouse.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {warehouse.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingWarehouse(warehouse);
                      setWarehouseForm({
                        name: warehouse.name,
                        location: warehouse.location || '',
                        phone: warehouse.phone || ''
                      });
                      setShowWarehouseModal(true);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition"
                  >
                    <Edit className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteWarehouse(warehouse.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Zones Section */}
            <div className="p-5 border-b border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-purple-400" />
                  <h4 className="font-medium text-white">Zones</h4>
                  <span className="text-xs text-slate-500">({warehouse.zones?.length || 0})</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedWarehouse(warehouse);
                    setZoneForm({ warehouseId: warehouse.id, zoneName: '', description: '', capacity: 0 });
                    setShowZoneModal(true);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Zone
                </button>
              </div>
              {warehouse.zones && warehouse.zones.length > 0 ? (
                <div className="space-y-2">
                  {warehouse.zones.map((zone) => (
                    <div key={zone.id} className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white text-sm font-medium">{zone.zoneName}</p>
                        {zone.description && (
                          <p className="text-slate-400 text-xs">{zone.description}</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">Capacity: {zone.capacity.toLocaleString()} units</p>
                      </div>
                      <button
                        onClick={() => warehouseService.deleteZone(zone.id).then(fetchWarehouses)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No zones defined</p>
              )}
            </div>

            {/* Staff Section */}
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <h4 className="font-medium text-white">Staff</h4>
                  <span className="text-xs text-slate-500">({warehouse.staff?.length || 0})</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedWarehouse(warehouse);
                    setStaffForm({ userId: 0, position: '', hireDate: '' });
                    setShowStaffModal(true);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Assign Staff
                </button>
              </div>
              {warehouse.staff && warehouse.staff.length > 0 ? (
                <div className="space-y-2">
                  {warehouse.staff.map((staff) => (
                    <div key={staff.id} className="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white text-sm font-medium">User ID: {staff.userId}</p>
                        {staff.position && (
                          <p className="text-slate-400 text-xs">{staff.position}</p>
                        )}
                        {staff.hireDate && (
                          <p className="text-slate-500 text-xs">Hired: {new Date(staff.hireDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(staff.id)}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No staff assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Warehouse Name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Phone"
                value={warehouseForm.phone}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                {editingWarehouse ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Add Zone to {selectedWarehouse?.name}</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Zone Name"
                value={zoneForm.zoneName}
                onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Description"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                placeholder="Capacity"
                value={zoneForm.capacity}
                onChange={(e) => setZoneForm({ ...zoneForm, capacity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowZoneModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateZone}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                Create Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Assign Staff to {selectedWarehouse?.name}</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="User ID"
                value={staffForm.userId || ''}
                onChange={(e) => setStaffForm({ ...staffForm, userId: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Position"
                value={staffForm.position}
                onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                placeholder="Hire Date"
                value={staffForm.hireDate}
                onChange={(e) => setStaffForm({ ...staffForm, hireDate: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStaffModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignStaff}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
              >
                Assign Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}