import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { warehouseService, Warehouse } from '../../services/warehouseService';
import { inventoryService, InventoryItem } from '../../services/inventoryService';
import { AssignProductToWarehouseModal } from '../../components/warehouse/AssignProductToWarehouseModal';
import { WarehouseCard } from '../../components/warehouse/WarehouseCard';

interface WarehouseStats {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
}

export function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [warehouseStats, setWarehouseStats] = useState<Record<number, WarehouseStats>>({});
  const [formData, setFormData] = useState({ name: '', location: '', phone: '' });
  const [showAssignProductModal, setShowAssignProductModal] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      console.log('Fetching warehouses...');
      const data = await warehouseService.getAll();
      console.log('Warehouses fetched:', data);
      setWarehouses(data || []);

      // Only fetch stats if we have warehouses
      if (data && data.length > 0) {
        const stats: Record<number, WarehouseStats> = {};
        for (const warehouse of data) {
          try {
            const inventory: InventoryItem[] = await inventoryService.getByWarehouse(warehouse.id);
            stats[warehouse.id] = {
              totalProducts: inventory?.length || 0,
              totalStock: inventory?.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0) || 0,
              lowStock: inventory?.filter((item: InventoryItem) => item.isLowStock).length || 0
            };
          } catch (err) {
            console.warn(`Failed to get inventory for warehouse ${warehouse.id}:`, err);
            stats[warehouse.id] = { totalProducts: 0, totalStock: 0, lowStock: 0 };
          }
        }
        setWarehouseStats(stats);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch warehouses:', err);
      setError(err.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Warehouse name is required');
      return;
    }

    try {
      console.log('Saving warehouse:', formData);
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, {
          name: formData.name,
          location: formData.location,
          phone: formData.phone,
          isActive: editingWarehouse.isActive
        });
      } else {
        await warehouseService.create(formData);
      }
      await fetchWarehouses();
      setShowModal(false);
      setEditingWarehouse(null);
      setFormData({ name: '', location: '', phone: '' });
    } catch (err: any) {
      console.error('Failed to save warehouse:', err);
      setError(err.message || 'Failed to save warehouse');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await warehouseService.delete(id);
      await fetchWarehouses();
    } catch (err) {
      setError('Failed to delete warehouse');
    }
  };

  if (loading) {
    return (
        <div className="flex h-full items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  return (
      <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Warehouse Management</h1>
            <p className="text-slate-400 mt-1">Manage all warehouses and view their inventory statistics</p>
          </div>
          <button
              onClick={() => {
                setEditingWarehouse(null);
                setFormData({ name: '', location: '', phone: '' });
                setShowModal(true);
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {warehouses.length === 0 ? (
              <div className="col-span-full text-center text-slate-400 py-12">
                No warehouses found. Click "Add Warehouse" to create your first warehouse.
              </div>
          ) : (
              warehouses.map((warehouse) => {
                const stats = warehouseStats[warehouse.id] || { totalProducts: 0, totalStock: 0, lowStock: 0 };
                return (
                    <WarehouseCard
                        key={warehouse.id}
                        warehouse={warehouse}
                        stats={stats}
                        onViewDetails={() => setSelectedWarehouse(warehouse)}
                        onEdit={(warehouse) => {
                          setEditingWarehouse(warehouse);
                          setFormData({ name: warehouse.name, location: warehouse.location || '', phone: warehouse.phone || '' });
                          setShowModal(true);
                        }}
                        onDelete={handleDelete}
                    />
                );
              })
          )}
        </div>

        {/* Warehouse Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
              <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 border border-slate-700" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold text-white mb-4">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Warehouse Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                  <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                  <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
                  <button onClick={handleSave} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">{editingWarehouse ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
        )}

        {/* Warehouse Details Modal */}
        {selectedWarehouse && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedWarehouse(null)}>
              <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 border border-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">{selectedWarehouse.name} - Details</h2>
                  <button onClick={() => setSelectedWarehouse(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Contact Information</h3>
                    <p className="text-slate-300">Location: {selectedWarehouse.location || 'Not specified'}</p>
                    <p className="text-slate-300">Phone: {selectedWarehouse.phone || 'Not specified'}</p>
                    <p className="text-slate-300">Status: {selectedWarehouse.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  {selectedWarehouse.zones && selectedWarehouse.zones.length > 0 && (
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">Zones</h3>
                        <div className="space-y-2">
                          {selectedWarehouse.zones.map((zone: { id: number; zoneName: string; capacity: number }) => (
                              <div key={zone.id} className="flex justify-between items-center border-b border-slate-600 pb-2">
                                <span className="text-slate-300">{zone.zoneName}</span>
                                <span className="text-slate-400 text-sm">Capacity: {zone.capacity} units</span>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}
                  {selectedWarehouse.staff && selectedWarehouse.staff.length > 0 && (
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">Staff</h3>
                        <div className="space-y-2">
                          {selectedWarehouse.staff.map((staff: { id: number; userId: number; position: string | null }) => (
                              <div key={staff.id} className="flex justify-between items-center border-b border-slate-600 pb-2">
                                <span className="text-slate-300">User #{staff.userId}</span>
                                <span className="text-slate-400 text-sm">{staff.position || 'Staff'}</span>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAssignProductModal(true)} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Assign Product</button>
                  <button onClick={() => setSelectedWarehouse(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Close</button>
                </div>
              </div>
            </div>
        )}

        {/* Assign Product Modal - rendered outside the details modal */}
        {showAssignProductModal && selectedWarehouse && (
            <AssignProductToWarehouseModal
                warehouseId={selectedWarehouse.id}
                warehouseName={selectedWarehouse.name}
                onClose={() => setShowAssignProductModal(false)}
                onSuccess={() => {
                  setShowAssignProductModal(false);
                  fetchWarehouses();
                }}
            />
        )}
      </div>
  );
}