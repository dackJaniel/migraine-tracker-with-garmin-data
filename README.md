# Migraine Tracker PWA

Local-first Progressive Web App (PWA) for migraine tracking, analytics, and correlations with health and weather data.

## Project status (important)

- Core tracking features are implemented (episodes, symptoms, intensity history, analytics, encrypted backup).
- Weather integration (Open-Meteo) is implemented.
- **Garmin Connect integration is not reliable yet**:
  - There are still issues in Garmin authentication and data fetching.
  - **Currently, only demo/fake Garmin data is practical** (seeded Garmin data).

See the Garmin-related notes in the documentation folder:

- [docu/GARMIN_AUTH_FIX_2026-01-05.md](docu/GARMIN_AUTH_FIX_2026-01-05.md)
- [docu/GARMIN_SYNC_FIX_2026-01-05.md](docu/GARMIN_SYNC_FIX_2026-01-05.md)

## Quick start

### Development

- `npm install`
- `npm run dev`

### Build

- `npm run build`

### Tests

- `npm test`
- `npm run test:e2e`

### Android (Capacitor)

See: [docu/ANDROID_BUILD_DEPLOYMENT.md](docu/ANDROID_BUILD_DEPLOYMENT.md)

## Documentation

- English overview: [docu/PROJECT_DOCUMENTATION_EN_2026-01-06.md](docu/PROJECT_DOCUMENTATION_EN_2026-01-06.md)
- Full documentation index (German): [docu/README.md](docu/README.md)
- Master plan/spec: [PROJECT_PLAN.md](PROJECT_PLAN.md)

## AI-generated code notice

This repository (including documentation) was generated with extensive assistance from AI tools. Please review the code and validate behavior before relying on it.

## Disclaimer

- Anyone may use, modify, and share this project under the MIT License.
- The software is provided **“as is”**, without any warranty.
- No guarantee is given that it works, fits a purpose, is secure, or is safe.
- Use at your own risk. You are responsible for verifying correctness and suitability.
- This project is **not** medical advice and **not** a certified medical device.

## License

MIT License — see [LICENSE](LICENSE).

## References

Internal references:

- [src/lib/db.ts](src/lib/db.ts)
- [src/lib/garmin/client.ts](src/lib/garmin/client.ts)
- [src/lib/garmin/http-client.ts](src/lib/garmin/http-client.ts)
- [src/lib/weather/sync-service.ts](src/lib/weather/sync-service.ts)

External references:

- Vite: https://vite.dev/
- React: https://react.dev/
- Dexie: https://dexie.org/
- Capacitor: https://capacitorjs.com/
- Open-Meteo: https://open-meteo.com/
- garth (community Garmin OAuth reference): https://github.com/matin/garth
- python-garminconnect: https://github.com/cyberjunky/python-garminconnect
- OAuth 1.0 (RFC 5849): https://www.rfc-editor.org/rfc/rfc5849
