/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Droplets, 
  Thermometer, 
  Gauge, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  History,
  BrainCircuit,
  Plus,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { SensorData, HealthInsight } from './types';
import { analyzeSensorData } from './services/gemini';
import { cn } from './lib/utils';
import { 
  subscribeToReadings, 
  subscribeToInsights,
  saveInsight,
} from './services/firebase';

export default function App() {
  const [dataHistory, setDataHistory] = useState<SensorData[]>([]);
  const [insight, setInsight] = useState<HealthInsight | null>(null);
  const [insightHistory, setInsightHistory] = useState<HealthInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  // Data subscriptions
  useEffect(() => {
    const handleGlobalError = (e: any) => {
      if (e.detail?.includes('permission_denied')) {
        setFbError("Lỗi quyền: Vui lòng kiểm tra tab 'Rules' trong Firebase Console (đặt .read/.write = true để test).");
      }
    };
    window.addEventListener('firebase-error', handleGlobalError);

    const unsubscribeReadings = subscribeToReadings((data) => {
      setDataHistory(data);
      if (data.length > 0) setFbError(null);
    });

    const unsubscribeInsights = subscribeToInsights((history) => {
      setInsightHistory(history);
      if (history.length > 0) {
        setInsight(history[0]);
      }
    });

    return () => {
      window.removeEventListener('firebase-error', handleGlobalError);
      unsubscribeReadings();
      unsubscribeInsights();
    };
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (dataHistory.length === 0) return;
    setIsAnalyzing(true);
    setFbError(null);
    try {
      const result = await analyzeSensorData(dataHistory);
      await saveInsight(result);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('permission_denied')) {
        setFbError("Không có quyền truy cập Database. Vui lòng cập nhật Rules trong Firebase Console.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [dataHistory]);

  // Auto-analysis logic
  useEffect(() => {
    if (!isAutoMode || dataHistory.length === 0) return;
    const interval = setInterval(handleAnalysis, 30000); // 30s auto-analysis
    return () => clearInterval(interval);
  }, [isAutoMode, handleAnalysis, dataHistory.length]);

  const latest = dataHistory[dataHistory.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {fbError && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="max-w-7xl mx-auto mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold shadow-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{fbError}</p>
          <button onClick={() => setFbError(null)} className="ml-auto hover:bg-red-100 p-1 rounded-lg transition-colors">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </motion.div>
      )}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-indigo-950">
              Visionary Health Monitor
            </h1>
            <p className="text-slate-500 font-medium">Hệ thống phân tích vật liệu siêu thấm hút</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={cn(
              "px-4 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm border",
              isAutoMode ? "bg-green-50 text-green-700 border-green-100" : "bg-white text-slate-500 border-slate-100"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isAutoMode && "animate-spin")} />
            {isAutoMode ? "Tự động AI" : "AI Thủ công"}
          </button>
          
          <button 
            onClick={handleAnalysis}
            disabled={isAnalyzing || dataHistory.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            <BrainCircuit className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
            {isAnalyzing ? "Đang phân tích..." : "Phân tích AI"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sensor Cards */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SensorCard 
              title="Độ ẩm" 
              value={latest ? `${latest.moisture.toFixed(1)}%` : "--"} 
              icon={<Droplets className="text-blue-500" />} 
              color="blue"
              trend={dataHistory.length > 1 && latest ? latest.moisture - dataHistory[dataHistory.length-2].moisture : 0}
            />
            <SensorCard 
              title="Độ pH" 
              value={latest ? latest.ph.toFixed(2) : "--"} 
              icon={<Activity className="text-purple-500" />} 
              color="purple"
              trend={dataHistory.length > 1 && latest ? latest.ph - dataHistory[dataHistory.length-2].ph : 0}
            />
            <SensorCard 
              title="Nhiệt độ" 
              value={latest ? `${latest.temperature.toFixed(1)}°C` : "--"} 
              icon={<Thermometer className="text-orange-500" />} 
              color="orange"
              trend={dataHistory.length > 1 && latest ? latest.temperature - dataHistory[dataHistory.length-2].temperature : 0}
            />
            <SensorCard 
              title="Áp lực" 
              value={latest ? `${latest.pressure.toFixed(1)} mmHg` : "--"} 
              icon={<Gauge className="text-emerald-500" />} 
              color="emerald"
              trend={dataHistory.length > 1 && latest ? latest.pressure - dataHistory[dataHistory.length-2].pressure : 0}
            />
          </div>

          {/* Charts */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-500" />
                  Xu hướng thời gian thực
                </h3>
                <p className="text-sm text-slate-400 font-medium">Dữ liệu cập nhật trực tiếp từ kho lưu trữ đám mây</p>
              </div>
            </div>
            <div className="h-[350px] w-full">
              {dataHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataHistory}>
                    <defs>
                      <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '16px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="moisture" 
                      stroke="#6366f1" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorMoisture)" 
                      animationDuration={1500}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pressure" 
                      stroke="#10b981" 
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorPressure)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-400">Hãy thêm dữ liệu để bắt đầu theo dõi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <h3 className="font-extrabold text-slate-900 mb-8 flex items-center gap-2 relative">
              <BrainCircuit className="w-6 h-6 text-indigo-500" />
              Phân tích Dự đoán
            </h3>

            <AnimatePresence mode="wait">
              {insight ? (
                <motion.div 
                  key="insight"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8 relative"
                >
                  <div className={cn(
                    "p-6 rounded-[2rem] flex items-start gap-4 transition-colors",
                    insight.status === 'normal' ? "bg-green-50 text-green-800" :
                    insight.status === 'warning' ? "bg-amber-50 text-amber-800" :
                    "bg-red-50 text-red-800"
                  )}>
                    <div className="mt-1">
                      {insight.status === 'normal' ? <CheckCircle2 className="w-8 h-8" /> :
                       insight.status === 'warning' ? <AlertTriangle className="w-8 h-8" /> :
                       <AlertCircle className="w-8 h-8" />}
                    </div>
                    <div>
                      <p className="font-black text-2xl tracking-tight capitalize">{insight.status}</p>
                      <p className="text-xs font-bold opacity-60 uppercase tracking-widest">{insight.timestamp}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Dự đoán lâm sàng</h4>
                      <div className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-6 rounded-[2rem] border border-slate-100 italic">
                        "{insight.prediction}"
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-3">Chỉ định đề xuất</h4>
                      <p className="text-indigo-950 font-bold leading-relaxed bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                        {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300 text-center">
                  <Activity className="w-16 h-16 mb-6 opacity-10 animate-pulse" />
                  <p className="font-bold text-lg mb-1">Dữ liệu thô đang chờ xử lý</p>
                  <p className="text-sm font-medium">Sử dụng AI để chuyển đổi dữ liệu thành thông tin y tế hữu ích.</p>
                </div>
              )}
            </AnimatePresence>
          </section>

          {/* History Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="font-extrabold text-slate-900 mb-8 flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-500" />
              Lịch sử ghi nhận
            </h3>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {insightHistory.length > 0 ? (
                insightHistory.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className="p-5 rounded-[1.5rem] border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-all group flex gap-4"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center",
                      item.status === 'normal' ? "bg-green-100 text-green-600" :
                      item.status === 'warning' ? "bg-amber-100 text-amber-600" :
                      "bg-red-100 text-red-600"
                    )}>
                      {item.status === 'normal' ? <CheckCircle2 className="w-5 h-5" /> :
                       item.status === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                       <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.timestamp}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-snug">{item.prediction}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <History className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold">Chưa có bản ghi nào</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-16 pb-12 text-center">
        <div className="w-12 h-1 bg-slate-200 mx-auto mb-6 rounded-full opacity-50" />
        <p className="font-black text-slate-300 uppercase tracking-[0.3em] text-[10px]">
          © 2026 Visionary Health Monitor • Advanced Bio-Material Analysis
        </p>
      </footer>
    </div>
  );
}

function SensorCard({ title, value, icon, color, trend }: { title: string, value: string, icon: React.ReactNode, color: string, trend: number }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-50",
    purple: "bg-purple-50 text-purple-600 shadow-purple-50",
    orange: "bg-orange-50 text-orange-600 shadow-orange-50",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-50",
  };

  return (
    <motion.div 
      whileHover={{ y: -8, shadow: "0 25px 50px -12px rgb(0 0 0 / 0.05)" }}
      className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group transition-all"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        </div>
        <div>
          <p className="text-4xl font-black text-slate-950 tracking-tighter">{value}</p>
          <div className="flex items-center gap-2 mt-2">
            {trend !== 0 ? (
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1",
                trend > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              )}>
                {trend > 0 ? <Plus className="w-2 h-2" /> : ""}
                {trend.toFixed(2)}
              </span>
            ) : (
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ổn định</span>
            )}
          </div>
        </div>
      </div>
      <div className={cn("p-6 rounded-[2rem] shadow-lg transition-transform group-hover:scale-110", colors[color])}>
        {icon}
      </div>
    </motion.div>
  );
}
