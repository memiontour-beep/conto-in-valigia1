# Conto in Valigia 0.21 – preparazione APK

Progetto Expo/EAS predisposto per creare un APK Android installabile.

## Build cloud
Nel terminale del progetto:

```bash
eas login --no-browser
eas build --platform android --profile preview
```

Quando EAS chiede di creare/collegare il progetto Expo, accettare i valori predefiniti.
Se compare una richiesta di pagamento, fermarsi e non confermare.

Il profilo `preview` produce un APK tramite `android.buildType: apk`.
