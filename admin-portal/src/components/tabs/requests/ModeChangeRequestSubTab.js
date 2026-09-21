'use client';

import React from 'react';
import { Building, Check, X } from 'lucide-react';

export default function ModeChangeRequestSubTab({
  filteredModeReqs,
  onReviewModeChange
}) {
  return (
    <div className="w-full mx-1 mt-2 overflow-x-auto animate-fade-in">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
            <th className="p-4 pl-6">Req ID</th>
            <th className="p-4">Venue Outlet</th>
            <th className="p-4">Merchant</th>
            <th className="p-4 text-center">Requested Mode</th>
            <th className="p-4 text-center">Status</th>
            <th className="p-4 text-right pr-6">Actions / Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {filteredModeReqs.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                No ad mode change requests found.
              </td>
            </tr>
          ) : (
            filteredModeReqs.map((req) => (
              <tr key={req._id} className="hover:bg-card/20 transition-colors duration-200">
                <td className="p-4 pl-6 font-mono font-bold text-primary">{req.requestId}</td>
                <td className="p-4 font-bold text-foreground">
                  <div className="flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{req.hostApplicationId?.outletName || 'Outlet'}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal">
                    {req.hostApplicationId?.city}, {req.hostApplicationId?.state}
                  </div>
                </td>
                <td className="p-4 font-semibold text-foreground">
                  <div>{req.userId?.name || 'N/A'}</div>
                  <div className="text-[10px] text-muted-foreground">{req.userId?.phone}</div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {req.currentMode}
                    </span>
                    <span className="text-muted-foreground font-black">→</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        req.requestedMode === 'closed'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {req.requestedMode} MODE
                    </span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : req.status === 'rejected'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="p-4 text-right pr-6">
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onReviewModeChange && onReviewModeChange(req.requestId || req._id, 'approved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => onReviewModeChange && onReviewModeChange(req.requestId || req._id, 'rejected')}
                        className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-medium text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
