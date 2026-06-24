import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { wishlistService } from '@/services/wishlistService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextValue {
  wishlistIds:  Set<number>;
  count:        number;
  isWishlisted: (id: number) => boolean;
  toggle:       (id: number) => Promise<void>;
}

const STORAGE_KEY = 'wishlist-v1';

const WishlistContext = createContext<WishlistContextValue | null>(null);

function loadFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(() => loadFromStorage());
  const prevUserRef = useRef<typeof user>(undefined);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (user && !prevUser) {
      // ログイン直後: ローカルとサーバーをマージ
      const localIds = loadFromStorage();
      wishlistService.getAll()
        .then(async (serverIds) => {
          const merged = new Set([...serverIds, ...localIds]);
          setWishlistIds(merged);
          // ローカルのみの分をサーバーへ追加同期
          const toSync = [...localIds].filter((id) => !serverIds.includes(id));
          await Promise.all(toSync.map((id) => wishlistService.toggle(id).catch(() => {})));
        })
        .catch(() => {})
        .finally(() => {
          localStorage.removeItem(STORAGE_KEY);
        });
    } else if (!user && prevUser) {
      // ログアウト時: ローカルストレージに保存
      saveToStorage(wishlistIds);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 未ログイン時のみローカル保存
  useEffect(() => {
    if (!user) {
      saveToStorage(wishlistIds);
    }
  }, [wishlistIds, user]);

  const toggle = useCallback(async (id: number) => {
    if (!user) {
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      return;
    }
    const wasIn = wishlistIds.has(id);
    setWishlistIds((prev) => {
      const next = new Set(prev);
      wasIn ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await wishlistService.toggle(id);
    } catch (err) {
      setWishlistIds((prev) => {
        const next = new Set(prev);
        wasIn ? next.add(id) : next.delete(id);
        return next;
      });
      if (axios.isAxiosError(err)) {
        const apiErr = err.response?.data?.error;
        if (apiErr?.code === 'LIMIT_EXCEEDED') {
          showToast('warning', apiErr.message ?? 'ウィッシュリストの上限に達しました。プレミアムプランで無制限にご利用いただけます。');
          return;
        }
      }
      showToast('error', '操作に失敗しました');
    }
  }, [user, wishlistIds, showToast]);

  const isWishlisted = useCallback((id: number) => wishlistIds.has(id), [wishlistIds]);

  return (
    <WishlistContext.Provider value={{ wishlistIds, count: wishlistIds.size, isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
