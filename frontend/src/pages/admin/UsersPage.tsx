import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { AdvancedSearchBar } from '../../components/AdvancedSearchBar';
import { advancedSearch } from '../../utils/advancedSearch';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Pagination } from '../../components/Pagination';
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
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      showToast('error', t('users.validationEmailPassword', 'Email and password are required'));
      return;
    }

    try {
      const roleName = newUser.roleId > 0 ? roles.find((r) => r.id === newUser.roleId)?.name : undefined;
      const user = await api.post<User>('/api/auth/register', {
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: roleName
      });

      await loadUsers();
      setShowModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', roleId: 0 });
      showToast('success', t('users.userCreatedSuccess', 'User created successfully'));
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'UserManagement',
          title: t('users.userCreatedNotificationTitle', 'User Created'),
          message: t('users.userCreatedNotificationMessage', 'User created successfully'),
          actionUrl: '/admin/users'
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const message = error instanceof Error ? error.message : t('users.userCreateFailed', 'Failed to create user');
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
      showToast('success', t('users.userUpdatedSuccess', 'User updated successfully'));
      if (user?.id) {
        await notificationService.sendNotification({
          userId: user.id,
          type: 'UserManagement',
          title: t('users.userUpdatedNotificationTitle', 'User Updated'),
          message: t('users.userUpdatedNotificationMessage', 'User updated successfully'),
          actionUrl: '/admin/users'
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('error', t('users.userUpdateFailed', 'Failed to update user'));
    }
  };

  const handleDeleteUser = (id: number) => {
    setConfirmDialog({
      title: t('users.deleteUserTitle', 'Delete User'),
      message: t('users.deleteUserConfirm', 'Are you sure you want to delete this user?'),
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/${id}`);
          await loadUsers();
          showToast('success', t('users.userDeletedSuccess', 'User deleted successfully'));
          if (user?.id) {
            await notificationService.sendNotification({
              userId: user.id,
              type: 'UserManagement',
              title: t('users.userDeletedNotificationTitle', 'User Deleted'),
              message: t('users.userDeletedNotificationMessage', 'User deleted successfully'),
              actionUrl: '/admin/users'
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
          showToast('error', t('users.userDeleteFailed', 'Failed to delete user'));
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
        showToast('success', t('users.roleAssignedSuccess', 'Role assigned successfully'));
        if (user?.id) {
          await notificationService.sendNotification({
            userId: user.id,
            type: 'UserManagement',
            title: t('users.roleAssignedNotificationTitle', 'Role Assigned'),
            message: t('users.roleAssignedNotificationMessage', 'Role assigned successfully'),
            actionUrl: '/admin/users'
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to assign role:', error);
        showToast('error', t('users.roleAssignFailed', 'Failed to assign role'));
      }
    }
  };

  const handleRemoveRole = (userId: number, roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    setConfirmDialog({
      title: t('users.removeRoleTitle', 'Remove Role'),
      message: t('users.removeRoleConfirm', { role: roleName, defaultValue: `Remove ${roleName} role from this user?` }),
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/${userId}/roles/${role.id}`);
          await loadUsers();
          showToast('success', t('users.roleRemovedSuccess', 'Role removed successfully'));
          if (user?.id) {
            await notificationService.sendNotification({
              userId: user.id,
              type: 'UserManagement',
              title: t('users.roleRemovedNotificationTitle', 'Role Removed'),
              message: t('users.roleRemovedNotificationMessage', 'Role removed successfully'),
              actionUrl: '/admin/users'
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Failed to remove role:', error);
          showToast('error', t('users.roleRemoveFailed', 'Failed to remove role'));
        }
      }
    });
  };

  const handleMakeAdmin = (userId: number) => {
    const adminRole = roles.find(r => r.name === 'Admin');
    if (!adminRole) {
      showToast('error', t('users.adminRoleNotFound', 'Admin role not found'));
      return;
    }

    setConfirmDialog({
      title: t('users.grantAdminTitle', 'Grant Admin'),
      message: t('users.grantAdminConfirm', 'Are you sure you want to grant Admin role to this user? This gives full access.'),
      onConfirm: async () => {
        try {
          await api.post(`/api/auth/${userId}/roles/${adminRole.id}`);
          await loadUsers();
          showToast('success', t('users.adminRoleGrantedSuccess', 'Admin role granted'));
        } catch (error) {
          console.error('Failed to grant Admin role:', error);
          showToast('error', t('users.adminRoleGrantFailed', 'Failed to grant Admin role'));
        }
      }
    });
  };

  const handleRevokeAdmin = (userId: number) => {
    const adminRole = roles.find(r => r.name === 'Admin');
    if (!adminRole) {
      showToast('error', t('users.adminRoleNotFound', 'Admin role not found'));
      return;
    }

    setConfirmDialog({
      title: t('users.revokeAdminTitle', 'Revoke Admin'),
      message: t('users.revokeAdminConfirm', 'Are you sure you want to revoke Admin role from this user?'),
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/${userId}/roles/${adminRole.id}`);
          await loadUsers();
          showToast('success', t('users.adminRoleRevokedSuccess', 'Admin role revoked'));
        } catch (error) {
          console.error('Failed to revoke Admin role:', error);
          showToast('error', t('users.adminRoleRevokeFailed', 'Failed to revoke Admin role'));
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

  const filteredUsers = advancedSearch(users, {
    query: searchQuery,
    searchFields: [
      (user) => `${user.firstName} ${user.lastName}`,
      'email',
      (user) => user.roles.join(' '),
      'createdAt',
    ],
    filterPredicates: {
      role: (user, value) => user.roles.some((role) => role.toLowerCase() === value.toLowerCase()),
      status: (user, value) => value.toLowerCase() === 'active' ? user.isActive : value.toLowerCase() === 'inactive' ? !user.isActive : true,
    },
    sortBy,
    sortDir,
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-900">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('users.title', 'User Management')}</h1>
          <p className="text-slate-500">{t('users.description', 'Manage system users and assign roles')}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="btn-primary"
        >
          {t('users.addNewUser', '+ Add New User')}
        </button>
      </div>

      <div className="space-y-4">
        <AdvancedSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          sortBy={sortBy}
          sortDir={sortDir}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'email', label: 'Email' },
            { value: 'createdAt', label: 'Created Date' },
          ]}
          onSortByChange={(value) => setSortBy(value as typeof sortBy)}
          onSortDirChange={setSortDir}
          showClear
          onClear={() => {
            setSearchQuery('');
            setSortBy('name');
            setSortDir('asc');
          }}
          placeholder={t('users.searchPlaceholder', 'Search users by name, email, role or use tokens like role:Admin status:active')}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-6 backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
            label="Users"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-slate-500">{t('users.table.name', 'Name')}</th>
                <th className="text-left py-3 text-slate-500">{t('users.table.email', 'Email')}</th>
                <th className="text-left py-3 text-slate-500">{t('users.table.roles', 'Roles')}</th>
                <th className="text-left py-3 text-slate-500">{t('users.table.status', 'Status')}</th>
                <th className="text-left py-3 text-slate-500">{t('users.table.createdAt', 'Created At')}</th>
                <th className="text-left py-3 text-slate-500">{t('users.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
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
                        {t('users.addRole', '+ Add Role')}
                      </button>
                    </div>
                   </td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
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
                      {t('common.edit', 'Edit')}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-400 hover:text-red-300 mr-3"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                    {/* Make / Revoke Admin buttons */}
                    {user.roles?.includes('Admin') ? (
                      <button onClick={() => handleRevokeAdmin(user.id)} className="text-yellow-600 hover:text-yellow-500">{t('users.revokeAdmin', 'Revoke Admin')}</button>
                    ) : (
                      <button onClick={() => handleMakeAdmin(user.id)} className="text-green-600 hover:text-green-500">{t('users.makeAdmin', 'Make Admin')}</button>
                    )}
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
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('users.addUserTitle', 'Add New User')}</h2>
            <div className="space-y-4">
              <input type="text" placeholder={t('users.firstName', 'First Name')} value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900 focus:border-cyan-400 focus:outline-none" />
              <input type="text" placeholder={t('users.lastName', 'Last Name')} value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="email" placeholder={t('users.email', 'Email')} value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="password" placeholder={t('users.password', 'Password')} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <select value={newUser.roleId} onChange={(e) => setNewUser({...newUser, roleId: parseInt(e.target.value)})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900">
                <option value={0}>{t('users.selectRolePlaceholder', 'Select a role')}</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-ghost">{t('common.cancel')}</button>
                <button onClick={handleCreateUser} className="flex-1 btn-primary">{t('users.createUser', 'Create User')}</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('users.editUserTitle', 'Edit User')}</h2>
            <div className="space-y-4">
              <input type="text" placeholder={t('users.firstName', 'First Name')} value={editUser.firstName} onChange={(e) => setEditUser({...editUser, firstName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="text" placeholder={t('users.lastName', 'Last Name')} value={editUser.lastName} onChange={(e) => setEditUser({...editUser, lastName: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <input type="email" placeholder={t('users.email', 'Email')} value={editUser.email} onChange={(e) => setEditUser({...editUser, email: e.target.value})} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editUser.isActive} onChange={(e) => setEditUser({...editUser, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-600 bg-slate-50 text-cyan-500" />
                <span className="text-slate-900">{t('common.active', 'Active')}</span>
              </label>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 btn-ghost">{t('common.cancel')}</button>
                  <button onClick={handleUpdateUser} className="flex-1 btn-primary">{t('common.save', 'Save Changes')}</button>
                </div>
            </div>
          </div>
        </div>
      )}


      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('users.assignRoleTo', { name: `${selectedUser.firstName} ${selectedUser.lastName}`, defaultValue: 'Assign Role to {{name}}' })}</h2>
            <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(parseInt(e.target.value))} className="w-full rounded-lg border border-slate-600 bg-slate-50 px-4 py-2 text-slate-900">
              <option value={0}>{t('users.selectRolePlaceholder', 'Select a role')}</option>
              {roles.filter(r => !selectedUser.roles?.includes(r.name)).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowRoleModal(false)} className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-slate-900">{t('common.cancel')}</button>
              <button onClick={handleAssignRole} disabled={!selectedRoleId} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-slate-900 disabled:opacity-50">{t('users.assignRole', 'Assign Role')}</button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={t('common.confirm', 'Confirm')}
          cancelLabel={t('common.cancel')}
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




