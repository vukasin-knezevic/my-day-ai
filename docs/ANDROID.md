# Android app: a step-by-step guide for a complete beginner

For the phone **Xiaomi Redmi Note 13 Pro 5G** (Android 16, HyperOS). Every step says what to click and where.
The web app (GitHub Pages) is not touched by any of this.

## 1. Install the tools (on the computer)

1. Install **Android Studio** from <https://developer.android.com/studio>. In the installer keep **Android SDK**,
   **Android SDK Platform** and **Android Virtual Device** ticked. It brings its own Java.
2. Open Android Studio once → **More Actions → SDK Manager**:
   - tab **SDK Platforms**: tick **Android 16 (API 36)** (or the newest one shown) → Apply;
   - tab **SDK Tools**: tick **Android SDK Platform-Tools** and **Android SDK Build-Tools** → Apply.
3. **A JDK 21 is needed** (Capacitor 8 asks Gradle for it; a newer Java such as 25/26 alone is not enough):
   Android Studio → **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** →
   open the list → **Download JDK…** → version **21** (any vendor) → Download. Then open the `android` folder of
   this project in Android Studio (**File → Open**) and let it finish **Sync**.
4. Install **Node.js** (LTS) if you do not have it, then in the project folder: `npm install`.

## 2. Prepare the phone

1. **Settings → About phone** → tap the **OS version (HyperOS / MIUI version)** 7 times. It says "You are now a developer".
2. **Settings → Additional settings → Developer options** (the path can differ a little; use the search box).
3. Turn on **USB debugging**. On Xiaomi also turn on **Install via USB** and **USB debugging (Security settings)**.
   These two ask you to sign in to a **Mi account** and sometimes need a **SIM card** and mobile data once.
   If an option is greyed out: sign in to the Mi account first, insert a SIM, wait a minute, try again.
4. Connect the cable (use a data cable, not a charge-only one). On the phone choose **File transfer** if it asks,
   then tap **Allow USB debugging** (tick "Always allow from this computer").
5. Check on the computer (Windows PowerShell):
   `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices`
   You must see your phone with the word **device** next to it (not "unauthorized" and not "offline").

## 3. Build and run

1. `npm run build:android` (builds the web part for Android)
2. `npx cap sync android` (copies it into the Android project)
3. Run on the phone: either **Android Studio → green ▶ Run** (choose the phone in the list) or `npm run cap:run`.
   The first build downloads Gradle and libraries and takes several minutes.
4. If you changed only the web code later, repeat steps 1-3.

## 4. Health Connect (steps and sleep from the watch)

1. In the app: **Settings → Watch → Connect watch**. Read the explanation, tap **Connect**.
2. The system screen asks for two permissions: **Steps** and **Sleep**. Allow both. Nothing else is asked.
3. Choose the **Source** (for example Huawei Health) or leave "Any source". Tap **Sync now**.
4. Steps appear on **Today** and in **Health → Steps**; nights appear in **Health → Sleep** with a small ⌚.
   A night you wrote by hand is never replaced.
5. To take the permission away: **Settings → Apps → Health Connect → App permissions → My Day AI**, or the
   **Open Health Connect** button in the app.
6. Make sure the watch app (Huawei Health) has **Health Connect sharing** switched on in its own settings;
   if it does not write there, My Day AI has nothing to read.

## 5. Notifications and the Xiaomi battery rules

Xiaomi closes background apps aggressively. For reminders and the alarm to arrive with the app closed:

1. **Settings → Apps → Manage apps → My Day AI → Autostart: ON**.
2. Same screen → **Battery saver → No restrictions**.
3. **Notifications**: allowed (and you can tune the three channels: Reminders, Routine, Alarm).
4. **Alarms & reminders**: allowed (needed for exact times and for the wake-up alarm; the app opens this screen for you).
5. Open the **recent apps** screen and **lock** the app (long press on its card → lock icon).
6. Do not "clean" the app with the phone's cleaner after that.

