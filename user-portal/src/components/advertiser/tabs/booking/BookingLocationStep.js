import React from 'react';
import { MapPin } from 'lucide-react';
import { useAdvertiserStore } from '@/stores';

export default function BookingLocationStep() {
  const {
    states,
    cities,
    outlets,
    selectedState,
    setSelectedState,
    selectedCity,
    setSelectedCity,
    selectedOutletName,
    setSelectedOutletName,
    availableDeviceTypes,
    setAvailableDeviceTypes,
    selectedDeviceType,
    setSelectedDeviceType,
    setSelectedOutlet,
    setQuantity,
    fetchCities,
    fetchOutlets,
  } = useAdvertiserStore();

  return (
    <div className="space-y-4 m-0 p-0 border-none bg-transparent">
      <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
        <MapPin className="w-4 h-4 mr-2 text-primary shrink-0" />
        <span>Target Location & Venue</span>
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Select State
          </label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              fetchCities(e.target.value);
            }}
            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- State --</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Select City
          </label>
          <select
            value={selectedCity}
            disabled={!selectedState}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              fetchOutlets(e.target.value);
            }}
            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">-- City --</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Select Outlet Name
          </label>
          <select
            value={selectedOutletName}
            disabled={!selectedCity}
            onChange={(e) => {
              const name = e.target.value;
              setSelectedOutletName(name);
              const matches = outlets.filter(o => o.outletName === name);
              const devices = matches.map(o => o.deviceType);
              setAvailableDeviceTypes(devices);
              setSelectedDeviceType('');
              setSelectedOutlet(null);
            }}
            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">-- Outlet --</option>
            {Array.from(new Set(outlets.map(o => o.outletName))).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Select Display Type
          </label>
          <select
            value={selectedDeviceType}
            disabled={!selectedOutletName}
            onChange={(e) => {
              const devType = e.target.value;
              setSelectedDeviceType(devType);
              const matched = outlets.find(o => o.outletName === selectedOutletName && o.deviceType === devType);
              setSelectedOutlet(matched || null);
              setQuantity('1');
            }}
            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
          >
            <option value="">-- Display Type --</option>
            {availableDeviceTypes.map(type => (
              <option key={type} value={type}>
                {type === 'tablet' ? 'Tabletop Tablet' : 'Wall Screen'}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
