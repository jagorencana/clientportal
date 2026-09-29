/**
 * Unified API Client for Jago Rencana Wealth OS Backend
 * Endpoint: Google Apps Script Web App
 */
export {
  DEFAULT_GOOGLE_SCRIPT_URL,
  getGoogleScriptUrl,
  apiPortalLogin,
  apiSavePortalState,
  apiForgotPassword,
  apiResetPassword,
  apiGetPortalData,
} from './googleScript';
export type { ApiResponse } from './googleScript';
