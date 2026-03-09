// swift-tools-version: 6.1
import PackageDescription
import Foundation

func parseVersion(_ raw: String) -> Version {
  let components = raw.split(separator: ".").map(String.init)
  guard components.count == 3,
    let major = Int(components[0]),
    let minor = Int(components[1]),
    let patch = Int(components[2])
  else {
    fatalError("Invalid FIREBASE_IOS_SDK_VERSION: \\(raw). Expected SemVer like 11.15.0")
  }
  return Version(major, minor, patch)
}

let firebaseIosSdkVersion = parseVersion(
  ProcessInfo.processInfo.environment["FIREBASE_IOS_SDK_VERSION"] ?? "11.15.0"
)

let package = Package(
  name: "FirebaseSdkCompileTests",
  platforms: [
    .macOS(.v15),
  ],
  dependencies: [
    .package(
      url: "https://github.com/firebase/firebase-ios-sdk.git",
      exact: firebaseIosSdkVersion
    ),
  ],
  targets: [
    .target(
      name: "FirebaseObjCCompileProbe",
      dependencies: [
        .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
      ],
      publicHeadersPath: "include"
    ),
    .testTarget(
      name: "FirebaseSdkCompileTests",
      dependencies: [
        .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
        "FirebaseObjCCompileProbe",
      ]
    ),
  ]
)
