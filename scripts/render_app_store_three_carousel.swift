import AppKit
import Foundation

let pageWidth: CGFloat = 1320
let height: CGFloat = 2868
let pages = 4
let spreadWidth = pageWidth * CGFloat(pages)

let inputs = [
    "/Users/kang-yeongmo/Downloads/Frame 85.png",
    "/Users/kang-yeongmo/Downloads/Frame 88.png",
    "/Users/kang-yeongmo/Downloads/Frame 86.png",
    "/Users/kang-yeongmo/Downloads/Frame 87.png",
    "/Users/kang-yeongmo/Downloads/Frame 89.png",
]

let outputs = [
    "/Users/kang-yeongmo/justdo/app-store-screenshots/01-calendar-flow.png",
    "/Users/kang-yeongmo/justdo/app-store-screenshots/02-add-goals-flow.png",
    "/Users/kang-yeongmo/justdo/app-store-screenshots/03-review-flow.png",
    "/Users/kang-yeongmo/justdo/app-store-screenshots/04-goals-flow.png",
]

let images = inputs.map { path -> NSImage in
    guard let image = NSImage(contentsOfFile: path) else {
        fatalError("Missing input screenshot: \(path)")
    }
    return image
}

func rectFromTop(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect {
    NSRect(x: x, y: height - y - h, width: w, height: h)
}

func roundedRect(_ rect: NSRect, radius: CGFloat) -> NSBezierPath {
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func drawText(
    _ text: String,
    x: CGFloat,
    y: CGFloat,
    width: CGFloat,
    height textHeight: CGFloat = 260,
    size: CGFloat,
    weight: NSFont.Weight,
    color: NSColor,
    lineHeight: CGFloat? = nil
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .left
    if let lineHeight {
        paragraph.minimumLineHeight = lineHeight
        paragraph.maximumLineHeight = lineHeight
    }
    text.draw(
        in: rectFromTop(x, y, width, textHeight),
        withAttributes: [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: color,
            .paragraphStyle: paragraph,
            .kern: 0
        ]
    )
}

func drawBrand(page: Int) {
    let x = CGFloat(page) * pageWidth + 98
    drawText("Just Do", x: x, y: 118, width: 520, height: 112, size: 68, weight: .bold, color: NSColor(calibratedWhite: 0.08, alpha: 1))
    NSColor(calibratedRed: 0.350, green: 0.570, blue: 0.760, alpha: 1).setFill()
    NSBezierPath(ovalIn: rectFromTop(x + 292, 171, 18, 18)).fill()
}

func drawShadowedImage(_ image: NSImage, in rect: NSRect, radius: CGFloat, shadowAlpha: CGFloat = 0.16) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(shadowAlpha)
    shadow.shadowOffset = NSSize(width: 0, height: -24)
    shadow.shadowBlurRadius = 62
    shadow.set()
    NSColor.white.setFill()
    roundedRect(rect, radius: radius).fill()
    NSGraphicsContext.restoreGraphicsState()

    NSGraphicsContext.saveGraphicsState()
    roundedRect(rect, radius: radius).addClip()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
}

func drawBadge(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat) {
    let rect = rectFromTop(x, y, width, 88)
    NSColor.white.withAlphaComponent(0.78).setFill()
    roundedRect(rect, radius: 44).fill()

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    text.draw(
        in: rectFromTop(x + 34, y + 22, width - 68, 44),
        withAttributes: [
            .font: NSFont.systemFont(ofSize: 29, weight: .semibold),
            .foregroundColor: NSColor(calibratedWhite: 0.18, alpha: 1),
            .paragraphStyle: paragraph,
            .kern: 0
        ]
    )
}

guard let spread = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(spreadWidth),
    pixelsHigh: Int(height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fatalError("Failed to create spread bitmap")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: spread)

let background = NSGradient(colors: [
    NSColor(calibratedRed: 0.973, green: 0.965, blue: 0.946, alpha: 1),
    NSColor(calibratedRed: 0.952, green: 0.962, blue: 0.940, alpha: 1),
    NSColor(calibratedRed: 0.898, green: 0.932, blue: 0.970, alpha: 1)
])!
background.draw(in: NSRect(x: 0, y: 0, width: spreadWidth, height: height), angle: -96)

let glow = NSGradient(colors: [
    NSColor(calibratedRed: 0.320, green: 0.520, blue: 0.735, alpha: 0.22),
    NSColor(calibratedRed: 0.435, green: 0.650, blue: 0.510, alpha: 0.12),
    NSColor.clear
])!
glow.draw(in: rectFromTop(200, 1640, 3200, 1200), angle: 9)

for page in 0..<pages {
    drawBrand(page: page)
}

drawText(
    "할 일과 습관을\n캘린더 한 화면에서",
    x: 96,
    y: 300,
    width: 1050,
    size: 82,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)
drawText(
    "날짜 위에 흐름을 정리하고, 오늘 해야 할 일을 바로 확인하세요.",
    x: 100,
    y: 565,
    width: 1000,
    height: 110,
    size: 35,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 49
)

drawText(
    "오늘을 확인하고,\n바로 추가하고",
    x: pageWidth + 96,
    y: 300,
    width: 1050,
    size: 82,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)
drawText(
    "해야 할 일을 확인하다가 필요한 일을 바로 추가합니다.",
    x: pageWidth + 100,
    y: 565,
    width: 1000,
    height: 110,
    size: 35,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 49
)

drawText(
    "추가한 일을\n계속 이어보고",
    x: pageWidth * 2 + 96,
    y: 300,
    width: 1050,
    size: 82,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)
drawText(
    "오늘 해야 할 일과 밀린 일까지 한 흐름에서 정리하세요.",
    x: pageWidth * 2 + 100,
    y: 565,
    width: 1000,
    height: 110,
    size: 35,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 49
)

drawText(
    "목표까지\n같이 관리하세요",
    x: pageWidth * 3 + 96,
    y: 300,
    width: 1050,
    size: 82,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)
drawText(
    "할 일, 습관, 목표가 따로 흩어지지 않도록 실행 흐름 안에 모았습니다.",
    x: pageWidth * 3 + 100,
    y: 565,
    width: 1000,
    height: 110,
    size: 35,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 49
)

// Page 1: home at left/top, today panel pushed across the page 1 -> 2 edge.
drawShadowedImage(images[0], in: rectFromTop(92, 650, 820, 1779), radius: 52)
drawShadowedImage(images[1], in: rectFromTop(975, 980, 780, 1694), radius: 52, shadowAlpha: 0.18)
drawBadge("일정 · 습관 · 목표를 한 곳에", x: 118, y: 2550, width: 520)

// Page 2: task add sheet sits on the right without crossing into page 3.
drawShadowedImage(images[2], in: rectFromTop(pageWidth + 540, 735, 750, 1628), radius: 52, shadowAlpha: 0.17)
drawBadge("필요할 때 바로 입력", x: pageWidth + 730, y: 2550, width: 470)

// Page 3: due-by panel on the left, copy on the right.
drawShadowedImage(images[4], in: rectFromTop(pageWidth * 2 + 78, 700, 730, 1584), radius: 52, shadowAlpha: 0.18)

let reviewQuoteX = pageWidth * 2 + 850
drawText(
    "오늘 해야 할 일과\n밀린 일을 나눠 보고,\n다음 행동을 바로 정리합니다.",
    x: reviewQuoteX,
    y: 1120,
    width: 380,
    height: 220,
    size: 36,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.10, alpha: 1),
    lineHeight: 49
)
drawText(
    "오늘만 볼 수도 있고, 이 날까지 해야 하는 일까지 함께 볼 수 있습니다.",
    x: reviewQuoteX,
    y: 1495,
    width: 360,
    height: 210,
    size: 29,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.39, alpha: 1),
    lineHeight: 42
)
drawBadge("오늘과 마감까지", x: pageWidth * 2 + 120, y: 2450, width: 420)

