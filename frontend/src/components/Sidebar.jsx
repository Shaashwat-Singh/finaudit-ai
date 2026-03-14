import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Store,
    ShieldAlert,
    MessageSquareCode,
    Sparkles,
} from 'lucide-react';

const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/vendors', label: 'Vendors', icon: Store },
    { to: '/flags', label: 'Audit Flags', icon: ShieldAlert },
    { to: '/agent', label: 'AI Agent', icon: MessageSquareCode },
];

export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0f0f0f] text-white flex flex-col z-50">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight">FinAudit AI</h1>
                        <p className="text-[11px] text-white/40 font-medium">Intelligent Auditing</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-primary-500/20 to-violet-500/20 text-white'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        <Icon className="w-[18px] h-[18px]" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10">
                <p className="text-[11px] text-white/30">© 2026 FinAudit AI</p>
            </div>
        </aside>
    );
}
