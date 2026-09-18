'use client';

import React from 'react';
import { Building, Eye } from 'lucide-react';

export default function VenuesRequestSubTab({
  filteredHosts,
  onSelectHost
}) {
  return (
    <div className="mx-1 mt-2 overflow-x-auto animate-fade-in">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
            <th className="p-4 pl-6">Outlet Name</th>
            <th className="p-4">Location</th>
            <th className="p-4">Contact Person</th>
            <th className="p-4">Device Qty</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-center">Form Details</th>
            <th className="p-4 text-right pr-6">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {filteredHosts.length === 0 ? (
            <tr>
              <td colSpan="7" className="p-12 text-center text-muted-foreground font-medium italic">
                No host applications found matching filter.
              </td>
            </tr>
          ) : (
            filteredHosts.map((app) => (
              <tr
                key={app._id}
                onClick={() => onSelectHost && onSelectHost(app)}
                className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
              >
                <td className="p-4 pl-6 font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{app.outletName}</span>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground font-semibold">
                  {app.city}, {app.state}
                </td>
                <td className="p-4 font-semibold text-foreground">
                  <div>{app.contactPerson}</div>
                  <div className="text-[10px] text-muted-foreground">{app.phone}</div>
                </td>
                <td className="p-4">
                  <div className="text-[11px] space-y-0.5 font-bold">
                    {app.requestTablet && <div className="text-foreground">Tablet ({app.tabletQuantity})</div>}
                    {app.requestScreen && <div className="text-foreground">Screen ({app.screenQuantity})</div>}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      app.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : app.status === 'rejected'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectHost) onSelectHost(app);
                    }}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1 mx-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Form</span>
                  </button>
                </td>
                <td className="p-4 text-right pr-6 text-muted-foreground font-medium">
                  {new Date(app.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
