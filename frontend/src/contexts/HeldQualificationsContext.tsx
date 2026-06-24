import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { heldService } from '@/services/heldService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const STORAGE_KEY = 'held-qualifications-v1';

interface HeldContextValue {
  heldIds: Set<number>;
  toggleHeld: (id: number) => void;
  isHeld: (id: number) => boolean;
  refreshHeld: () => Promise<void>;
  count: number;
}

const HeldContext = createContext<HeldContextValue | null>(null);

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

export function HeldQualificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [heldIds, setHeldIds] = useState<Set<number>>(() => loadFromStorage());
  const prevUserRef = useRef<typeof user>(undefined);
  const syncedRef = useRef(false);

  // ログイン時: サーバーから取得 & ローカルをマージ
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (user && !prevUser) {
      // ログイン直後
      const localIds = loadFromStorage();
      heldService.getAll()
        .then((serverIds) => {
          const merged = new Set([...serverIds, ...localIds]);
          setHeldIds(merged);
          // ローカルにあったIDをサーバーへ同期
          const syncPromise = localIds.size > 0
            ? heldService.sync([...merged])
            : Promise.resolve();
          return syncPromise.then(() => {
            // 同期成功後のみ削除（失敗時はローカルを保持してページ再読込に備える）
            localStorage.removeItem(STORAGE_KEY);
          });
        })
        .catch(() => {
          // サーバーエラー時はローカルをそのまま使用
        })
        .finally(() => {
          syncedRef.current = true;
        });
    } else if (!user && prevUser) {
      // ログアウト時: ローカルストレージに保存
      saveToStorage(heldIds);
      syncedRef.current = false;
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 未ログイン時のみローカル保存
  useEffect(() => {
    if (!user) {
      saveToStorage(heldIds);
    }
  }, [heldIds, user]);

  const toggleHeld = useCallback((id: number) => {
    if (user) {
      // サーバーへ即時反映 & 楽観的UI更新
      setHeldIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      heldService.toggle(id).catch((err: unknown) => {
        setHeldIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        if (axios.isAxiosError(err)) {
          const apiErr = err.response?.data?.error;
          if (apiErr?.code === 'LIMIT_EXCEEDED') {
            showToast('warning', apiErr.message ?? '保有資格の登録上限に達しました。プレミアムプランで無制限にご利用いただけます。');
            return;
          }
        }
        showToast('error', '操作に失敗しました');
      });
    } else {
      setHeldIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }, [user, showToast]);

  const isHeld = useCallback((id: number) => heldIds.has(id), [heldIds]);

  const refreshHeld = useCallback(async () => {
    if (!user) return;
    try {
      const serverIds = await heldService.getAll();
      setHeldIds(new Set(serverIds));
    } catch {}
  }, [user]);

  return (
    <HeldContext.Provider value={{ heldIds, toggleHeld, isHeld, refreshHeld, count: heldIds.size }}>
      {children}
    </HeldContext.Provider>
  );
}

export function useHeldQualifications(): HeldContextValue {
  const ctx = useContext(HeldContext);
  if (!ctx) throw new Error('useHeldQualifications must be used within HeldQualificationsProvider');
  return ctx;
}
