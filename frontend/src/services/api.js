import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Tera FastAPI backend port

export const getRiskReport = async () => {
  try {
    // Backend se intelligence report fetch karna
    const response = await axios.get(`${API_BASE_URL}/get-risk-report`);
    return response.data;
  } catch (error) {
    console.error("Error fetching risk report:", error);
    return null;
  }
};