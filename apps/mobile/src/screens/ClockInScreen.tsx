import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getCurrentLocation, GeoResult } from '../lib/location';
import { useNavigation, useRoute } from '@react-navigation/native';

type RouteParams = { mode?: 'clock_in' | 'clock_out'; shiftId?: string };

export function ClockInScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params ?? {}) as RouteParams;
  const isClockOut = params.mode === 'clock_out' && params.shiftId;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [photoSkipped, setPhotoSkipped] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getCurrentLocation();
      setGeo(result);
      setGeoLoading(false);
    })();
  }, []);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera denied', 'Allow camera to capture clock-in photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoSkipped(false);
    }
  }

  async function handleSubmit() {
    if (!profile) return;

    const needsPhoto = !isClockOut; // Clock-out photo optional by default
    if (needsPhoto && !photoUri && !photoSkipped) {
      Alert.alert('Photo required', 'Take a photo or skip with a reason');
      return;
    }
    if (photoSkipped && !skipReason.trim()) {
      Alert.alert('Reason required', 'Enter a reason for skipping the photo');
      return;
    }
    if (geo?.status === 'denied' && !skipReason.trim()) {
      Alert.alert('Location required', 'Enter a reason for missing GPS');
      return;
    }

    setLoading(true);

    try {
      if (isClockOut) {
        let endPhotoPath: string | null = null;
        if (photoUri) {
          const path = `${profile.business_id}/${profile.user_id}/${Date.now()}_end.jpg`;
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const { error } = await supabase.storage
            .from('shift-photos')
            .upload(path, blob, { contentType: 'image/jpeg' });
          if (!error) endPhotoPath = path;
        }

        const { error } = await supabase
          .from('shifts')
          .update({
            ended_at: new Date().toISOString(),
            end_photo_path: endPhotoPath,
            end_geo: geo ?? undefined,
            status: 'submitted',
          })
          .eq('id', params.shiftId);

        if (error) throw error;
        navigation.goBack();
      } else {
        let startPhotoPath: string | null = null;
        if (photoUri) {
          const path = `${profile.business_id}/${profile.user_id}/${Date.now()}_start.jpg`;
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const { error } = await supabase.storage
            .from('shift-photos')
            .upload(path, blob, { contentType: 'image/jpeg' });
          if (!error) startPhotoPath = path;
        }

        const { error } = await supabase.from('shifts').insert({
          business_id: profile.business_id,
          user_id: profile.user_id,
          started_at: new Date().toISOString(),
          status: 'open',
          start_photo_path: startPhotoPath,
          start_geo: geo ?? undefined,
        });

        if (error) throw error;
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{isClockOut ? 'End shift' : 'Start shift'}</Text>

        {!isClockOut && (
          <>
            <Text style={styles.label}>Photo (required)</Text>
            {photoUri ? (
              <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
                <Text style={styles.photoText}>✓ Photo captured</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonText}>Take photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setPhotoSkipped(true)}
            >
              <Text style={styles.skipText}>Skip with reason</Text>
            </TouchableOpacity>
            {(photoSkipped || geo?.status !== 'ok') && (
              <TextInput
                style={styles.input}
                placeholder="Reason (e.g. camera denied)"
                value={skipReason}
                onChangeText={setSkipReason}
                multiline
              />
            )}
          </>
        )}

        {isClockOut && (
          <>
            <Text style={styles.label}>Photo (optional)</Text>
            {photoUri ? (
              <Text style={styles.photoText}>✓ Photo captured</Text>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonText}>Take photo</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={styles.label}>Location</Text>
        {geoLoading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.geoBox}>
            <Text style={geo?.status === 'ok' ? styles.geoOk : styles.geoWarn}>
              {geo?.status === 'ok'
                ? `✓ ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (acc: ${geo.accuracy?.toFixed(0) ?? '?'}m)`
                : `⚠ ${geo?.status ?? 'unknown'}`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? 'Saving...' : isClockOut ? 'End shift' : 'Start shift'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  photoButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoButtonText: {
    color: '#475569',
    fontSize: 16,
  },
  photoBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  photoText: {
    color: '#16a34a',
    fontSize: 16,
  },
  skipButton: {
    marginBottom: 12,
  },
  skipText: {
    color: '#64748b',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    minHeight: 60,
  },
  geoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  geoOk: {
    color: '#16a34a',
    fontSize: 14,
  },
  geoWarn: {
    color: '#f59e0b',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
