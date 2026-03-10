package com.trackingdocs.realsdk;

import static org.junit.Assert.fail;

import android.os.Bundle;
import androidx.test.core.app.ApplicationProvider;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.analytics.FirebaseAnalytics;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 33)
public class FirebaseRuntimeSmokeTest {
  @Before
  public void initFirebase() {
    if (!FirebaseApp.getApps(ApplicationProvider.getApplicationContext()).isEmpty()) {
      return;
    }

    FirebaseOptions options =
        new FirebaseOptions.Builder()
            .setApplicationId("1:1234567890:android:abcdef123456")
            .setApiKey("AIzaSyDummyApiKey1234567890")
            .setProjectId("tracking-docs-runtime-smoke")
            .build();
    FirebaseApp.initializeApp(ApplicationProvider.getApplicationContext(), options);
  }

  @Test
  public void unsupportedEcommerceKeyAndEventDoNotThrow() {
    FirebaseAnalytics analytics =
        FirebaseAnalytics.getInstance(ApplicationProvider.getApplicationContext());

    Bundle item = new Bundle();
    item.putString(FirebaseAnalytics.Param.ITEM_ID, "sku-unsupported-1");
    item.putString("unsupported_dimension", "blue-xl");

    Bundle eventParams = new Bundle();
    eventParams.putParcelableArray(FirebaseAnalytics.Param.ITEMS, new Bundle[] {item});

    try {
      analytics.logEvent("unsupported_mobile_event_name", eventParams);
    } catch (RuntimeException ex) {
      fail("Expected no runtime exception from FirebaseAnalytics.logEvent, got: " + ex);
    }
  }
}
