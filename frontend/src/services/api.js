import axios from 'axios';

// Flask backend runs on port 5000
const API_BASE_URL = 'http://127.0.0.1:5000';

/**
 * Start a new scan with given parameters.
 * POST /api/start-scan
 */
export const startScan = async ({ target, start, end, threads }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/start-scan`, {
      target,
      start: Number(start),
      end: Number(end),
      threads: Number(threads),
    }, { timeout: 120000 });
    return response.data;
  } catch (error) {
    console.error("Error starting scan:", error);
    throw error;
  }
};

/**
 * Get the last saved scan results (GET).
 * GET /api/start-scan
 */
export const getScanResults = async (target) => {
  try {
    // If a target is provided, include it as a query param so backend
    // can return per-target results (e.g. /api/start-scan?target=1.2.3.4)
    const url = target ? `${API_BASE_URL}/api/start-scan?target=${encodeURIComponent(target)}` : `${API_BASE_URL}/api/start-scan`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching scan results:", error);
    return null;
  }
};

/**
 * Get current scan status.
 * GET /api/scan-status
 */
export const getScanStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/scan-status`);
    return response.data;
  } catch (error) {
    console.error("Error fetching scan status:", error);
    return null;
  }
};

/**
 * Build the SSE stream URL for a target.
 */
export const getScanStreamUrl = (target) => {
  return `${API_BASE_URL}/api/scan-stream?target=${encodeURIComponent(target)}`;
};

// Legacy export for backwards compatibility
export const getRiskReport = getScanResults;