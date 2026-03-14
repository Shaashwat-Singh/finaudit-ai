import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import {
    LayoutDashboard,
    ArrowUpRight,
    ShieldAlert,
    Wallet
} from 'lucide-react';
import { getDashboardKPIs, getFlags, getSpendOverTime } from '../api';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
    })
};

export default function Dashboard() {
    const [kpis, setKpis] = useState(null);
    const [flags, setFlags] = useState([]);
    const [spendData, setSpendData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [kpiData, flagData, spendOverTime] = await Promise.all([
                    getDashboardKPIs(),
                    getFlags(),
                    getSpendOverTime()
                ]);
                setKpis(kpiData);
                setFlags(flagData.slice(0, 5));

                // Format spend data for chart
                const formattedSpend = spendOverTime.map(d => ({
                    name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    amount: d.amount
                }));
                setSpendData(formattedSpend);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="flex items-center justify-center h-full text-white/50">Loading dashboard...</div>;

    // Empty state check
    if (!kpis || kpis.total_transactions === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
                    <Wallet className="w-10 h-10 text-gray-300" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">No transactions yet</h2>
                    <p className="text-gray-500 max-w-sm">Connect your bank account or upload a CSV to start auditing your finances.</p>
                </div>
                <a href="/transactions" className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all">
                    Add your first transaction →
                </a>
            </div>
        );
    }

    const kpiCards = [
        { label: 'Total Transactions', value: kpis?.total_transactions, icon: LayoutDashboard, color: 'text-blue-500' },
        { label: 'Total Flagged', value: kpis?.total_flags, icon: ShieldAlert, color: 'text-amber-500' },
        { label: 'High Severity', value: kpis?.high_flags, icon: ArrowUpRight, color: 'text-red-500' },
        { label: 'Total Spend', value: `$${(kpis?.total_spend || 0).toLocaleString()}`, icon: Wallet, color: 'text-indigo-500' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Hero Header */}
            <header className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight">
                    <span className="gradient-text">FinAudit AI</span> Analytics
                </h1>
                <p className="text-gray-500 font-medium">Real-time financial monitoring and anomaly detection.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-default"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                                <h3 className="text-3xl font-bold tracking-tight text-gray-900">{card.value}</h3>
                            </div>
                            <div className={`p-2 rounded-xl bg-gray-50 group-hover:scale-110 transition-transform ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 p-8 bg-white rounded-3xl shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900">Spend Overview</h2>
                        <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">Daily</div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendData}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Recent Flags */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100"
                >
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Recent Flags</h2>
                    <div className="space-y-6">
                        {flags.length > 0 ? flags.map((flag) => (
                            <div key={flag.flag_id} className="flex items-start gap-4">
                                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${flag.severity === 'High' ? 'bg-red-500' : flag.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-none">{flag.vendor_name}</p>
                                    <p className="text-xs text-gray-400 font-medium">{flag.reason}</p>
                                    <p className="text-xs font-bold text-gray-900 mt-1">${flag.amount.toLocaleString()}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 italic">No recent flags found.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
