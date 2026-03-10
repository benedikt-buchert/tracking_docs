import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FIREBASE_ANALYTICS_VERSION =
  process.env.FIREBASE_ANDROID_ANALYTICS_VERSION || '22.5.0';
const KOTLIN_VERSION = readKotlinVersionFromPom();
const GOOGLE_MAVEN_BASE = 'https://dl.google.com/dl/android/maven2';
const TMP_DIR = path.join(os.tmpdir(), 'tracking-docs-android-realsdk');

const AAR_PATH = path.join(
  TMP_DIR,
  `firebase-analytics-${FIREBASE_ANALYTICS_VERSION}.aar`,
);
const CLASSES_JAR_PATH = path.join(TMP_DIR, 'firebase-analytics-classes.jar');

const MEASUREMENT_AAR_PATH = path.join(
  TMP_DIR,
  `play-services-measurement-${FIREBASE_ANALYTICS_VERSION}.aar`,
);
const MEASUREMENT_API_AAR_PATH = path.join(
  TMP_DIR,
  `play-services-measurement-api-${FIREBASE_ANALYTICS_VERSION}.aar`,
);
const MEASUREMENT_SDK_AAR_PATH = path.join(
  TMP_DIR,
  `play-services-measurement-sdk-${FIREBASE_ANALYTICS_VERSION}.aar`,
);

const MEASUREMENT_CLASSES_JAR_PATH = path.join(
  TMP_DIR,
  'play-services-measurement-classes.jar',
);
const MEASUREMENT_API_CLASSES_JAR_PATH = path.join(
  TMP_DIR,
  'play-services-measurement-api-classes.jar',
);
const MEASUREMENT_SDK_CLASSES_JAR_PATH = path.join(
  TMP_DIR,
  'play-services-measurement-sdk-classes.jar',
);

const ANDROID_JAR_PATH = path.join(TMP_DIR, 'android-4.1.1.4.jar');

const JAVA_SRC_PATH = path.join(TMP_DIR, 'FirebaseSdkCompileProbe.java');
const KOTLIN_SRC_PATH = path.join(TMP_DIR, 'FirebaseSdkCompileProbe.kt');

const KOTLIN_DIST_DIR = path.join(TMP_DIR, `kotlin-compiler-${KOTLIN_VERSION}`);
const KOTLINC_BIN_PATH = path.join(
  KOTLIN_DIST_DIR,
  'kotlinc',
  'bin',
  process.platform === 'win32' ? 'kotlinc.bat' : 'kotlinc',
);
const KOTLIN_STDLIB_PATH = path.join(
  KOTLIN_DIST_DIR,
  'kotlinc',
  'lib',
  'kotlin-stdlib.jar',
);

function readKotlinVersionFromPom() {
  const pomPath = path.join(process.cwd(), 'native-tests/android/pom.xml');
  const pomSource = fs.readFileSync(pomPath, 'utf8');
  const match = pomSource.match(
    /<kotlin\.version>\s*([^<\s]+)\s*<\/kotlin\.version>/,
  );
  if (!match) {
    throw new Error(
      'Could not resolve <kotlin.version> from native-tests/android/pom.xml',
    );
  }
  return match[1];
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function ensureAarWithClasses({ aarPath, jarPath, url }) {
  if (!fs.existsSync(aarPath)) {
    run(`curl -fLsS '${url}' -o '${aarPath}'`);
  }
  if (!fs.existsSync(jarPath)) {
    run(`unzip -p '${aarPath}' classes.jar > '${jarPath}'`);
  }
}

function ensureDownloads() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  ensureAarWithClasses({
    aarPath: AAR_PATH,
    jarPath: CLASSES_JAR_PATH,
    url: `${GOOGLE_MAVEN_BASE}/com/google/firebase/firebase-analytics/${FIREBASE_ANALYTICS_VERSION}/firebase-analytics-${FIREBASE_ANALYTICS_VERSION}.aar`,
  });

  ensureAarWithClasses({
    aarPath: MEASUREMENT_AAR_PATH,
    jarPath: MEASUREMENT_CLASSES_JAR_PATH,
    url: `${GOOGLE_MAVEN_BASE}/com/google/android/gms/play-services-measurement/${FIREBASE_ANALYTICS_VERSION}/play-services-measurement-${FIREBASE_ANALYTICS_VERSION}.aar`,
  });

  ensureAarWithClasses({
    aarPath: MEASUREMENT_API_AAR_PATH,
    jarPath: MEASUREMENT_API_CLASSES_JAR_PATH,
    url: `${GOOGLE_MAVEN_BASE}/com/google/android/gms/play-services-measurement-api/${FIREBASE_ANALYTICS_VERSION}/play-services-measurement-api-${FIREBASE_ANALYTICS_VERSION}.aar`,
  });

  ensureAarWithClasses({
    aarPath: MEASUREMENT_SDK_AAR_PATH,
    jarPath: MEASUREMENT_SDK_CLASSES_JAR_PATH,
    url: `${GOOGLE_MAVEN_BASE}/com/google/android/gms/play-services-measurement-sdk/${FIREBASE_ANALYTICS_VERSION}/play-services-measurement-sdk-${FIREBASE_ANALYTICS_VERSION}.aar`,
  });

  if (!fs.existsSync(ANDROID_JAR_PATH)) {
    const androidUrl =
      'https://repo1.maven.org/maven2/com/google/android/android/4.1.1.4/android-4.1.1.4.jar';
    run(`curl -fLsS '${androidUrl}' -o '${ANDROID_JAR_PATH}'`);
  }

  if (!fs.existsSync(KOTLINC_BIN_PATH)) {
    const kotlinZip = path.join(
      TMP_DIR,
      `kotlin-compiler-${KOTLIN_VERSION}.zip`,
    );
    const kotlinUrl = `https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip`;
    run(`curl -fLsS '${kotlinUrl}' -o '${kotlinZip}'`);
    run(`rm -rf '${KOTLIN_DIST_DIR}'`);
    fs.mkdirSync(KOTLIN_DIST_DIR, { recursive: true });
    run(`unzip -q '${kotlinZip}' -d '${KOTLIN_DIST_DIR}'`);
  }
}

