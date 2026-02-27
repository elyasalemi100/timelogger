import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'shiftsnap_offline_queue';

export type QueuedAction = {
  id: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  payload: Record<string, unknown>;
  timestamp: string;
};

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(action: Omit<QueuedAction, 'id'>): Promise<void> {
  const queue = await getQueue();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  queue.push({ ...action, id });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((a) => a.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
