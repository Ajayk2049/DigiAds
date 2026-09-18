'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, Settings } from 'lucide-react';
import { useAdminStore } from '@/stores/useAdminStore';

export default function UsersTab({
  users: propUsers,
  hosts: propHosts,
  userSubTab: propUserSubTab,
  setUserSubTab: propSetUserSubTab,
  searchQuery: propSearchQuery,
  selectedUser: propSelectedUser,
  setSelectedUser: propSetSelectedUser,
  onSelectUser,
  onEditUser,
  onDeleteUser,
  onOpenQuotaModal
}) {
  const storeUsers = useAdminStore((s) => s.users);
  const storeHosts = useAdminStore((s) => s.hosts);
  const storeUserSubTab = useAdminStore((s) => s.userSubTab);
  const storeSetUserSubTab = useAdminStore((s) => s.setUserSubTab);
  const storeSearchQuery = useAdminStore((s) => s.searchQuery);
  const storeSelectedUser = useAdminStore((s) => s.selectedUser);
  const storeSetSelectedUser = useAdminStore((s) => s.setSelectedUser);

  const users = propUsers || storeUsers || [];
  const hosts = propHosts || storeHosts || [];
  const userSubTab = propUserSubTab || storeUserSubTab || 'merchant';
  const setUserSubTab = propSetUserSubTab || storeSetUserSubTab;
  const searchQuery = propSearchQuery ?? storeSearchQuery ?? '';
  const selectedUser = propSelectedUser || storeSelectedUser;
  const setSelectedUser = onSelectUser || propSetSelectedUser || storeSetSelectedUser;
  const filteredUsers = users.filter((u) => {
    const userRoles = u.roles || (u.role ? [u.role] : []);

    let isRoleMatch = true;
    if (userSubTab === 'merchant') {
      isRoleMatch = userRoles.includes('merchant') || u.role === 'merchant';
    } else if (userSubTab === 'advertiser') {
      isRoleMatch = userRoles.includes('advertiser') || u.role === 'advertiser';
    }

    if (!isRoleMatch) return false;

    if (!searchQuery) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (u._id || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      key="users-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Subtabs Filter Bar */}
      <div className="border-b border-border/50 pb-6 flex justify-between items-center">
        <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
          <button
            onClick={() => {
              setUserSubTab('merchant');
              if (setSelectedUser) setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              userSubTab === 'merchant'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Venue Hosts
          </button>
          <button
            onClick={() => {
              setUserSubTab('advertiser');
              if (setSelectedUser) setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              userSubTab === 'advertiser'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Advertisers
          </button>
          <button
            onClick={() => {
              setUserSubTab('all');
              if (setSelectedUser) setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
              userSubTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Users
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="mx-1 overflow-x-auto animate-fade-in">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
              <th className="p-4 pl-6">Name / User ID</th>
              <th className="p-4">Contact Phone</th>
              {userSubTab === 'merchant' && <th className="p-4">Applications</th>}
              {userSubTab === 'merchant' && <th className="p-4">Deployed Devices</th>}
              {userSubTab === 'advertiser' && <th className="p-4">Ad campaigns</th>}
              {userSubTab === 'all' && <th className="p-4">Role</th>}
              {userSubTab === 'all' && <th className="p-4">Platform Activity</th>}
              <th className="p-4">Created Date</th>
              <th className="p-4 text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={userSubTab === 'merchant' || userSubTab === 'all' ? 6 : 5}
                  className="p-8 text-center text-muted-foreground font-medium"
                >
                  No registered {userSubTab === 'all' ? '' : userSubTab} accounts yet.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const userRoles = user.roles || (user.role ? [user.role] : []);
                const isMerchant = userRoles.includes('merchant') || user.role === 'merchant';
                const isAdvertiser = userRoles.includes('advertiser') || user.role === 'advertiser';
                const isAdmin = userRoles.includes('admin') || user.role === 'admin';
                const isSelected = selectedUser?._id === user._id;

                const merchantVenues = hosts.filter(
                  (h) => (h.userId?._id || h.userId)?.toString() === user._id?.toString() && h.status === 'approved'
                );

                return (
                  <tr
                    key={user._id}
                    className={`hover:bg-card/20 transition-colors duration-200 ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Name / User ID */}
                    <td className="p-4 pl-6 font-bold tracking-tight text-foreground">
                      <div>{user.name || 'N/A'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono font-medium">{user._id}</div>
                    </td>

                    {/* Contact Phone */}
                    <td className="p-4 text-foreground font-bold">{user.phone}</td>

                    {/* Subtab-specific columns */}
                    {userSubTab === 'merchant' && (
                      <>
                        <td className="p-4 text-foreground font-extrabold">
                          {user.stats?.merchant?.applicationsCount || 0}
                        </td>
                        <td className="p-4 text-foreground font-extrabold">
                          {user.stats?.merchant?.devicesCount || 0}
                        </td>
                      </>
                    )}

                    {userSubTab === 'advertiser' && (
                      <td className="p-4 text-foreground font-extrabold">
                        {user.stats?.advertiser?.bookingsCount || 0}
                      </td>
                    )}

                    {userSubTab === 'all' && (
                      <>
                        <td className="p-4">
                          <span className="capitalize font-bold text-foreground">
                            {userRoles.join(', ')}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground font-semibold">
                          {isMerchant && (
                            <span>
                              {user.stats?.merchant?.applicationsCount || 0} venues, {user.stats?.merchant?.devicesCount || 0} devices
                            </span>
                          )}
                          {isAdvertiser && !isMerchant && (
                            <span>{user.stats?.advertiser?.bookingsCount || 0} campaigns</span>
                          )}
                          {isAdmin && !isMerchant && !isAdvertiser && (
                            <span>Administrator</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Created Date */}
                    <td className="p-4 text-muted-foreground font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        {userSubTab === 'merchant' && merchantVenues.length > 0 && (
                          <button
                            onClick={() => {
                              if (merchantVenues.length === 1 && onOpenQuotaModal) {
                                onOpenQuotaModal(merchantVenues[0]);
                              } else if (setSelectedUser) {
                                setSelectedUser(user);
                              }
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
                            title="Edit Custom Quotas for this Merchant Venue"
                            aria-label="Edit quotas"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Edit Quotas</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedUser && setSelectedUser(user)}
                          className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                          title="Inspect User Details"
                          aria-label="Inspect user"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (onEditUser) onEditUser(user);
                          }}
                          className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                          title="Edit User Properties"
                          aria-label="Edit user"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (onDeleteUser) onDeleteUser(user);
                          }}
                          className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                          title="Delete User"
                          aria-label="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