function writeProbes() {
  const javaSource = `
import android.os.Bundle;
import com.google.firebase.analytics.FirebaseAnalytics;

public final class FirebaseSdkCompileProbe {
  void probe(FirebaseAnalytics analytics) {
    analytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, new Bundle());
    analytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, new Bundle());
    Bundle unsupportedParams = new Bundle();
    unsupportedParams.putString("unsupported_dimension", "blue-xl");
    analytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, unsupportedParams);
    analytics.logEvent("unsupported_mobile_event_name", unsupportedParams);
    analytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email");
    String itemsParam = FirebaseAnalytics.Param.ITEMS;
    String signUpProperty = FirebaseAnalytics.UserProperty.SIGN_UP_METHOD;
    if (itemsParam == null || signUpProperty == null) {
      throw new IllegalStateException("Unexpected null Firebase constant");
    }
  }
}
`.trimStart();

  const kotlinSource = `
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics

class FirebaseSdkCompileProbeKt(private val analytics: FirebaseAnalytics) {
  fun probe() {
    analytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, Bundle())
    analytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, Bundle())
    val unsupportedParams = Bundle().apply {
      putString("unsupported_dimension", "blue-xl")
    }
    analytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, unsupportedParams)
    analytics.logEvent("unsupported_mobile_event_name", unsupportedParams)
    analytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email")
    val itemsParam: String = FirebaseAnalytics.Param.ITEMS
    val signUpProperty: String = FirebaseAnalytics.UserProperty.SIGN_UP_METHOD
    if (itemsParam.isEmpty() || signUpProperty.isEmpty()) {
      throw IllegalStateException("Unexpected empty Firebase constant")
    }
  }
}
`.trimStart();

  fs.writeFileSync(JAVA_SRC_PATH, javaSource);
  fs.writeFileSync(KOTLIN_SRC_PATH, kotlinSource);
}

function compileAndInspect() {
  const cp = [
    CLASSES_JAR_PATH,
    MEASUREMENT_CLASSES_JAR_PATH,
    MEASUREMENT_API_CLASSES_JAR_PATH,
    MEASUREMENT_SDK_CLASSES_JAR_PATH,
    KOTLIN_STDLIB_PATH,
    ANDROID_JAR_PATH,
  ].join(':');

  run(`javac -cp '${cp}' '${JAVA_SRC_PATH}'`);
  run(
    `'${KOTLINC_BIN_PATH}' -cp '${cp}' -d '${path.join(TMP_DIR, 'probe-kotlin.jar')}' '${KOTLIN_SRC_PATH}'`,
  );

  run(
    `javap -classpath '${cp}' com.google.firebase.analytics.FirebaseAnalytics > '${path.join(TMP_DIR, 'FirebaseAnalytics.javap.txt')}'`,
  );
  run(
    `javap -classpath '${cp}' com.google.firebase.analytics.FirebaseAnalytics\\$Event > '${path.join(TMP_DIR, 'FirebaseAnalytics.Event.javap.txt')}'`,
  );
  run(
    `javap -classpath '${cp}' com.google.firebase.analytics.FirebaseAnalytics\\$Param > '${path.join(TMP_DIR, 'FirebaseAnalytics.Param.javap.txt')}'`,
  );
  run(
    `javap -classpath '${cp}' com.google.firebase.analytics.FirebaseAnalytics\\$UserProperty > '${path.join(TMP_DIR, 'FirebaseAnalytics.UserProperty.javap.txt')}'`,
  );
}

function main() {
  ensureDownloads();
  writeProbes();
  compileAndInspect();
  console.log(
    'Android Firebase real SDK compile probe passed (Java + Kotlin).',
  );
}

main();
