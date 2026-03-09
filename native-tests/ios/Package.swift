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
  targets: [
    .target(name: "NativePayloadFixtures"),
    .target(
      name: "NativePayloadFixturesObjC",
      dependencies: [],
      publicHeadersPath: "include",
    ),
    .testTarget(
      name: "NativePayloadFixturesTests",
      dependencies: ["NativePayloadFixtures", "NativePayloadFixturesObjC"],
    ),
  ],
)
