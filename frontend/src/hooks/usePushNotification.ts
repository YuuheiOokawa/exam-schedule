import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotification() {
  const [status,   setStatus]   = useState<PushStatus>('loading');
  const [toggling, setToggling] = useState(false);
  const { showToast } = useToast();

  const isSupported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    apiClient.get<{ success: boolean; data: { subscribed: boolean } }>('/push/status')
      .then((res) => setStatus(res.data.data.subscribed ? 'subscribed' : 'unsubscribed'))
      .catch(() => setStatus('unsubscribed'));
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setToggling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setStatus('denied');
        showToast('warning', 'ブラウザの通知設定をオンにしてから再度お試しください');
        return;
      }
      if (permission !== 'granted') return;

      const keyRes = await apiClient.get<{ success: boolean; data: { publicKey: string } }>(
        '/push/vapid-public-key'
      );
      const applicationServerKey = urlBase64ToUint8Array(keyRes.data.data.publicKey);

      // Service Worker が準備できるまで待機（最大10秒）
      const swReady = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SW_TIMEOUT')), 10_000)
        ),
      ]);

      const pushSub = await (swReady as ServiceWorkerRegistration).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = pushSub.toJSON();
      await apiClient.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });

      setStatus('subscribed');
      showToast('success', 'プッシュ通知を登録しました');
    } catch (e: unknown) {
      console.error('Push subscribe failed', e);
      const msg = (e as Error)?.message ?? '';
      if (msg === 'SW_TIMEOUT') {
        showToast('error', 'Service Workerの準備に失敗しました。ページを再読み込みしてお試しください');
      } else if (msg.includes('503') || msg.includes('VAPID_NOT_CONFIGURED')) {
        showToast('error', 'Push通知がサーバーで設定されていません');
      } else {
        showToast('error', 'プッシュ通知の登録に失敗しました');
      }
    } finally {
      setToggling(false);
    }
  }, [isSupported, showToast]);

  const unsubscribe = useCallback(async () => {
    setToggling(true);
    try {
      const reg     = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();
      if (pushSub) {
        await apiClient.delete('/push/subscribe', { data: { endpoint: pushSub.endpoint } });
        await pushSub.unsubscribe();
      }
      setStatus('unsubscribed');
      showToast('info', 'プッシュ通知を解除しました');
    } catch (e) {
      console.error('Push unsubscribe failed', e);
      showToast('error', 'プッシュ通知の解除に失敗しました');
    } finally {
      setToggling(false);
    }
  }, [showToast]);

  const toggle = useCallback(() => {
    if (status === 'subscribed') unsubscribe();
    else subscribe();
  }, [status, subscribe, unsubscribe]);

  return { status, toggling, toggle };
}
