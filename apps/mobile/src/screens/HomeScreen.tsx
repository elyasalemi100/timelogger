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
      .maybeSingle();

    setCurrentShift(data as Shift | null);

    if (data) {
      const { data: events } = await supabase
        .from('shift_events')
        .select('type')
        .eq('shift_id', data.id)
        .order('at', { ascending: false })
        .limit(1)
        .maybeSingle();
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
    backgroundColor: '#f1f5f9',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  bigButton: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bigButtonText: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '200',
  },
  hint: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  elapsed: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    letterSpacing: -1,
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonLarge: {
    minHeight: 56,
    justifyContent: 'center',
    marginTop: 12,
  },
  breakButton: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  endButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
});
