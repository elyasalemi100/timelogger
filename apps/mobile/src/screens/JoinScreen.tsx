import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function JoinScreen({
  navigation,
  route,
}: {
  navigation: { navigate: (s: string) => void };
  route: { params?: { token?: string; name?: string; email?: string } };
}) {
  const { refreshProfile } = useAuth();
  const [token, setToken] = useState(route.params?.token ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    setError('');
    if (!token.trim()) {
      setError('Enter invite code');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Sign in first');
      setLoading(false);
      return;
    }

    const { data: invite } = await supabase
      .from('invites')
      .select('id, business_id, role')
      .eq('token', token.trim().toUpperCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!invite) {
      setError('Invalid or expired invite code');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', invite.business_id)
      .maybeSingle();

    if (profile) {
      setError('You already joined this business');
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const { error: insertErr } = await supabase.from('profiles').insert({
      user_id: user.id,
      business_id: invite.business_id,
      role: invite.role,
      name: userData?.name ?? route.params?.name ?? user.email?.split('@')[0] ?? 'Employee',
      email: userData?.email ?? user.email ?? '',
      is_active: true,
    });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    await supabase
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    setLoading(false);
    await refreshProfile();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Join business</Text>
        <Text style={styles.subtitle}>Enter your invite code</Text>

        <TextInput
          style={styles.input}
          placeholder="Invite code (e.g. ABC123)"
          value={token}
          onChangeText={setToken}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Joining...' : 'Join'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
