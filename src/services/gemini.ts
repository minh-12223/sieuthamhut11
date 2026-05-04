import { GoogleGenAI } from "@google/genai";
import { SensorData, HealthInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeSensorData(data: SensorData[]): Promise<HealthInsight> {
  const latest = data[data.length - 1];
  const history = data.slice(-5).map(d => 
    `Time: ${d.timestamp}, Moisture: ${d.moisture}%, pH: ${d.ph}, Temp: ${d.temperature}°C, Pressure: ${d.pressure}mmHg`
  ).join("\n");

  const prompt = `
    Bạn là một chuyên gia AI y tế phân tích dữ liệu từ vật liệu siêu thấm hút thông minh (như tã thông minh hoặc băng gạc thông minh).
    Dữ liệu cảm biến hiện tại:
    - Độ ẩm: ${latest.moisture}%
    - pH: ${latest.ph}
    - Nhiệt độ: ${latest.temperature}°C
    - Áp lực: ${latest.pressure}mmHg

    Lịch sử gần đây:
    ${history}

    Hãy phân tích tình trạng sức khỏe của bệnh nhân và đưa ra dự đoán.
    Trả về kết quả dưới dạng JSON với cấu trúc:
    {
      "status": "normal" | "warning" | "critical",
      "prediction": "Mô tả ngắn gọn về những gì đang xảy ra hoặc sắp xảy ra",
      "recommendation": "Hành động gợi ý cho người chăm sóc"
    }
    Lưu ý: Chỉ trả về JSON, không có văn bản nào khác.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      timestamp: new Date().toLocaleTimeString(),
      status: result.status || "normal",
      prediction: result.prediction || "Không có dự đoán cụ thể.",
      recommendation: result.recommendation || "Tiếp tục theo dõi bệnh nhân.",
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      timestamp: new Date().toLocaleTimeString(),
      status: "normal",
      prediction: "Đang phân tích dữ liệu...",
      recommendation: "Vui lòng đợi trong giây lát.",
    };
  }
}
