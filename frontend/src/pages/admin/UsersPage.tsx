import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../../components/ConfirmModal';
import { notificationService } from '../../services/notificationService';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export function UsersPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: 0
  });
  const [editUser, setEditUser] = useState({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    isActive: true
  });
  const [selectedRoleId, setSelectedRoleId] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get<User[]>('/api/auth/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.get<Role[]>('/api/auth/roles');
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      showToast('error', 'Email and password are required');
      return;
    }

    try {
      const user = await api.post<User>('/api/auth/register', {
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      });
      
      if (newUser.roleId > 0) {
        await api.post(`/api/auth/${user.id}/roles/${newUser.roleId}`);
      }
      
      await loadUsers();
      setShowModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', roleId: 0 });
      showToast('success', 'User created successfully');
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'UserManagement',
          title: 'User Created',
          message: `User ${user.email} created user ${user.email}`,
          actionUrl: '/admin/users'
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const message = error instanceof Error ? error.message : 'Failed to create user';
      showToast('error', message);
    }
  };

  const handleUpdateUser = async () => {
    try {
      await api.put(`/api/auth/${editUser.id}`, {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        isActive: editUser.isActive
      });
      await loadUsers();
      setShowEditModal(false);
      showToast('success', 'User updated successfully');
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'UserManagement',
          title: 'User Updated',
          message: `User updated successfully`,
          actionUrl: '/admin/users'
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('error', 'Failed to update user');
    }
  };

  const handleDeleteUser = (id: number) => {
    setConfirmDialog({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/${id}`);
          await loadUsers();
          showToast('success', 'User deleted successfully');
          if (user?.id) {
            await notificationService.sendNotification({
              userId: user.id,
              type: 'UserManagement',
              title: 'User Deleted',
              message: `User deleted successfully`,
              actionUrl: '/admin/users'
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
          showToast('error', 'Failed to delete user');
        }
      }
    });
  };

  const handleAssignRole = async () => {
    if (selectedUser && selectedRoleId) {
      try {
        await api.post(`/api/auth/${selectedUser.id}/roles/${selectedRoleId}`);
        await loadUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
        setSelectedRoleId(0);
        showToast('success', 'Role assigned successfully');
        if (user?.id) {
          await notificationService.sendNotification({
            userId: user.id,
            type: 'UserManagement',
            title: 'Role Assigned',
            message: `Role assigned successfully`,
            actionUrl: '/admin/users'
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to assign role:', error);
        showToast('error', 'Failed to assign role');
      }
    }
  };

  const handleRemoveRole = (userId: number, roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    setConfirmDialog({
      title: 'Remove Role',
      message: `Remove ${roleName} role from this user?`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/${userId}/roles/${role.id}`);
          await loadUsers();
          showToast('success', 'Role removed successfully');
          if (user?.id) {
            await notificationService.sendNotification({
              userId: user.id,
              type: 'UserManagement',
              title: 'Role Removed',
              message: `Role removed successfully`,
              actionUrl: '/admin/users'
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Failed to remove role:', error);
          showToast('error', 'Failed to remove role');
        }
      }
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-500/20 text-purple-400';
      case 'Manager': return 'bg-blue-500/20 text-blue-400';
      case 'Driver': return 'bg-green-500/20 text-green-400';
      case 'WarehouseStaff': return 'bg-orange-500/20 text-orange-400';
      case 'Supplier': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-slate-500/20 text-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-500">Manage system users and assign roles</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-slate-900 font-medium hover:from-cyan-400 hover:to-blue-400 transition"
        >
          + Add New User
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-slate-500">Name</th>
                <th className="text-left py-3 text-slate-500">Email</th>
                <th className="text-left py-3 text-slate-500">Roles</th>
                <th className="text-left py-3 text-slate-500">Status</th>
                <th className="text-left py-3 text-slate-500">Created At</th>
                <th className="text-left py-3 text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-200/50">
                  <td className="py-3 text-slate-900">{user.firstName} {user.lastName}</td>
                  <td className="py-3 text-slate-500">{user.email}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <span key={role} className={`rounded-full px-2 py-1 text-xs ${getRoleColor(role)}`}>
                          {role}
                          <button 
                            onClick={() => handleRemoveRole(user.id, role)}
                            className="ml-1 hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                        }}
                        className="rounded-full px-2 py-1 text-xs bg-slate-200 text-slate-500 hover:bg-cyan-500/20 hover:text-cyan-400"
                      >
                        + Add Role
                      </button>
                    </div>
                   </td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                   </td>
                  <td className="py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()} </td>
                  <td className="py-3">
                    <button 
                      onClick={() => {
                        setEditUser({
                          id: user.id,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          isActive: user.isActive
                        });
                        setShowEditModal(true);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 mr-3"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                   </td>
                 </tr>
              ))}
            </tbody>
           </table>
        </div>
      </div>



      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New User</h2>
            <div className="space-y-4">
              <input type="text" placeholder="First Name" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900 focus:border-cyan-400 focus:outline-none" />
              <input type="text" placeholder="Last Name" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <select value={newUser.roleId} onChange={(e) => setNewUser({...newUser, roleId: parseInt(e.target.value)})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900">
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-slate-900">Cancel</button>
                <button onClick={handleCreateUser} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-slate-900">Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}

  
  
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit User</h2>
            <div className="space-y-4">
              <input type="text" placeholder="First Name" value={editUser.firstName} onChange={(e) => setEditUser({...editUser, firstName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="text" placeholder="Last Name" value={editUser.lastName} onChange={(e) => setEditUser({...editUser, lastName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="email" placeholder="Email" value={editUser.email} onChange={(e) => setEditUser({...editUser, email: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editUser.isActive} onChange={(e) => setEditUser({...editUser, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-600 bg-slate-50 text-cyan-500" />
                <span className="text-slate-900">Active</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-slate-900">Cancel</button>
                <button onClick={handleUpdateUser} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-slate-900">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Assign Role to {selectedUser.firstName} {selectedUser.lastName}</h2>
            <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(parseInt(e.target.value))} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900">
              <option value={0}>Select a role</option>
              {roles.filter(r => !selectedUser.roles?.includes(r.name)).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowRoleModal(false)} className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-slate-900">Cancel</button>
              <button onClick={handleAssignRole} disabled={!selectedRoleId} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-slate-900 disabled:opacity-50">Assign Role</button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
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




