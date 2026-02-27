import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

type Shift = {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
};

type BreakState = 'none' | 'on_break';

export function HomeScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [breakState, setBreakState] = useState<BreakState>('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const fetchShift = useCallback(async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('shifts')
      .select('id, started_at, ended_at, status')
      .eq('business_id', profile.business_id)
      .eq('user_id', profile.user_id)
      .is('ended_at', null)
      .eq('status', 'open')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    setCurrentShift(data as Shift | null);

    if (data) {
      const { data: events } = await supabase
        .from('shift_events')
        .select('type')
        .eq('shift_id', data.id)
        .order('at', { ascending: false })
        .limit(1)
        .single();
      setBreakState(events?.type === 'break_start' ? 'on_break' : 'none');
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  // Live elapsed timer
  useEffect(() => {
    if (!currentShift) return;
    const update = () => setElapsed(Date.now() - new Date(currentShift.started_at).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [currentShift?.id, currentShift?.started_at]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShift();
  }, [fetchShift]);

  function formatDuration(ms: number) {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${h}h ${mins}m`;
  }

  function handleStartShift() {
    (navigation as { navigate: (s: string, p?: object) => void }).navigate('ClockIn');
  }

  function handleEndShift() {
    Alert.alert(
      'End shift',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End shift',
          style: 'destructive',
          onPress: () => {
            (navigation as { navigate: (s: string, p?: object) => void }).navigate('ClockIn', {
              mode: 'clock_out',
              shiftId: currentShift?.id,
            });
          },
        },
      ]
    );
  }

  async function handleBreakStart() {
    if (!currentShift) return;
    setActionLoading(true);
    const { error } = await supabase.from('shift_events').insert({
      shift_id: currentShift.id,
      type: 'break_start',
      at: new Date().toISOString(),
    });
    if (!error) setBreakState('on_break');
    setActionLoading(false);
  }

  async function handleBreakEnd() {
    if (!currentShift) return;
    setActionLoading(true);
    const { error } = await supabase.from('shift_events').insert({
      shift_id: currentShift.id,
      type: 'break_end',
      at: new Date().toISOString(),
    });
    if (!error) setBreakState('none');
    setActionLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const content = !currentShift ? (
    <>
      <Text style={styles.title}>Start your shift</Text>
      <Text style={styles.subtitle}>One tap to clock in</Text>
      <TouchableOpacity
        style={styles.bigButton}
        onPress={handleStartShift}
        activeOpacity={0.8}
      >
        <Text style={styles.bigButtonText}>+</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap the green button to clock in</Text>
    </>
  ) : (
    <>
      <View style={styles.card}>
        <Text style={styles.statusLabel}>On shift</Text>
        <Text style={styles.elapsed}>{formatDuration(elapsed)}</Text>
      </View>

      <View style={styles.actions}>
        {breakState === 'none' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonLarge]}
            onPress={handleBreakStart}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Start break</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.breakButton, styles.actionButtonLarge]}
            onPress={handleBreakEnd}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>End break</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.endButton, styles.actionButtonLarge]}
          onPress={handleEndShift}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>End shift</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
      }
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  bigButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bigButtonText: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '300',
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  elapsed: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonLarge: {
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 12,
  },
  breakButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  endButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});
