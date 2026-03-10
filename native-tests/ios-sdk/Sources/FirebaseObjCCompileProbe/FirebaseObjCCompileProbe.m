#import <Foundation/Foundation.h>
#import <FirebaseAnalytics/FirebaseAnalytics.h>

bool FirebaseObjCCompileProbeValidate(void) {
  Class analyticsClass = [FIRAnalytics class];
  SEL logSelector = @selector(logEventWithName:parameters:);
  SEL userPropertySelector = @selector(setUserPropertyString:forName:);

  NSString *eventName = kFIREventScreenView;
  NSString *paramName = kFIRParameterItems;
  NSString *propertyName = kFIRUserPropertySignUpMethod;
  NSDictionary *unsupportedParams = @{
    @"unsupported_dimension": @"blue-xl",
    kFIRParameterItems: @[
      @{
        kFIRParameterItemID: @"sku-unsupported-1",
        @"unsupported_dimension": @"blue-xl"
      }
    ]
  };

  [FIRAnalytics logEventWithName:@"unsupported_mobile_event_name" parameters:unsupportedParams];

  return analyticsClass != Nil &&
    logSelector != NULL &&
    userPropertySelector != NULL &&
    eventName.length > 0 &&
    paramName.length > 0 &&
    propertyName.length > 0;
}
