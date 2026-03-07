"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../../lib/firebase/config";
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { LocationLog } from "../../../../types/models";
import AdminSidebar from "../../../../components/AdminSidebar";
import { ShieldAlert, ShieldCheck, MapPin, Settings2, Save, AlertCircle, Clock, Navigation, Radar, Globe, Activity, History, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FraudLogsAdmin() {
  const { slug } = useParams<{ slug: string }>();
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    geofencingEnabled: true,
    geofencingRadius: 80,
    lat: 0,
    lng: 0
  });

  useEffect(() => {
    if (!slug) return;

    // Fetch logs
    const logsQ = query(
      collection(db, "restaurants", slug, "locationLogs"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsubLogs = onSnapshot(logsQ, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LocationLog[];
      setLogs(data);
      setLoading(false);
    });

    // Fetch restaurant settings
    const fetchSettings = async () => {
      const restRef = doc(db, "restaurants", slug);
      const restSnap = await getDoc(restRef);
      if (restSnap.exists()) {
        const data = restSnap.data();
        setRestaurantSettings(data);
        setFormData({
          geofencingEnabled: data.settings?.geofencingEnabled ?? true,
          geofencingRadius: data.settings?.geofencingRadius ?? 80,
          lat: data.location?.lat ?? 0,
          lng: data.location?.lng ?? 0
        });
      }
    };
    fetchSettings();

    return () => unsubLogs();
  }, [slug]);

  const handleSaveSettings = async () => {
    if (!slug) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "restaurants", slug), {
        "settings.geofencingEnabled": formData.geofencingEnabled,
        "settings.geofencingRadius": formData.geofencingRadius,
        "location.lat": formData.lat,
        "location.lng": formData.lng,
        updatedAt: serverTimestamp()
      });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }));
      }, (err) => {
        alert("Location access denied: " + err.message);
      }, { enableHighAccuracy: true });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0B] text-white">
      <AdminSidebar activeTab="fraud" />
      
      <main className="flex-1 p-6 lg:p-10 transition-all duration-500 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Cyberpunk Header */}
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
            <div className="relative">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-orange-600 rounded-full blur-sm animate-pulse" />
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="w-10 h-10 bg-orange-600/10 border border-orange-600/20 rounded-xl flex items-center justify-center">
                  <Radar className="text-orange-500" size={20} />
                </div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Surveillance Mode</span>
              </motion.div>
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-white italic">Fraud Prevention</h1>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-4xl min-w-45">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity size={12} className="text-emerald-500" /> Active Sessions
                </p>
                <p className="text-3xl font-black text-white">{logs.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-4xl min-w-45">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ShieldAlert size={12} className="text-red-500" /> Blocks (24h)
                </p>
                <p className="text-3xl font-black text-white">{logs.filter(l => !l.isValid).length}</p>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-6 rounded-4xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
              >
                {isSaving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
                UPDATE CORE
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-xl relative overflow-hidden group"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-3xl group-hover:bg-orange-600/10 transition-colors" />
                
                <div className="flex items-center gap-4 mb-12 relative z-10">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-orange-500">
                    <Settings2 size={24} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Protocol Config</h3>
                </div>

                <div className="space-y-10 relative z-10">
                  <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl group/toggle">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400">Geofencing</p>
                      <p className="text-[10px] text-emerald-500 font-black uppercase">Active Shield</p>
                    </div>
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, geofencingEnabled: !prev.geofencingEnabled }))}
                      className={`w-16 h-9 rounded-full relative transition-all duration-500 ${formData.geofencingEnabled ? 'bg-orange-600 shadow-lg shadow-orange-600/30' : 'bg-white/10'}`}
                      aria-label={formData.geofencingEnabled ? "Disable" : "Enable"}
                    >
                      <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${formData.geofencingEnabled ? 'left-8' : 'left-2'}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label htmlFor="radius-input" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Detection Radius (M)</label>
                    <div className="relative">
                      <Radar className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                      <input 
                        id="radius-input"
                        type="number"
                        value={formData.geofencingRadius}
                        onChange={(e) => setFormData(prev => ({ ...prev, geofencingRadius: parseInt(e.target.value || "0") }))}
                        className="w-full bg-white/5 border-2 border-white/10 focus:border-orange-600/40 rounded-3xl py-6 pl-16 pr-8 text-2xl font-black text-white focus:ring-0 transition-all"
                        placeholder="80"
                      />
                    </div>
                  </div>

                  <div className="pt-10 border-t border-white/10 space-y-8">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">HQ Coordinates</label>
                      <button 
                        onClick={detectLocation}
                        className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-orange-400 transition-colors"
                      >
                        <Navigation size={12} /> SCAN CURRENT
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <label htmlFor="lat-input" className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Globe size={10} /> Latitude
                        </label>
                        <input 
                          id="lat-input"
                          type="number"
                          step="any"
                          value={formData.lat}
                          onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value || "0") }))}
                          className="w-full bg-white/5 border-2 border-white/10 focus:border-orange-600/40 rounded-2xl py-5 px-6 text-sm font-black text-white focus:ring-0 transition-all"
                          placeholder="0.0000"
                          title="Restaurant Latitude"
                        />
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="lng-input" className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Globe size={10} /> Longitude
                        </label>
                        <input 
                          id="lng-input"
                          type="number"
                          step="any"
                          value={formData.lng}
                          onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value || "0") }))}
                          className="w-full bg-white/5 border-2 border-white/10 focus:border-orange-600/40 rounded-2xl py-5 px-6 text-sm font-black text-white focus:ring-0 transition-all"
                          placeholder="0.0000"
                          title="Restaurant Longitude"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Transmission Logs */}
            <div className="lg:col-span-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-[3.5rem] backdrop-blur-xl overflow-hidden shadow-2xl"
              >
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/2">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                      <Activity size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight italic">Live Transmissions</h3>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Real-time spatial validation</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="px-5 py-3 bg-emerald-600/10 border border-emerald-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      {logs.filter(l => l.isValid).length} CLEARED
                    </div>
                    <div className="px-5 py-3 bg-red-600/10 border border-red-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-500">
                      {logs.filter(l => !l.isValid).length} INTERCEPTED
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/1">
                        <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Timestamp</th>
                        <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Signal Origin</th>
                        <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Proximity</th>
                        <th className="px-10 py-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Security Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-10 py-32 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-8">
                              <div className="absolute inset-0 border-4 border-orange-600/20 rounded-full" />
                              <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em]">Establishing Link...</p>
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-10 py-32 text-center">
                            <ShieldAlert className="w-16 h-16 text-white/5 mx-auto mb-6" />
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.5em]">No signals detected</p>
                          </td>
                        </tr>
                      ) : (
                        logs.map((log, index) => (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            key={log.id} 
                            className="group hover:bg-white/2 transition-colors relative"
                          >
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <Clock size={16} className="text-gray-600" />
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-white uppercase tracking-tighter">
                                    {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </p>
                                  <p className="text-[9px] text-gray-500 font-bold">
                                    {log.timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">{log.customerName}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-orange-600" />
                                  <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">UID: {log.customerId.slice(0, 12)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${
                                log.isValid ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-red-500/5 border-red-500/10 text-red-500'
                              }`}>
                                <MapPin size={14} />
                                <span className="text-xs font-black tracking-tighter italic">
                                  {Math.round(log.distance)}M
                                </span>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              {log.isValid ? (
                                <div className="flex items-center gap-3 text-emerald-500">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 text-red-500">
                                  <ShieldAlert size={16} />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                    {log.isSpoofed ? 'Spoof Block' : 'Range Block'}
                                  </span>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-white/1 border-t border-white/5 text-center">
                  <button className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3 mx-auto">
                    View Complete Archive <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
