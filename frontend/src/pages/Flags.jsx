import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert,
    CheckCircle2,
    Calendar,
    DollarSign,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';
import { getFlags, markFlagReviewed } from '../api';

const severities = ['All', 'High', 'Medium', 'Low'];

export default function Flags() {
    const [flags, setFlags] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await getFlags();
                setFlags(data);
            } catch (error) {
                console.error('Error fetching flags:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleReview = async (flagId) => {
        try {
            await markFlagReviewed(flagId);
            setFlags(prev => prev.map(f => f.flag_id === flagId ? { ...f, reviewed: true } : f));
        } catch (error) {
            console.error('Error marking flag as reviewed:', error);
        }
    };

    const filtered = flags.filter(f => activeTab === 'All' || f.severity === activeTab);

    if (loading) return <div className="flex items-center justify-center h-full text-white/50">Loading flags...</div>;

    if (flags.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Your accounts are clean</h2>
                    <p className="text-gray-500 max-w-sm">No anomalies detected. Our AI agent is continuously monitoring for any suspicious patterns.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Audit Flags</h1>
                    <p className="text-gray-500 font-medium">Review and resolve potential financial anomalies.</p>
                </div>

                {/* Severity Tabs */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
                    {severities.map((sev) => (
                        <button
                            key={sev}
                            onClick={() => setActiveTab(sev)}
                            className={`relative px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === sev ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span className="relative z-10">{sev}</span>
                            {activeTab === sev && (
                                <motion.div
                                    layoutId="tab"
                                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-gray-100"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="popLayout">
                    {filtered.map((flag, i) => (
                        <motion.div
                            key={flag.flag_id}
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-8 bg-white rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center gap-8 group transition-all duration-500 ${flag.reviewed ? 'opacity-60 grayscale' : 'hover:shadow-xl'
                                } ${flag.severity === 'High' ? 'border-l-[6px] border-l-red-500 border-gray-100' :
                                    flag.severity === 'Medium' ? 'border-l-[6px] border-l-amber-500 border-gray-100' :
                                        'border-l-[6px] border-l-blue-500 border-gray-100'
                                }`}
                        >
                            <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${flag.severity === 'High' ? 'bg-red-50 text-red-600' :
                                        flag.severity === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                        <AlertTriangle className="w-3 h-3" />
                                        {flag.severity} Severity
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {flag.date}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {flag.vendor_name} — ${flag.amount.toLocaleString()}
                                    </h3>
                                    <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">{flag.reason}</p>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-900">Avg: ${flag.vendor_avg?.toLocaleString() || 'N/A'}</span>
                                    </div>
                                    {flag.pct_above_avg && (
                                        <div className="text-[10px] font-black italic text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">
                                            +{flag.pct_above_avg}% ABOVE AVG
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 shrink-0">
                                {flag.reviewed ? (
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold px-6 py-3 rounded-2xl bg-emerald-50">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Reviewed
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleReview(flag.flag_id)}
                                        className="flex items-center gap-2 bg-[#0f0f0f] text-white font-bold px-6 py-3 rounded-2xl border border-white/10 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 group/btn"
                                    >
                                        Mark Reviewed
                                        <ChevronRight className="w-4 h-4 text-white/50 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
