#import "NativePayloadFixturesObjC.h"

void RunObjCSnippetScreenViewPredefined(void) {
  NSMutableDictionary *eventParams = [@{
    kFIRParameterScreenName: @"Checkout",
    kFIRParameterScreenClass: @"CheckoutViewController"
  } mutableCopy];
  [FIRAnalytics logEventWithName:kFIREventScreenView parameters:eventParams];
}

void RunObjCSnippetAddToCartWithItems(void) {
  NSMutableDictionary *item1 = [@{
    kFIRParameterItemID: @"sku-1",
    kFIRParameterItemName: @"Socks",
    kFIRParameterPrice: @(21.25),
    kFIRParameterQuantity: @(2)
  } mutableCopy];

  NSMutableDictionary *eventParams = [@{
    kFIRParameterCurrency: @"EUR",
    kFIRParameterValue: @(42.5)
  } mutableCopy];
  eventParams[kFIRParameterItems] = @[item1];
  [FIRAnalytics logEventWithName:kFIREventAddToCart parameters:eventParams];
}

void RunObjCSnippetCustomEventWithUserProperties(void) {
  [FIRAnalytics setUserPropertyString:@"email" forName:kFIRUserPropertySignUpMethod];
  [FIRAnalytics setUserPropertyString:@"false" forName:kFIRUserPropertyAllowAdPersonalizationSignals];

  NSMutableDictionary *eventParams = [@{
    @"plan": @"pro",
    @"count": @(2),
    @"premium": @(1)
  } mutableCopy];
  [FIRAnalytics logEventWithName:@"my_custom_event" parameters:eventParams];
}

void RunObjCSnippetFirebaseUnsupportedEcommerceKey(void) {
  NSMutableDictionary *item1 = [@{
    kFIRParameterItemID: @"sku-unsupported-1",
    kFIRParameterItemName: @"Hat",
    @"unsupported_dimension": @"blue-xl"
  } mutableCopy];

  NSMutableDictionary *eventParams = [@{
    kFIRParameterCurrency: @"EUR",
    kFIRParameterValue: @(19.99)
  } mutableCopy];
  eventParams[kFIRParameterItems] = @[item1];
  [FIRAnalytics logEventWithName:kFIREventAddToCart parameters:eventParams];
}

void RunObjCSnippetFirebaseUnsupportedEventName(void) {
  NSMutableDictionary *eventParams = [@{
    @"plan": @"basic",
    @"count": @(1)
  } mutableCopy];
  [FIRAnalytics logEventWithName:@"unsupported_mobile_event_name" parameters:eventParams];
}
