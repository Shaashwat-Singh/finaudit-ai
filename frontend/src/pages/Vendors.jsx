import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ShieldAlert,
    ArrowRight,
    User,
    History
} from 'lucide-react';
import { getVendors } from '../api';

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await getVendors();
                setVendors(data);
            } catch (error) {
                console.error('Error fetching vendors:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="flex items-center justify-center h-full text-white/50">Loading vendors...</div>;

    if (vendors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                    <Store className="w-10 h-10 text-gray-300" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">No vendors found</h2>
                    <p className="text-gray-500 max-w-sm">Vendors will appear here once you start adding transactions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Vendors</h1>
                <p className="text-gray-500 font-medium">Monitoring vendor behavior and risk profiles.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vendors.map((v, i) => (
                    <motion.div
                        key={v.vendor_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`glass p-8 rounded-3xl group cursor-default shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all ${v.txn_count > 5 && v.avg_amount > 1000 ? 'border-amber-200/50' : 'border-white/30'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            {v.txn_count > 0 ? (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${v.avg_amount > 5000 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    {v.avg_amount > 5000 ? 'High Risk' : 'Healthy'}
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                    New
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{v.vendor_name}</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Vendor Profile</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Avg Order</p>
                                <p className="text-lg font-black text-gray-900">${(v.avg_amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Txns</p>
                                <p className="text-lg font-black text-gray-900">{v.txn_count || 0}</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/40 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                                <History className="w-3.5 h-3.5" />
                                View History
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
