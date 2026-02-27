import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

type Shift = {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
};

export function HistoryScreen() {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function fetch() {
      const from = new Date();
      from.setDate(from.getDate() - 14);
      const { data } = await supabase
        .from('shifts')
        .select('id, started_at, ended_at, status')
        .eq('business_id', profile.business_id)
        .eq('user_id', profile.user_id)
        .gte('started_at', from.toISOString())
        .order('started_at', { ascending: false });

      setShifts((data as Shift[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [profile]);

  function formatDuration(s: Shift) {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const mins = (end - start) / 60000;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last 14 days</Text>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{format(new Date(item.started_at), 'EEE dd MMM')}</Text>
            <Text style={styles.time}>
              {format(new Date(item.started_at), 'HH:mm')}
              {item.ended_at ? ` – ${format(new Date(item.ended_at), 'HH:mm')}` : ' – ...'}
            </Text>
            <View style={styles.row}>
              <Text style={styles.duration}>{formatDuration(item)}</Text>
              <Text style={[styles.status, item.status === 'open' && styles.statusOpen]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shifts</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  time: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  duration: {
    fontSize: 14,
    color: '#475569',
  },
  status: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOpen: {
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  empty: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 24,
  },
});
