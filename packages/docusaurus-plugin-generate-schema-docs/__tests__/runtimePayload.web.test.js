const { generateSnippetForTarget } = require('../helpers/snippetTargets');
const { PAYLOAD_CONTRACTS } = require('../test-data/payloadContracts');

const WEB_CONTRACTS = PAYLOAD_CONTRACTS.filter(
  (contract) => contract.expected?.web,
);

function executeWebSnippet(snippet, dataLayerName = 'dataLayer') {
  const push = jest.fn();
  const runtimeWindow = {
    [dataLayerName]: { push },
  };
  const runner = new Function('window', snippet);
  runner(runtimeWindow);
  return push.mock.calls.map(([payload]) => payload);
}

describe('runtime payload contracts (web)', () => {
  it.each(WEB_CONTRACTS)(
    'validates web payload for $id ($class)',
    (contract) => {
      const snippet = generateSnippetForTarget({
        targetId: 'web-datalayer-js',
        example: contract.example,
        schema: { properties: {} },
      });

      const pushedPayloads = executeWebSnippet(snippet);
      expect(pushedPayloads).toEqual([contract.expected.web.payload]);
    },
  );
});