**Notification icon.** The small icon in the status bar and in the notification header is `ic_stat_notification` (`android/app/src/main/res/drawable/ic_stat_notification.xml`): a white sun on a transparent background, because Android only uses the shape and tints it. It is set in `capacitor.config.ts` (`plugins.LocalNotifications.smallIcon`) and in every `schedule(...)` call in `src/lib/nativeNotify.ts`. Without it Android shows a circle with an exclamation mark. Xiaomi (MIUI/HyperOS) may tint it a different colour; that is fine. Check it with the test notification button in Settings.

## 6. Move your data from the web version

The web app and the Android app store data separately.

1. In the web app: **Settings → Export** (saves a JSON file; send it to the phone, for example by Drive or cable).
2. Install the Android app. The first screen is the normal setup, the same as in the browser.
3. When the setup is done: **Settings → Data → Import a backup** → **Choose file** (or paste the JSON into the field and tap **Check import**).

## 7. Troubleshooting

| Problem                                                        | What to do                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `adb devices` shows nothing                                    | Another cable/port; phone unlocked; **File transfer** mode; USB debugging on; `adb kill-server` then `adb devices`. |
| `unauthorized`                                                 | Unplug, **Developer options → Revoke USB debugging authorizations**, plug in, tap Allow.                            |
| "App not installed" / install blocked                          | Turn on **Install via USB** (needs Mi account); uninstall an older copy with another signature first.               |
| Gradle: "Cannot find a Java installation … languageVersion=21" | Step 1.3: set **Gradle JDK** to a JDK 21.                                                                           |
| No steps / no sleep                                            | The watch app must write to Health Connect; check the **Source**; tap **Sync now**; check permissions (section 4).  |
| Notifications do not come                                      | Section 5 (Autostart, No restrictions, lock in recents, Alarms & reminders allowed).                                |
| Blank screen                                                   | Run `npm run build:android` and `npx cap sync android` again.                                                       |

## 8. Exactly what to tap on the phone (first install, checked on Redmi Note 13 Pro 5G)

1. **Before the install**: unlock the phone, keep the screen on. In **Developer options** turn on **USB debugging**,
   **Install via USB** and **USB debugging (Security settings)**. If a dialog "Install via USB" appears during
   the install, tap **Install**. (Without this `adb install` fails with `INSTALL_FAILED_USER_RESTRICTED`.)
2. **First start**: the app opens on the first-run screen. Choose the language and finish the questions.
3. **Notifications**: when Android asks "Allow My Day AI to send you notifications?" tap **Allow**.
4. **Alarms & reminders**: **Settings → Apps → Manage apps → My Day AI → Other permissions** (or the screen the app
   opens) → allow **Alarms & reminders** / exact alarms.
5. **Health Connect**: in the app **Settings → Watch → Connect watch → Connect**; in the system screen switch on
   **Steps** and **Sleep** → **Allow**. If Health Connect is missing, install it from Google Play (on Android 14+ it is
   already part of the system: **Settings → Health Connect**).
6. **Xiaomi battery and autostart** (without these reminders and the alarm may not fire with the app closed):
   - **Settings → Apps → Manage apps → My Day AI → Autostart: ON**;
   - same screen → **Battery saver → No restrictions**;
   - recent apps → long press the My Day AI card → **lock** icon.

## 9. Short test list (step by step)

1. Start the app → the first-run screen shows, no crash, no blank screen.
2. Finish setup → **Today** opens.
3. **Settings → Privacy**: the three lines and the link "Full privacy policy" open the web page (6 languages).
4. **Settings → Watch → Connect watch** → Allow Steps and Sleep → status says connected.
5. **Sync now** → steps show on **Today**; **Health → Sleep** shows nights marked with the small watch icon.
6. Add a reminder for 2 minutes ahead → press Home and lock the phone → a notification arrives on time.
7. Set a wake-up alarm for 2 minutes ahead → lock the phone → it rings; hold the stop button to stop it.
8. Press the Back button on a sub-page → it goes one page back; on **Today** it leaves the app.
9. Close the app from recent apps, open it again → the data is still there.
10. If something fails, run `adb logcat -d | findstr /i "mydayai AndroidRuntime"` and send me the lines.

Building without a system-wide JDK 21: unzip Temurin 21 somewhere (for example `C:\Projects\tools\jdk21`) and run
`$env:JAVA_HOME="C:\Projects\tools\jdk21"; .\gradlew.bat assembleDebug` inside `android` (this does not change your
system Java).
