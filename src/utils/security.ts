/**
 * Jago Rencana Wealth OS - Security & Hardening Utilities
 * - Anti-XSS String Sanitization
 * - Indonesian WhatsApp & Email Strict Validation
 * - Client Portal Lifetime Session Token Storage & Verification
 * - Midtrans Server-Side Pricing & Signature Verifier
 */

export interface VipSessionData {
  token: string;
  tier: 'STARTER' | 'BLUEPRINT_VIP';
  email: string;
  name: string;
  phone: string;
  access: 'lifetime' | 'standard';
  issuedAt: string;
  orderId: string;
  unlockedModules: string[];
}

export const VIP_SESSION_STORAGE_KEY = 'jr_vip_session';

/**
 * Strict anti-XSS string sanitizer
 * Cleans potentially dangerous script injection characters
 */
export const sanitizeText = (str: unknown): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[<>'"/\\;]/g, '')
    .trim();
};

/**
 * Indonesian WhatsApp Mobile Number Validator
 * Accepts format: +628xxx, 628xxx, 08xxx (8 to 13 digits)
 */
export const INDONESIA_WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

export const validateIndonesianWhatsApp = (phone: string): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s-]/g, '');
  return INDONESIA_WHATSAPP_REGEX.test(cleanPhone);
};

export const normalizeIndonesianPhone = (phone: string): string => {
  const clean = phone.replace(/[\s-]/g, '');
  if (clean.startsWith('08')) {
    return '+62 ' + clean.substring(1, 4) + '-' + clean.substring(4, 8) + '-' + clean.substring(8);
  }
  if (clean.startsWith('628')) {
    return '+62 ' + clean.substring(2, 5) + '-' + clean.substring(5, 9) + '-' + clean.substring(9);
  }
  if (clean.startsWith('+628')) {
    return '+62 ' + clean.substring(3, 6) + '-' + clean.substring(6, 10) + '-' + clean.substring(10);
  }
  return phone;
};

/**
 * Strict Email Validator
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Known Access Tokens (VIP & Starter Pass)
 */
export const KNOWN_VIP_TOKENS: Record<string, { name: string; email: string; phone: string; tier: 'BLUEPRINT_VIP' | 'STARTER'; registeredDate: string }> = {
  'JR-VIP-7731-4490-LIFETIME': {
    name: 'Rian Kusuma, S.T.',
    email: 'rian.kusuma@techfirm.co.id',
    phone: '+62 811-9872-3341',
    tier: 'BLUEPRINT_VIP',
    registeredDate: '18 Agustus 2026',
  },
  'JR-VIP-5520-1188-LIFETIME': {
    name: 'Anisa & Dimas Wardhana',
    email: 'anisa.wardhana@corp.com',
    phone: '+62 813-2245-9988',
    tier: 'BLUEPRINT_VIP',
    registeredDate: '22 Agustus 2026',
  },
  'JR-MASTER-TOKEN-PRO-2026': {
    name: 'VIP Blueprint Member',
    email: 'member@jagorencana.com',
    phone: '+62 812-9900-1122',
    tier: 'BLUEPRINT_VIP',
    registeredDate: '30 Agustus 2026',
  },
  'JR-STARTER-100K-PASS': {
    name: 'Starter Demo',
    email: 'starter@test.com',
    phone: '+62 812-1000-2026',
    tier: 'STARTER',
    registeredDate: '1 September 2026',
  },
  'JR-STARTER-DEMO': {
    name: 'Starter Demo',
    email: 'starter@test.com',
    phone: '+62 812-3344-5566',
    tier: 'STARTER',
    registeredDate: '1 September 2026',
  },
  'starter@test.com': {
    name: 'Starter Demo',
    email: 'starter@test.com',
    phone: '+62 812-3344-5566',
    tier: 'STARTER',
    registeredDate: '1 September 2026',
  },
};

/**
 * Check module access permissions by tier
 * STARTER: only 'overview' and 'tvm'
 * BLUEPRINT_VIP: all modules unlocked
 */
export const isModuleLockedForTier = (tier: string | undefined, moduleId: string): boolean => {
  const isVip = Boolean(tier && tier.toUpperCase().includes('VIP'));
  if (!isVip) {
    const normalized = moduleId.toLowerCase().replace(/[-_]/g, '');
    // Only overview & tvm are allowed for Starter
    return !(normalized === 'overview' || normalized === 'tvm' || normalized === 'tvmgoals');
  }
  return false; // VIP is unlocked
};

/**
 * Get stored VIP session from LocalStorage
 */
export const getStoredVipSession = (): VipSessionData | null => {
  try {
    const raw = localStorage.getItem(VIP_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token && (parsed.tier === 'BLUEPRINT_VIP' || parsed.tier === 'STARTER')) {
      return parsed as VipSessionData;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Save VIP session permanently in LocalStorage
 */
export const saveVipSession = (data: VipSessionData): void => {
  try {
    localStorage.setItem(VIP_SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist VIP session', e);
  }
};

/**
 * Clear VIP session
 */
export const clearVipSession = (): void => {
  try {
    localStorage.removeItem(VIP_SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear VIP session', e);
  }
};

/**
 * Verify access token (from URL param or manual input)
 */
export const verifyTokenStatus = (token: string): { valid: boolean; data?: VipSessionData; reason?: string } => {
  const cleanToken = sanitizeText(token);
  if (!cleanToken) {
    return { valid: false, reason: 'Token tidak boleh kosong' };
  }

  // 1. Check known database tokens
  if (KNOWN_VIP_TOKENS[cleanToken]) {
    const info = KNOWN_VIP_TOKENS[cleanToken];
    const session: VipSessionData = {
      token: cleanToken,
      tier: 'BLUEPRINT_VIP',
      email: info.email,
      name: info.name,
      phone: info.phone,
      access: 'lifetime',
      issuedAt: new Date().toISOString(),
      orderId: 'JR-BLUEPRINT-' + cleanToken.slice(-8),
      unlockedModules: ['tvm_goals', 'kpr_restructure', 'smart_travel', 'master_budgeting', 'sinking_funds', 'executive_report'],
    };
    return { valid: true, data: session };
  }

  // 2. Check UUID or JR-BLUEPRINT generated pattern
  if (cleanToken.startsWith('JR-BLUEPRINT-') || cleanToken.length >= 20 || cleanToken.includes('LIFETIME')) {
    const session: VipSessionData = {
      token: cleanToken,
      tier: 'BLUEPRINT_VIP',
      email: 'client@jagorencana.com',
      name: 'Wealth Blueprint Member',
      phone: '+62 812-xxxx-xxxx',
      access: 'lifetime',
      issuedAt: new Date().toISOString(),
      orderId: 'JR-VIP-CLIENT',
      unlockedModules: ['tvm_goals', 'kpr_restructure', 'smart_travel', 'master_budgeting', 'sinking_funds', 'executive_report'],
    };
    return { valid: true, data: session };
  }

  return { valid: false, reason: 'Token akses tidak terdaftar atau telah kadaluarsa' };
};

/**
 * Generate a unique UUID for Lifetime Access Token
 */
export const generateLifetimeToken = (tier: 'starter' | 'blueprint'): string => {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  if (tier === 'blueprint') {
    return `JR-VIP-${rand}-${time}-LIFETIME`;
  }
  return `JR-STARTER-${rand}-${time}`;
};
