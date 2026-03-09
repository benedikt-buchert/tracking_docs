const PAYLOAD_CONTRACTS = [
  {
    id: 'screen-view-predefined',
    class: 'predefined',
    example: {
      event: 'screen_view',
      firebase_screen: 'Checkout',
      firebase_screen_class: 'CheckoutViewController',
    },
    expected: {
      web: {
        eventName: 'screen_view',
        payload: {
          event: 'screen_view',
          firebase_screen: 'Checkout',
          firebase_screen_class: 'CheckoutViewController',
        },
      },
      firebase: {
        eventName: 'screen_view',
        parameters: {
          screen_name: 'Checkout',
          screen_class: 'CheckoutViewController',
        },
        userProperties: {},
      },
    },
  },
  {
    id: 'add-to-cart-with-items',
    class: 'ecommerce_items',
    example: {
      event: 'add_to_cart',
      currency: 'EUR',
      value: 42.5,
      items: [
        {
          item_id: 'sku-1',
          item_name: 'Socks',
          price: 21.25,
          quantity: 2,
        },
      ],
    },
    expected: {
      web: {
        eventName: 'add_to_cart',
        payload: {
          event: 'add_to_cart',
          currency: 'EUR',
          value: 42.5,
          items: [
            {
              item_id: 'sku-1',
              item_name: 'Socks',
              price: 21.25,
              quantity: 2,
            },
          ],
        },
      },
      firebase: {
        eventName: 'add_to_cart',
        parameters: {
          currency: 'EUR',
          value: 42.5,
          items: [
            {
              item_id: 'sku-1',
              item_name: 'Socks',
              price: 21.25,
              quantity: 2,
            },
          ],
        },
        userProperties: {},
      },
    },
  },
  {
    id: 'custom-event-with-user-properties',
    class: 'custom',
    example: {
      event: 'my_custom_event',
      plan: 'pro',
      count: 2,
      premium: true,
      user_properties: {
        sign_up_method: 'email',
        allow_ad_personalization_signals: false,
      },
    },
    expected: {
      web: {
        eventName: 'my_custom_event',
        payload: {
          event: 'my_custom_event',
          plan: 'pro',
          count: 2,
          premium: true,
          user_properties: {
            sign_up_method: 'email',
            allow_ad_personalization_signals: false,
          },
        },
      },
      firebase: {
        eventName: 'my_custom_event',
        parameters: {
          plan: 'pro',
          count: 2,
          premium: 1,
        },
        userProperties: {
          sign_up_method: 'email',
          allow_personalized_ads: 'false',
        },
      },
    },
  },
  {
    id: 'web-fallback-json-serialization',
    class: 'fallback_json_serialization',
    targets: ['web-datalayer-js'],
    example: {
      event: 'metadata_capture',
      metadata: {
        checkout_step: 2,
        flags: ['beta', 'ios'],
      },
      user: {
        id: 'U-123',
      },
    },
    expected: {
      web: {
        eventName: 'metadata_capture',
        payload: {
          event: 'metadata_capture',
          metadata: {
            checkout_step: 2,
            flags: ['beta', 'ios'],
          },
          user: {
            id: 'U-123',
          },
        },
      },
    },
  },
];

module.exports = {
  PAYLOAD_CONTRACTS,
};
