export interface SensorData {
  timestamp: string;
  moisture: number; // 0-100%
  ph: number; // 0-14
  temperature: number; // Celsius
  pressure: number; // mmHg or kPa
}

export interface HealthInsight {
  timestamp: string;
  status: "normal" | "warning" | "critical";
  prediction: string;
  recommendation: string;
}