// Page 4: copy on the left, goals screen on the right.
let goalQuoteX = pageWidth * 3 + 100
drawText(
    "목표별 진행률과\n밀린 일을 함께 보며\n다음 실행을 정리합니다.",
    x: goalQuoteX,
    y: 1060,
    width: 500,
    height: 250,
    size: 38,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.10, alpha: 1),
    lineHeight: 52
)
drawText(
    "연간 목표와 월간 목표까지 실행 기록으로 자연스럽게 이어집니다.",
    x: goalQuoteX,
    y: 1445,
    width: 450,
    height: 210,
    size: 29,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.39, alpha: 1),
    lineHeight: 42
)
drawShadowedImage(images[3], in: rectFromTop(pageWidth * 3 + 525, 660, 750, 1628), radius: 52, shadowAlpha: 0.18)
drawBadge("목표까지 이어지는 실행", x: pageWidth * 3 + 120, y: 2450, width: 520)

NSGraphicsContext.restoreGraphicsState()

func cropPage(index: Int, output: String) throws {
    guard let page = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(pageWidth),
        pixelsHigh: Int(height),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        fatalError("Failed to create page bitmap")
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: page)
    if let cgImage = spread.cgImage?.cropping(to: CGRect(x: CGFloat(index) * pageWidth, y: 0, width: pageWidth, height: height)) {
        NSImage(cgImage: cgImage, size: NSSize(width: pageWidth, height: height))
            .draw(in: NSRect(x: 0, y: 0, width: pageWidth, height: height), from: .zero, operation: .sourceOver, fraction: 1)
    }
    NSGraphicsContext.restoreGraphicsState()
    guard let data = page.representation(using: .png, properties: [:]) else {
        fatalError("Failed to encode page")
    }
    try data.write(to: URL(fileURLWithPath: output))
}

for (index, output) in outputs.enumerated() {
    try cropPage(index: index, output: output)
    print(output)
}
