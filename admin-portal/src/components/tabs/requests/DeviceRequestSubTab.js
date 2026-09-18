'use client';

import React from 'react';
import { Building, Eye } from 'lucide-react';

export default function DeviceRequestSubTab({
  filteredDeviceReqs,
  onViewDeviceReqModal
}) {
  return (
    <div className="w-full mx-1 mt-2 overflow-x-auto animate-fade-in">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
            <th className="p-4 pl-6">Venue Outlet</th>
            <th className="p-4">Merchant</th>
            <th className="p-4">Requested Devices</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-center">Details</th>
            <th className="p-4 text-right pr-6">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {filteredDeviceReqs.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                No device requests found.
              </td>
            </tr>
          ) : (
            filteredDeviceReqs.map((req) => (
              <tr
                key={req._id}
                onClick={() => onViewDeviceReqModal && onViewDeviceReqModal(req)}
                className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
              >
                <td className="p-4 pl-6 font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{req.hostApplicationId?.outletName || 'Outlet'}</span>
                  </div>
                </td>
                <td className="p-4 font-semibold text-foreground">
                  <div>{req.userId?.name || 'N/A'}</div>
                  <div className="text-[10px] text-muted-foreground">{req.userId?.phone}</div>
                </td>
                <td className="p-4">
                  <div className="text-[11px] space-y-0.5 font-bold">
                    {req.requestTablet && <div className="text-foreground">Tablet (Qty: {req.tabletQuantity})</div>}
                    {req.requestScreen && <div className="text-foreground">Screen (Qty: {req.screenQuantity})</div>}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : req.status === 'rejected'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewDeviceReqModal) onViewDeviceReqModal(req);
                    }}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1 mx-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </td>
                <td className="p-4 text-right pr-6 text-muted-foreground font-medium">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
