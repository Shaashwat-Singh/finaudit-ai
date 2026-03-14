import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Sparkles,
    Settings,
    User,
    Bot,
    Settings2,
    Play,
    CheckCircle2
} from 'lucide-react';
import { agentChat, agentScan } from '../api';

const suggestedQuestions = [
    "Run a full anomaly scan",
    "Show me high severity flags",
    "Who are the riskiest vendors?",
    "Analyze transactions over $20k"
];

export default function AgentChat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your AI Financial Audit Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [toolsCalled, setToolsCalled] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, toolsCalled]);

    const handleSend = async (text) => {
        const msg = text || input;
        if (!msg.trim()) return;

        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setInput('');
        setIsTyping(true);
        setToolsCalled([]);

        try {
            if (msg.toLowerCase().includes('run a full anomaly scan')) {
                const result = await agentScan();
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: result.response,
                    stats: { found: result.anomalies_found, inserted: result.flags_inserted }
                }]);
                setToolsCalled(result.tools_called);
            } else {
                const result = await agentChat(msg);
                setMessages(prev => [...prev, { role: 'assistant', text: result.response }]);
                setToolsCalled(result.tools_called);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "I'm sorry, I encountered an error while processing your request." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] -m-8 flex flex-col bg-[#0f0f0f] text-white">
            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Audit Agent</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Powered by Gemini 2.0</span>
                        </div>
                    </div>
                </div>
                <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <Settings2 className="w-5 h-5" />
                </button>
            </header>

            {/* Suggested Chips */}
            <div className="px-8 py-4 flex gap-3 overflow-x-auto scrollbar-hide shrink-0 border-b border-white/5">
                {suggestedQuestions.map(q => (
                    <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all whitespace-nowrap"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-lg ${m.role === 'user' ? 'bg-white/10' : 'gradient-bg'
                                }`}>
                                {m.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                            </div>
                            <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : ''}`}>
                                <div className={`px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-white text-[#0f0f0f]' : 'bg-white/5 border border-white/5'
                                    }`}>
                                    {m.text}
                                    {m.stats && (
                                        <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                            <div className="p-3 rounded-2xl bg-white/5">
                                                <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Anomalies</p>
                                                <p className="text-xl font-bold">{m.stats.found}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white/5">
                                                <p className="text-[10px] font-bold text-white/40 uppercase mb-1">New Flags</p>
                                                <p className="text-xl font-bold">{m.stats.inserted}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Tool Indicators */}
                    {isTyping && toolsCalled.length > 0 && (
                        <div className="flex flex-col gap-2 ml-13">
                            {toolsCalled.map((tool, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 w-fit"
                                >
                                    <Settings className="w-3 h-3 animate-spin" />
                                    Tool: {tool}
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {isTyping && !toolsCalled.length && (
                        <div className="ml-13 p-3 bg-white/5 rounded-2xl border border-white/5 w-fit">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-8 pt-4">
                <div className="max-w-4xl mx-auto relative">
                    <input
                        type="text"
                        placeholder="Ask anything about the audit data..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="w-full bg-white/5 border border-white/5 rounded-3xl py-5 pl-8 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-sm placeholder:text-white/20"
                    />
                    <button
                        disabled={!input.trim() || isTyping}
                        onClick={() => handleSend()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
                <p className="text-center mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    AI may produce inaccurate information about financial entities.
                </p>
            </div>
        </div>
    );
}
