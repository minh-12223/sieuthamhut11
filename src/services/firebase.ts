import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set, 
  limitToLast, 
  query,
  off
} from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import { SensorData, HealthInsight } from '../types';

// Realtime Database URL construction
// Note: We use the asia-southeast1 location by default as requested
const databaseURL = (firebaseConfig as any).databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

const app = initializeApp({
  ...firebaseConfig,
  databaseURL
});

export const db = getDatabase(app);

// Data fetching helpers for Realtime Database
export const subscribeToReadings = (callback: (data: SensorData[]) => void) => {
  const readingsRef = query(ref(db, 'readings'), limitToLast(100));
  
  const listener = onValue(readingsRef, (snapshot) => {
    const rawData = snapshot.val();
    if (!rawData) {
      callback([]);
      return;
    }
    
    const readings: SensorData[] = [];

    // Hàm tiện ích để chuẩn hóa một bản ghi
    const parseReading = (item: any, id: string): SensorData => ({
      ...item,
      id,
      timestamp: item.timestamp || new Date().toLocaleTimeString(),
      moisture: Number(item.moisture ?? 0),
      ph: Number(item.ph ?? 0),
      temperature: Number(item.temperature ?? 0),
      pressure: Number(item.pressure ?? 0)
    });

    // 1. Kiểm tra xem chính node 'readings' có chứa dữ liệu trực tiếp không (nhập tay)
    if (typeof rawData.moisture !== 'undefined' || typeof rawData.ph !== 'undefined') {
      readings.push(parseReading(rawData, 'manual-entry'));
    }

    // 2. Kiểm tra các con của nó (dữ liệu tạo tự động có ID duy nhất)
    Object.entries(rawData).forEach(([key, value]) => {
      // Nếu là object và có chứa trường dữ liệu cảm biến
      if (value && typeof value === 'object') {
        const item = value as any;
        if (typeof item.moisture !== 'undefined' || typeof item.ph !== 'undefined') {
          readings.push(parseReading(item, key));
        }
      }
    });

    // Loại bỏ các bản ghi không hợp lệ và sắp xếp theo ID (thường ID Firebase tự tăng theo thời gian)
    callback(readings);
  }, (error) => {
    console.error("Firebase RTDB Error:", error.message);
    window.dispatchEvent(new CustomEvent('firebase-error', { detail: error.message }));
  });

  return () => off(readingsRef, 'value', listener);
};

export const subscribeToInsights = (callback: (data: HealthInsight[]) => void) => {
  const insightsRef = query(ref(db, 'insights'), limitToLast(10));
  
  const listener = onValue(insightsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    const insights = Object.values(data).reverse() as HealthInsight[];
    callback(insights);
  }, (error) => {
    console.error("RTDB Error (insights):", error);
  });

  return () => off(insightsRef, 'value', listener);
};

export const saveInsight = async (insight: HealthInsight) => {
  const insightsRef = ref(db, 'insights');
  const newInsightRef = push(insightsRef);
  await set(newInsightRef, {
    ...insight,
    serverTimestamp: Date.now()
  });
};
