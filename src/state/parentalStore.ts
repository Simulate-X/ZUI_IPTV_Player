import { create } from 'zustand';
import { getDB } from '@/services/db';
import { hashPin, verifyPin } from '@/services/pinHash';

interface ParentalState {
  pinHash: string | null;
  protectedCategories: Set<string>;
  unlockedThisSession: boolean;
  
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  toggleProtected: (categoryName: string) => Promise<void>;
  autoDetectProtected: (allCategoryNames: string[]) => Promise<void>;
  unlockSession: (enteredPin: string) => Promise<boolean>;
  lockSession: () => void;
  isProtected: (categoryName: string) => boolean;
  loadFromDB: () => Promise<void>;
}

const ADULT_REGEX = /\b(adults?|xxx|erotic|porn|18\+|hot)\b/i;

export const useParentalStore = create<ParentalState>((set, get) => ({
  pinHash: null,
  protectedCategories: new Set(),
  unlockedThisSession: false,
  
  setPin: async (pin: string) => {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN 4-6 haneli sayısal olmalı');
    }
    const hash = await hashPin(pin);
    set({ pinHash: hash });
    const db = await getDB();
    await db.put('uiState', { id: 'parentalPinHash', value: hash });
  },
  
  clearPin: async () => {
    set({ pinHash: null, unlockedThisSession: false, protectedCategories: new Set() });
    const db = await getDB();
    await db.delete('uiState', 'parentalPinHash');
    await db.delete('uiState', 'parentalProtectedCategories');
  },
  
  toggleProtected: async (categoryName: string) => {
    const next = new Set(get().protectedCategories);
    if (next.has(categoryName)) next.delete(categoryName);
    else next.add(categoryName);
    set({ protectedCategories: next });
    const db = await getDB();
    await db.put('uiState', { id: 'parentalProtectedCategories', value: Array.from(next) });
  },
  
  autoDetectProtected: async (allCategoryNames: string[]) => {
    const detected = allCategoryNames.filter(name => ADULT_REGEX.test(name));
    const next = new Set([...get().protectedCategories, ...detected]);
    set({ protectedCategories: next });
    const db = await getDB();
    await db.put('uiState', { id: 'parentalProtectedCategories', value: Array.from(next) });
    console.log(`[parental] auto-detected ${detected.length} protected categories: ${detected.join(', ')}`);
  },
  
  unlockSession: async (enteredPin: string): Promise<boolean> => {
    const { pinHash } = get();
    if (!pinHash) return true;  // no PIN set, always unlocked
    
    const valid = await verifyPin(enteredPin, pinHash);
    if (valid) {
      set({ unlockedThisSession: true });
      console.log('[parental] session unlocked');
    } else {
      console.warn('[parental] incorrect PIN attempt');
    }
    return valid;
  },
  
  lockSession: () => {
    set({ unlockedThisSession: false });
  },
  
  isProtected: (categoryName: string): boolean => {
    const { protectedCategories, pinHash } = get();
    return !!pinHash && protectedCategories.has(categoryName);
  },
  
  loadFromDB: async () => {
    const db = await getDB();
    const hashRecord = await db.get('uiState', 'parentalPinHash');
    const protectedRecord = await db.get('uiState', 'parentalProtectedCategories');
    
    set({
      pinHash: hashRecord?.value ?? null,
      protectedCategories: new Set(protectedRecord?.value ?? []),
      unlockedThisSession: false,  // her session başında lock
    });
  },
}));
