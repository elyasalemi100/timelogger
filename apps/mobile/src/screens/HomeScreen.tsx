import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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

  useEffect(() => {
    if (!profile) return;

    async function fetch() {
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
    }

    fetch();
  }, [profile]);

  function formatDuration(ms: number) {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${h}h ${mins}m`;
  }

  const elapsed = currentShift
    ? Date.now() - new Date(currentShift.started_at).getTime()
    : 0;

  function handleStartShift() {
    (navigation as { navigate: (s: string, p?: object) => void }).navigate('ClockIn');
  }

  function handleEndShift() {
    setActionLoading(true);
    (navigation as { navigate: (s: string, p?: object) => void }).navigate('ClockIn', {
      mode: 'clock_out',
      shiftId: currentShift?.id,
    });
    setActionLoading(false);
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

  if (!currentShift) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Start your shift</Text>
        <TouchableOpacity
          style={styles.bigButton}
          onPress={handleStartShift}
          activeOpacity={0.8}
        >
          <Text style={styles.bigButtonText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Tap to clock in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.statusLabel}>On shift</Text>
        <Text style={styles.elapsed}>{formatDuration(elapsed)}</Text>
      </View>

      <View style={styles.actions}>
        {breakState === 'none' ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBreakStart}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Start break</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.breakButton]}
            onPress={handleBreakEnd}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>End break</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.endButton]}
          onPress={handleEndShift}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>End shift</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 48,
  },
  bigButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bigButtonText: {
    fontSize: 56,
    color: '#fff',
    fontWeight: '300',
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 16,
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
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
