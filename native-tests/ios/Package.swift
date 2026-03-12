// swift-tools-version: 6.1
import PackageDescription

let package = Package(
  name: "NativePayloadFixtures",
  platforms: [
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "NativePayloadFixtures",
      targets: ["NativePayloadFixtures", "NativePayloadFixturesObjC"],
    ),
  ],
  dependencies: [
    .package(url: "https://github.com/ajevans99/swift-json-schema.git", from: "0.11.2"),
  ],
  targets: [
    .target(name: "NativePayloadFixtures"),
    .target(
      name: "NativePayloadFixturesObjC",
      dependencies: [],
      publicHeadersPath: "include",
    ),
    .testTarget(
      name: "NativePayloadFixturesTests",
      dependencies: [
        "NativePayloadFixtures",
        "NativePayloadFixturesObjC",
        .product(name: "JSONSchema", package: "swift-json-schema"),
      ],
      resources: [
        .process("Schemas"),
      ],
    ),
  ],
)
