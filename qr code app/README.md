# qrly

An installable mobile web app for keeping screenshots of your QR codes together. The app runs in the browser and stores account records and QR screenshots locally on the device.

## Run it

Serve this folder from `localhost` or an HTTPS site (browser security requires a secure context for account sign-in and installable/offline features). For a quick local preview, from this folder run:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000` on your computer, or open the same address from a phone on the same Wi-Fi using your computer’s local network address. To install it on a phone, host it over HTTPS and choose **Add to Home Screen** in the browser menu.

## Notes

- Create an account in the app, then add QR screenshots from your photo library. Choose a name and category so they are easy to find.
- Open **My profile** (or the account icon on mobile) to change your display username, update your password, and switch between light and dark themes. Your email remains the sign-in name.
- Tap **Show to scan** for the large full-screen QR view. Keep the source screenshot clear and tightly framed for reliable scanning.
- Sign-in is local to this browser and device; there is no server, account recovery, sync, or password reset. Clearing browser storage removes the local account and saved codes.
- Screenshots are resized on-device before saving. No image upload or QR decoding service is used.
