#import <Foundation/Foundation.h>
#import "GeneratedObjCSnippets.h"

NS_ASSUME_NONNULL_BEGIN

@interface FIRAnalytics : NSObject
+ (void)logEventWithName:(NSString *)name
              parameters:(NSDictionary<NSString *, id> * _Nullable)parameters;
+ (void)setUserPropertyString:(NSString * _Nullable)value forName:(NSString *)name;
@end

extern NSString *const kFIREventScreenView;
extern NSString *const kFIREventAddToCart;
extern NSString *const kFIREventLogin;
extern NSString *const kFIRParameterScreenName;
extern NSString *const kFIRParameterScreenClass;
extern NSString *const kFIRParameterCurrency;
extern NSString *const kFIRParameterValue;
extern NSString *const kFIRParameterItems;
extern NSString *const kFIRParameterItemID;
extern NSString *const kFIRParameterItemName;
extern NSString *const kFIRParameterPrice;
extern NSString *const kFIRParameterQuantity;
extern NSString *const kFIRParameterMethod;
extern NSString *const kFIRUserPropertySignUpMethod;
extern NSString *const kFIRUserPropertyAllowAdPersonalizationSignals;

void ObjCAnalyticsRecorderReset(void);
NSString * _Nullable ObjCAnalyticsLastEventName(void);
NSDictionary<NSString *, id> * _Nullable ObjCAnalyticsLastEventParameters(void);
NSDictionary<NSString *, id> * ObjCAnalyticsUserProperties(void);

NS_ASSUME_NONNULL_END
