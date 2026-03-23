# mobile

Flutter app for the Shoppi mobile client.

## Local secrets setup

This project no longer stores Mapbox or Google Maps keys in git.

1. Add your Google Maps Android key to `mobile/android/local.properties`:

```properties
google.maps.api.key=your_google_maps_api_key
```

2. Create `mobile/ios/Flutter/Secrets.xcconfig` from the example file and fill in your iOS Google Maps key:

```xcconfig
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

3. Pass the Mapbox access token when you run or build Flutter:

```bash
flutter run --dart-define=MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
```

Use the same `--dart-define` flag for `flutter build ...` commands.
