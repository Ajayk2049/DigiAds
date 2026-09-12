'use client';

import React from 'react';
import { Building, Pencil, Tablet, Tv } from 'lucide-react';
import { useOutletStore } from '@/stores/useOutletStore';

export default function MyApplicationsTab(props) {
  const outlet = useOutletStore();
  const applications = props.applications ?? outlet.applications;
  const openEditApplicationModal = props.openEditApplicationModal ?? outlet.openEditApplicationModal;

  return (
    <div className="animate-fade-in">
      <h1 className="font-outfit text-2xl font-black text-foreground mb-2">My Applications</h1>
      <p className="text-muted-foreground text-xs font-semibold mb-8">View and monitor the status of all your submitted host applications.</p>

      {applications.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
          <Building className="w-12 h-12 text-[#0069a8] fill-[#0069a8] mx-auto mb-4 opacity-50" />
          <p className="text-sm font-bold text-foreground">No Applications Submitted</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">You haven&apos;t submitted any host applications yet. Go to the &quot;Host Applications&quot; tab to request devices.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <div key={app._id} className="p-5 rounded-2xl bg-card/10 border border-border/40 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 animate-fade-in">
              <div>
                <div className="flex justify-between items-start border-b border-border/40 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Venue / Outlet</span>
                    <h4 className="font-bold text-foreground text-sm tracking-wide mt-0.5">{app.outletName}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditApplicationModal(app)}
                      className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Edit Application Details"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center ${app.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : app.status === 'rejected'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.status === 'approved' ? 'bg-emerald-500' : app.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />
                      {app.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {app.requestTablet && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold flex items-center">
                        <Tablet className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                        Tablets Requested
                      </span>
                      <span className="text-foreground font-bold">{app.tabletQuantity}</span>
                    </div>
                  )}
                  {app.requestScreen && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold flex items-center">
                        <Tv className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                        Screens Requested
                      </span>
                      <span className="text-foreground font-bold">{app.screenQuantity}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Location</span>
                    <span className="text-foreground font-semibold text-right">{app.city}, {app.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Contact Person</span>
                    <span className="text-foreground font-semibold">{app.contactPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Submitted On</span>
                    <span className="text-foreground font-semibold">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/30">
                    <span className="text-muted-foreground font-semibold">Venue Ad Mode</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${app.allowOpenAds !== false
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}>
                      {app.allowOpenAds !== false ? 'OPEN ADS MODE' : 'CLOSED / PRIVATE'}
                    </span>
                  </div>
                </div>
              </div>

              {app.status === 'approved' && (
                <div className="border-t border-border/40 pt-3 text-[10px] text-muted-foreground font-semibold space-y-1">
                  <p className="uppercase text-[9px] tracking-wider font-bold">Approved Status</p>
                  <p className="text-foreground/80 leading-relaxed font-semibold">This application is approved. Device credentials have been generated under the &quot;Devices&quot; tab.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
