import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
    Search,
    Plus,
    X,
    ChevronRight,
    FileText,
    Calendar,
    Building2,
    Tag,
    Upload,
    Loader2,
    CheckCircle2,
    ArrowRightLeft
} from 'lucide-react';
import { getTransactions, createTransaction, getVendors, getCategories, agentScan } from '../api';

export default function Transactions() {
    const [txns, setTxns] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        vendor_id: '',
        category_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        company_id: 1, // Default for demo
        user_id: 1 // Default for demo
    });

    // CSV State
    const [uploadProgress, setUploadProgress] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                const [txnData, vendorData, catData] = await Promise.all([
                    getTransactions(),
                    getVendors(),
                    getCategories()
                ]);
                setTxns(txnData);
                setVendors(vendorData);
                setCategories(catData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createTransaction({
                ...formData,
                vendor_id: parseInt(formData.vendor_id),
                category_id: parseInt(formData.category_id),
                amount: parseFloat(formData.amount)
            });

            // Auto-trigger scan
            await agentScan();

            // Refresh list
            const updated = await getTransactions();
            setTxns(updated);
            setShowForm(false);
            setFormData({
                vendor_id: '',
                category_id: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                company_id: 1,
                user_id: 1
            });
        } catch (error) {
            alert('Error creating transaction: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                setUploadProgress(0);

                let successCount = 0;
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        await createTransaction({
                            vendor_id: parseInt(row.vendor_id),
                            category_id: parseInt(row.category_id),
                            amount: parseFloat(row.amount),
                            date: row.date,
                            description: row.description || '',
                            company_id: 1,
                            user_id: 1
                        });
                        successCount++;
                    } catch (err) {
                        console.error('Error uploading row:', row, err);
                    }
                    setUploadProgress(Math.round(((i + 1) / rows.length) * 100));
                }

                if (successCount > 0) {
                    await agentScan();
                    const updated = await getTransactions();
                    setTxns(updated);
                }

                setTimeout(() => setUploadProgress(null), 2000);
            }
        });
    };

    const filtered = txns.filter(t =>
        t.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center h-full text-white/50">Loading transactions...</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
                    <p className="text-gray-500 font-medium">Review and manage company expenditures.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer group">
                        <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-sm shadow-sm hover:surface-hover transition-all">
                            {uploadProgress !== null ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    Uploading {uploadProgress}%
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    Import CSV
                                </>
                            )}
                        </div>
                    </label>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all text-white hover:text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search by vendor or description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900"
                />
            </div>

            {txns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <ArrowRightLeft className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-bold mb-6">No transactions yet. Add your first one →</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-2.5 gradient-bg text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20"
                    >
                        Add Transaction
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden font-sans">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 uppercase tracking-widest text-[10px] font-bold text-gray-400">
                                    <th className="px-8 py-5">Date</th>
                                    <th className="px-8 py-5">Vendor</th>
                                    <th className="px-8 py-5">Category</th>
                                    <th className="px-8 py-5">Amount</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 divide-dashed">
                                {filtered.map((t) => (
                                    <tr
                                        key={t.txn_id}
                                        onClick={() => setSelectedTxn(t)}
                                        className="group hover:bg-gray-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-8 py-5 text-sm font-semibold text-gray-500">{t.date}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 leading-tight">{t.vendor_name}</span>
                                                <span className="text-[11px] text-gray-400 font-medium">{t.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                                {t.category_name}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-black text-gray-900">${t.amount.toLocaleString()}</td>
                                        <td className="px-8 py-5">
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Audited
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowForm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        />
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onSubmit={handleSubmit}
                            className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black tracking-tight text-gray-900">New Transaction</h2>
                                <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Vendor</label>
                                    <select
                                        required
                                        value={formData.vendor_id}
                                        onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                    <select
                                        required
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-8 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Description</label>
                                <textarea
                                    placeholder="What was this for?"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold h-24"
                                />
                            </div>

                            <button
                                disabled={isSubmitting}
                                className="w-full py-5 gradient-bg text-white rounded-3xl font-black text-lg shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all text-white hover:text-white flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Authorize Payment"}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* Detail Drawer */}
            <AnimatePresence>
                {selectedTxn && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTxn(null)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] p-10 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-indigo-500" />
                                </div>
                                <button
                                    onClick={() => setSelectedTxn(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-1 mb-10">
                                <h2 className="text-3xl font-black tracking-tight text-gray-900">${selectedTxn.amount.toLocaleString()}</h2>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Transaction Details</p>
                            </div>

                            <div className="space-y-8 flex-1">
                                {[
                                    { icon: Building2, label: 'Vendor', value: selectedTxn.vendor_name },
                                    { icon: Tag, label: 'Category', value: selectedTxn.category_name },
                                    { icon: Calendar, label: 'Date', value: selectedTxn.date },
                                    { icon: FileText, label: 'Description', value: selectedTxn.description },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                            <item.icon className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                            <p className="text-gray-900 font-bold">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full py-4 gradient-bg text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                                Download Receipt
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
