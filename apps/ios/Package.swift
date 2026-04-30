// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "JustDoIOS",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "JustDoShared", targets: ["JustDoShared"]),
    ],
    targets: [
        .target(
            name: "JustDoShared",
            path: "JustDoShared"
        ),
        .testTarget(
            name: "JustDoSharedTests",
            dependencies: ["JustDoShared"],
            path: "Tests/JustDoSharedTests",
            resources: [.process("Fixtures")]
        ),
    ]
)
