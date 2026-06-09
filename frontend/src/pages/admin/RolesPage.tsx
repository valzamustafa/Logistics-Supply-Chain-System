import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../../components/ConfirmModal';
import { notificationService } from '../../services/notificationService';

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
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const [editRole, setEditRole] = useState({ id: 0, name: '', description: '' });
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);

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
      showToast('error', t('roles.roleNameRequired', 'Role name is required'));
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
      showToast('success', t('roles.roleCreatedSuccess', 'Role created successfully'));
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Role', title: t('roles.roleCreatedNotificationTitle', 'Role Created'), message: t('roles.roleCreatedNotificationMessage', { roleName: created.name, defaultValue: `Role ${created.name} created` }), actionUrl: '/admin/roles' }).catch(() => {});
    } catch (error) {
      console.error('Failed to create role:', error);
      showToast('error', t('roles.roleCreateFailed', 'Failed to create role'));
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
      showToast('success', t('roles.roleUpdatedSuccess', 'Role updated successfully'));
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Role', title: t('roles.roleUpdatedNotificationTitle', 'Role Updated'), message: t('roles.roleUpdatedNotificationMessage', { roleName: updated.name, defaultValue: `Role ${updated.name} updated` }), actionUrl: '/admin/roles' }).catch(() => {});
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('error', t('roles.roleUpdateFailed', 'Failed to update role'));
    }
  };

  const handleDeleteRole = (roleId: number, roleName: string) => {
    if (roleName === 'Admin') {
      showToast('error', t('roles.cannotDeleteAdminRole', 'Cannot delete Admin role'));
      return;
    }

    setConfirmDialog({
      title: t('roles.deleteRoleTitle', 'Delete Role'),
      message: t('roles.deleteRoleConfirm', { roleName, defaultValue: `Are you sure you want to delete role "${roleName}"?` }),
      onConfirm: async () => {
        try {
          await api.delete(`/api/auth/roles/${roleId}`);
          setRoles(roles.filter(r => r.id !== roleId));
          if (selectedRole?.id === roleId) setSelectedRole(null);
          showToast('success', t('roles.roleDeletedSuccess', 'Role deleted successfully'));
          if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Role', title: t('roles.roleDeletedNotificationTitle', 'Role Deleted'), message: t('roles.roleDeletedNotificationMessage', { roleName, defaultValue: `Role ${roleName} deleted` }), actionUrl: '/admin/roles' }).catch(() => {});
        } catch (error) {
          console.error('Failed to delete role:', error);
          showToast('error', t('roles.roleDeleteFailed', 'Failed to delete role'));
        }
      }
    });
  };

  const handleUpdatePermissions = async (roleId: number, permissionNames: string[]) => {
    try {
      await api.put(`/api/auth/roles/${roleId}/permissions`, { permissions: permissionNames });
      setRoles(roles.map(r => r.id === roleId ? { ...r, permissions: permissionNames } : r));
      showToast('success', t('roles.permissionsUpdatedSuccess', 'Permissions updated successfully'));
      if (user?.id) await notificationService.sendNotification({ userId: user.id, type: 'Role', title: t('roles.permissionsUpdatedNotificationTitle', 'Permissions Updated'), message: t('roles.permissionsUpdatedNotificationMessage', 'Permissions updated for role'), actionUrl: '/admin/roles' }).catch(() => {});
    } catch (error) {
      console.error('Failed to update permissions:', error);
      showToast('error', t('roles.permissionsUpdateFailed', 'Failed to update permissions'));
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'Admin': return 'bg-purple-500/20 text-purple-400';
      case 'Manager': return 'bg-blue-500/20 text-blue-400';
      case 'Driver': return 'bg-green-500/20 text-green-400';
      case 'WarehouseStaff': return 'bg-orange-500/20 text-orange-400';
      case 'Supplier': return 'bg-teal-500/20 text-teal-400';
      default: return 'bg-slate-500/20 text-slate-500';
    }
  };

  const getRoleLabel = (role: Role) => {
    return t(`roles.names.${role.name}`, role.name);
  };

  const getRoleDescription = (role: Role) => {
    const description = role.description || t('roles.noDescription', 'No description available');
    return t(`roles.descriptions.${role.name}`, description);
  };

  const getPermissionLabel = (perm: Permission) => {
    return t(`permissions.${perm.name}`, perm.name);
  };

  const getPermissionDescription = (perm: Permission) => {
    return t(`permissions.${perm.name}Description`, perm.description);
  };

  const getPermissionCategoryLabel = (category: string) => {
    return t(`permissions.categories.${category}`, category);
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
          <p className="text-slate-500">{t('roles.loading', 'Loading roles...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('roles.title', 'Role Management')}</h1>
          <p className="text-slate-500">{t('roles.description', 'Create, edit, and manage system roles and permissions')}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn-primary"
        >
          {t('roles.addNewRole', '+ Add New Role')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">{t('roles.rolesSection', 'Roles')}</h2>
            <span className="text-sm text-slate-500">{t('roles.totalRoles', '{{count}} total', { count: roles.length })}</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`card cursor-pointer transition ${
                  selectedRole?.id === role.id
                    ? 'border-cyan-500 bg-white shadow-lg'
                    : 'border-slate-200 bg-slate-50/90 hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getRoleColor(role.name)}`}>
                        {getRoleLabel(role)}
                      </span>
                      <span className="text-xs text-slate-500">{t('roles.usersCount', '{{count}} users', { count: role.userCount || 0 })}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-3">{getRoleDescription(role)}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditRole({ id: role.id, name: role.name, description: role.description }); setShowEditModal(true); }}
                      className="text-cyan-500 hover:text-cyan-600 text-sm"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                    {role.name !== 'Admin' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        {t('common.delete', 'Delete')}
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
            <div className="card bg-white/95 shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{getRoleLabel(selectedRole)} - {t('roles.permissions', 'Permissions')}</h2>
                  <p className="text-sm text-slate-500">{getRoleDescription(selectedRole)}</p>
                </div>
                <button 
                  onClick={() => handleUpdatePermissions(selectedRole.id, selectedRole.permissions || [])}
                  className="btn-primary"
                >
                  {t('common.save', 'Save Changes')}
                </button>
              </div>
              
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">{getPermissionCategoryLabel(category)}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm hover:shadow-md transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRole.permissions?.includes(perm.name) || false}
                            onChange={(e) => {
                              const newPermissions = e.target.checked
                                ? [...(selectedRole.permissions || []), perm.name]
                                : (selectedRole.permissions || []).filter(p => p !== perm.name);
                              setSelectedRole({ ...selectedRole, permissions: newPermissions });
                            }}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-200 text-cyan-500 focus:ring-cyan-500"
                          />
                          <div>
                            <p className="text-slate-900 text-sm font-semibold">{getPermissionLabel(perm)}</p>
                            <p className="text-xs text-slate-500">{getPermissionDescription(perm)}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-100/90 p-12 backdrop-blur text-center">
              <p className="text-6xl mb-4">🔑</p>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t('roles.selectRoleTitle', 'Select a Role')}</h2>
              <p className="text-slate-500">{t('roles.selectRoleDescription', 'Choose a role from the list to view and edit permissions')}</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="card w-[500px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('roles.addRole', 'Add New Role')}</h2>
            <div className="space-y-4">
              <input type="text" placeholder={t('roles.roleName', 'Role Name')} value={newRole.name} onChange={(e) => setNewRole({...newRole, name: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:outline-none" />
              <textarea placeholder={t('roles.roleDescription', 'Description')} value={newRole.description} onChange={(e) => setNewRole({...newRole, description: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 h-24 resize-none focus:border-cyan-400 focus:outline-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 btn-ghost">{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleCreateRole} className="flex-1 btn-primary">{t('roles.createRole', 'Create Role')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="card w-96" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('roles.editRole', 'Edit Role')}</h2>
            <div className="space-y-4">
              <input type="text" value={editRole.name} onChange={(e) => setEditRole({...editRole, name: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:outline-none" />
              <textarea value={editRole.description} onChange={(e) => setEditRole({...editRole, description: e.target.value})} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 h-24 resize-none focus:border-cyan-400 focus:outline-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 btn-ghost">{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleUpdateRole} className="flex-1 btn-primary">{t('common.save', 'Save Changes')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={t('common.confirm', 'Confirm')}
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




