export default {
  expo: {
    name: 'ShiftSnap',
    slug: 'shiftsnap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.shiftsnap.app',
      infoPlist: {
        NSCameraUsageDescription: 'ShiftSnap needs camera access to capture clock-in photos.',
        NSLocationWhenInUseUsageDescription: 'ShiftSnap needs location to record your clock-in/out position.',
        NSPhotoLibraryUsageDescription: 'ShiftSnap needs photo access to save clock-in photos.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
      },
      permissions: [
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
      package: 'com.shiftsnap.app',
    },
    plugins: [
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow ShiftSnap to access your camera for clock-in photos.',
          photosPermission: 'Allow ShiftSnap to access your photos.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'ShiftSnap needs your location to record clock-in/out.',
        },
      ],
    ],
  },
};
