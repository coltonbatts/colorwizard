# macOS Release Prep

This repo is configured for a signed/notarized Tauri macOS build, but credentials are not checked in and notarization is not complete.

## Before building

1. Install your `Developer ID Application` certificate in the local keychain.
2. Review [src-tauri/tauri.conf.json](/Users/coltonbatts/dev/github.com/coltonbatts/colorwizard/src-tauri/tauri.conf.json) and [src-tauri/entitlements.mac.plist](/Users/coltonbatts/dev/github.com/coltonbatts/colorwizard/src-tauri/entitlements.mac.plist).
3. Build with `npm run tauri:build:dmg` or `npm run tauri:build`.

## Verify the signed app

```bash
codesign --verify --deep --strict --verbose=2 src-tauri/target/release/bundle/macos/ColorWizard.app
spctl --assess --type execute --verbose=4 src-tauri/target/release/bundle/macos/ColorWizard.app
```

## Notarize and staple

Use your normal `xcrun notarytool submit ... --wait` flow against the generated `.app` or `.dmg`, then staple the accepted artifact:

```bash
xcrun stapler staple src-tauri/target/release/bundle/macos/ColorWizard.app
```
