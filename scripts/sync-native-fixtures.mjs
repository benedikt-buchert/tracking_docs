import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function loadSnippetTargetsModule() {
  const filePath = path.join(
    ROOT,
    'packages/docusaurus-plugin-generate-schema-docs/helpers/snippetTargets.js',
  );
  const source = fs.readFileSync(filePath, 'utf8');
  const babel = require('@babel/core');
  const transformed = babel.transformSync(source, {
    filename: filePath,
    presets: [require.resolve('@babel/preset-env')],
    babelrc: false,
    configFile: false,
  });

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(filePath),
    __filename: filePath,
    process,
    console,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(transformed.code, context, { filename: filePath });
  return {
    exports: module.exports,
    toModuleValue(value) {
      return vm.runInContext(`(${JSON.stringify(value)})`, context);
    },
  };
}

function toPascalCase(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? `${pad}${line}` : ''))
    .join('\n');
}

function writeIfChanged(filePath, content) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';
  if (existing !== content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function buildSwiftFixture({
  contracts,
  generateSnippetForTarget,
  toModuleValue,
}) {
  const methods = contracts
    .map((contract) => {
      const methodName = `run${toPascalCase(contract.id)}`;
      const snippet = generateSnippetForTarget({
        targetId: 'ios-firebase-swift-sdk',
        example: toModuleValue(contract.example),
        schema: { properties: {} },
      });
      return [
        `  // Generated from contract: ${contract.id}`,
        `  public static func ${methodName}() {`,
        indent(snippet, 4),
        '  }',
      ].join('\n');
    })
    .join('\n\n');

  return [
    'import Foundation',
    '',
    '@MainActor',
    'public enum GeneratedIosSnippets {',
    methods,
    '}',
    '',
  ].join('\n');
}

function buildAndroidFixture({
  contracts,
  generateSnippetForTarget,
  toModuleValue,
}) {
  const methods = contracts
    .map((contract) => {
      const methodName = `run${toPascalCase(contract.id)}`;
      const snippet = generateSnippetForTarget({
        targetId: 'android-firebase-java-sdk',
        example: toModuleValue(contract.example),
        schema: { properties: {} },
      });
      return [
        `  // Generated from contract: ${contract.id}`,
        `  static void ${methodName}(FakeFirebaseAnalytics mFirebaseAnalytics) {`,
        indent(snippet, 4),
        '  }',
      ].join('\n');
    })
    .join('\n\n');

  return [
    'package com.trackingdocs.nativepayload;',
    '',
    'final class GeneratedAndroidSnippets {',
    '  private GeneratedAndroidSnippets() {}',
    '',
    methods,
    '}',
    '',
  ].join('\n');
}

function buildAndroidKotlinFixture({
  contracts,
  generateSnippetForTarget,
  toModuleValue,
}) {
  const methods = contracts
    .map((contract) => {
      const methodName = `run${toPascalCase(contract.id)}`;
      const snippet = generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: toModuleValue(contract.example),
        schema: { properties: {} },
      });
      return [
        `  // Generated from contract: ${contract.id}`,
        `  fun ${methodName}(firebaseAnalytics: FakeFirebaseAnalyticsKotlin) {`,
        indent(snippet, 4),
        '  }',
      ].join('\n');
    })
    .join('\n\n');

  return [
    'package com.trackingdocs.nativepayloadkotlin',
    '',
    'object GeneratedAndroidKotlinSnippets {',
    methods,
    '}',
    '',
  ].join('\n');
}

function buildObjcFixture({
  contracts,
  generateSnippetForTarget,
  toModuleValue,
}) {
  const methods = contracts
    .map((contract) => {
      const methodName = `RunObjCSnippet${toPascalCase(contract.id)}`;
      const snippet = generateSnippetForTarget({
        targetId: 'ios-firebase-objc-sdk',
        example: toModuleValue(contract.example),
        schema: { properties: {} },
      });
      return [`void ${methodName}(void) {`, indent(snippet, 2), '}'].join('\n');
    })
    .join('\n\n');

  const declarations = contracts
    .map((contract) => `void RunObjCSnippet${toPascalCase(contract.id)}(void);`)
    .join('\n');

  const generatedHeader = [
    '#import <Foundation/Foundation.h>',
    '',
    'NS_ASSUME_NONNULL_BEGIN',
    '',
    declarations,
    '',
    'NS_ASSUME_NONNULL_END',
    '',
  ].join('\n');

  const generatedImplementation = [
    '#import "NativePayloadFixturesObjC.h"',
    '',
    methods,
    '',
  ].join('\n');

  return { generatedHeader, generatedImplementation };
}

function main() {
  const {
    PAYLOAD_CONTRACTS,
  } = require('../packages/docusaurus-plugin-generate-schema-docs/test-data/payloadContracts');
  const contracts = PAYLOAD_CONTRACTS.filter(
    (c) => c.expected && c.expected.firebase,
  );
  const snippetTargetsModule = loadSnippetTargetsModule();
  const { generateSnippetForTarget } = snippetTargetsModule.exports;
  const { toModuleValue } = snippetTargetsModule;

  const swiftContent = buildSwiftFixture({
    contracts,
    generateSnippetForTarget,
    toModuleValue,
  });
  const javaContent = buildAndroidFixture({
    contracts,
    generateSnippetForTarget,
    toModuleValue,
  });
  const kotlinContent = buildAndroidKotlinFixture({
    contracts,
    generateSnippetForTarget,
    toModuleValue,
  });
  const objcContent = buildObjcFixture({
    contracts,
    generateSnippetForTarget,
    toModuleValue,
  });

  const swiftPath = path.join(
    ROOT,
    'native-tests/ios/Sources/NativePayloadFixtures/GeneratedSnippets.swift',
  );
  const javaPath = path.join(
    ROOT,
    'native-tests/android/src/test/java/com/trackingdocs/nativepayload/GeneratedAndroidSnippets.java',
  );
  const kotlinPath = path.join(
    ROOT,
    'native-tests/android/src/test/kotlin/com/trackingdocs/nativepayloadkotlin/GeneratedAndroidKotlinSnippets.kt',
  );
  const objcHeaderPath = path.join(
    ROOT,
    'native-tests/ios/Sources/NativePayloadFixturesObjC/include/GeneratedObjCSnippets.h',
  );
  const objcImplementationPath = path.join(
    ROOT,
    'native-tests/ios/Sources/NativePayloadFixturesObjC/GeneratedObjCSnippets.m',
  );

  const swiftChanged = writeIfChanged(swiftPath, swiftContent);
  const javaChanged = writeIfChanged(javaPath, javaContent);
  const kotlinChanged = writeIfChanged(kotlinPath, kotlinContent);
  const objcHeaderChanged = writeIfChanged(
    objcHeaderPath,
    objcContent.generatedHeader,
  );
  const objcImplementationChanged = writeIfChanged(
    objcImplementationPath,
    objcContent.generatedImplementation,
  );

  const changed = [
    swiftChanged ? swiftPath : null,
    javaChanged ? javaPath : null,
    kotlinChanged ? kotlinPath : null,
    objcHeaderChanged ? objcHeaderPath : null,
    objcImplementationChanged ? objcImplementationPath : null,
  ].filter(Boolean);
  if (changed.length === 0) {
    console.log('Native fixture snippets are already up to date.');
  } else {
    console.log('Updated native fixture snippets:');
    changed.forEach((item) => console.log(`- ${path.relative(ROOT, item)}`));
  }
}

main();
