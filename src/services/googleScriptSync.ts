import { GlobalPortalState } from '../types';
import { apiSavePortalState, apiGetPortalData } from '../utils/googleScript';

/**
 * Save user portal state to Google Apps Script (and local cache backup)
 */
export async function savePortalStateToCloud(
  email: string,
  portalData: GlobalPortalState
): Promise<{ success: boolean; error?: string }> {
  const res = await apiSavePortalState(email, portalData);
  return {
    success: res.status === 'success',
    error: res.status === 'error' ? res.message : undefined,
  };
}

/**
 * Fetch user portal data from Google Apps Script with fallback to localStorage
 */
export async function getClientPortalDataFromCloud(
  email: string,
  token: string
): Promise<{ success: boolean; data?: GlobalPortalState; source?: 'cloud' | 'cache' }> {
  const cleanEmail = email.toLowerCase().trim();

  try {
    const res = await apiGetPortalData(cleanEmail, token);
    if (res.status === 'success' && res.portal_data) {
      return { success: true, data: res.portal_data, source: 'cloud' };
    }
  } catch (err) {
    console.warn('Cloud fetch failed, using local cache fallback', err);
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`jr_portal_cache_${cleanEmail}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.data) {
        return { success: true, data: parsed.data, source: 'cache' };
      }
    }
  } catch (e) {
    console.warn('Error reading local portal cache', e);
  }

  return { success: false };
}
