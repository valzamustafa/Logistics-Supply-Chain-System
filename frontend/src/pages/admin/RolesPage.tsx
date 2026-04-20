import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface Role {
  id: number;
  name: string;
  description: string;
  userCount: number;
  createdAt: string;
  permissions?: string[];
}

interface Permission {
  id: number;
  name: string;
  category: string;
  description: string;
}

export function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const [editRole, setEditRole] = useState({ id: 0, name: '', description: '' });

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const rolesData = await api.get<Role[]>('/api/auth/roles');
      setRoles(rolesData);
      if (rolesData.length > 0) setSelectedRole(rolesData[0]);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const permsData = await api.get<Permission[]>('/api/auth/permissions');
      setPermissions(permsData);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      const created = await api.post<Role>('/api/auth/roles', {
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions
      });
      setRoles([...roles, created]);
      setShowAddModal(false);
      setNewRole({ name: '', description: '', permissions: [] });
      alert('Role created successfully');
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    try {
      const updated = await api.put<Role>(`/api/auth/roles/${editRole.id}`, {
        name: editRole.name,
        description: editRole.description
      });
      setRoles(roles.map(r => r.id === updated.id ? updated : r));
      if (selectedRole?.id === updated.id) setSelectedRole(updated);
      setShowEditModal(false);
      alert('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (roleName === 'Admin') {
      alert('Cannot delete Admin role');
      return;
    }
    if (window.confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      try {
        await api.delete(`/api/auth/roles/${roleId}`);
        setRoles(roles.filter(r => r.id !== roleId));
        if (selectedRole?.id === roleId) setSelectedRole(null);
        alert('Role deleted successfully');
      } catch (error) {
        console.error('Failed to delete role:', error);
        alert('Failed to delete role');
      }
    }
  };

  const handleUpdatePermissions = async (roleId: number, permissionNames: string[]) => {
    try {
      await api.put(`/api/auth/roles/${roleId}/permissions`, { permissions: permissionNames });
      setRoles(roles.map(r => r.id === roleId ? { ...r, permissions: permissionNames } : r));
      alert('Permissions updated successfully');
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'Admin': return 'bg-purple-500/20 text-purple-400';
      case 'Manager': return 'bg-blue-500/20 text-blue-400';
      case 'Driver': return 'bg-green-500/20 text-green-400';
      case 'WarehouseStaff': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Role Management</h1>
          <p className="text-slate-400">Create, edit, and manage system roles and permissions</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition"
        >
          + Add New Role
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Roles</h2>
            <span className="text-sm text-slate-400">{roles.length} total</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  selectedRole?.id === role.id
                    ? 'border-cyan-500 bg-slate-800'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(role.name)}`}>
                        {role.name}
                      </span>
                      <span className="text-xs text-slate-500">{role.userCount || 0} users</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">{role.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditRole({ id: role.id, name: role.name, description: role.description }); setShowEditModal(true); }}
                      className="text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      Edit
                    </button>
                    {role.name !== 'Admin' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedRole.name} - Permissions</h2>
                  <p className="text-sm text-slate-400">{selectedRole.description}</p>
                </div>
                <button 
                  onClick={() => handleUpdatePermissions(selectedRole.id, selectedRole.permissions || [])}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-white text-sm hover:bg-cyan-400 transition"
                >
                  Save Changes
                </button>
              </div>
              
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-white mb-3 border-b border-slate-700 pb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRole.permissions?.includes(perm.name) || false}
                            onChange={(e) => {
                              const newPermissions = e.target.checked
                                ? [...(selectedRole.permissions || []), perm.name]
                                : (selectedRole.permissions || []).filter(p => p !== perm.name);
                              setSelectedRole({ ...selectedRole, permissions: newPermissions });
                            }}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                          />
                          <div>
                            <p className="text-white text-sm font-medium">{perm.name}</p>
                            <p className="text-xs text-slate-400">{perm.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 backdrop-blur text-center">
              <p className="text-6xl mb-4">🔑</p>
              <h2 className="text-xl font-bold text-white mb-2">Select a Role</h2>
              <p className="text-slate-400">Choose a role from the list to view and edit permissions</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-[500px] max-w-[90vw] border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Add New Role</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Role Name" value={newRole.name} onChange={(e) => setNewRole({...newRole, name: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              <textarea placeholder="Description" value={newRole.description} onChange={(e) => setNewRole({...newRole, description: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white h-24 resize-none focus:border-cyan-400 focus:outline-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 transition">Cancel</button>
                <button onClick={handleCreateRole} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white hover:from-cyan-400 hover:to-blue-400 transition">Create Role</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Edit Role</h2>
            <div className="space-y-4">
              <input type="text" value={editRole.name} onChange={(e) => setEditRole({...editRole, name: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              <textarea value={editRole.description} onChange={(e) => setEditRole({...editRole, description: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white h-24 resize-none focus:border-cyan-400 focus:outline-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 transition">Cancel</button>
                <button onClick={handleUpdateRole} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-white hover:from-cyan-400 hover:to-blue-400 transition">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}