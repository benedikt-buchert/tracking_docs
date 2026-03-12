#import "NativePayloadFixturesObjC.h"

NSString *const kFIREventScreenView = @"screen_view";
NSString *const kFIREventAddToCart = @"add_to_cart";
NSString *const kFIREventLogin = @"login";
NSString *const kFIRParameterScreenName = @"screen_name";
NSString *const kFIRParameterScreenClass = @"screen_class";
NSString *const kFIRParameterCurrency = @"currency";
NSString *const kFIRParameterValue = @"value";
NSString *const kFIRParameterItems = @"items";
NSString *const kFIRParameterItemID = @"item_id";
NSString *const kFIRParameterItemName = @"item_name";
NSString *const kFIRParameterPrice = @"price";
NSString *const kFIRParameterQuantity = @"quantity";
NSString *const kFIRParameterMethod = @"method";
NSString *const kFIRUserPropertySignUpMethod = @"sign_up_method";
NSString *const kFIRUserPropertyAllowAdPersonalizationSignals = @"allow_personalized_ads";

static NSString *sLastEventName = nil;
static NSDictionary<NSString *, id> *sLastEventParameters = nil;
static NSMutableDictionary<NSString *, id> *sUserProperties = nil;

@implementation FIRAnalytics
+ (void)logEventWithName:(NSString *)name parameters:(NSDictionary<NSString *,id> *)parameters {
  sLastEventName = [name copy];
  sLastEventParameters = [parameters copy];
}

+ (void)setUserPropertyString:(NSString *)value forName:(NSString *)name {
  if (sUserProperties == nil) {
    sUserProperties = [NSMutableDictionary dictionary];
  }
  if (value == nil) {
    sUserProperties[name] = [NSNull null];
    return;
  }
  sUserProperties[name] = [value copy];
}
@end

void ObjCAnalyticsRecorderReset(void) {
  sLastEventName = nil;
  sLastEventParameters = nil;
  sUserProperties = [NSMutableDictionary dictionary];
}

NSString *ObjCAnalyticsLastEventName(void) {
  return sLastEventName;
}

NSDictionary<NSString *,id> *ObjCAnalyticsLastEventParameters(void) {
  return sLastEventParameters;
}

NSDictionary<NSString *,id> *ObjCAnalyticsUserProperties(void) {
  if (sUserProperties == nil) {
    sUserProperties = [NSMutableDictionary dictionary];
  }
  return [sUserProperties copy];
}
