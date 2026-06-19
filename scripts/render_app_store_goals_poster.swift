import AppKit
import Foundation

let width: CGFloat = 1320
let height: CGFloat = 2868
let goalPath = "/Users/kang-yeongmo/Downloads/Frame 87.png"
let panelPath = "/Users/kang-yeongmo/Downloads/Frame 89.png"
let outputPath = "/Users/kang-yeongmo/justdo/app-store-screenshots/02-goals-flow.png"

guard let goal = NSImage(contentsOfFile: goalPath),
      let panel = NSImage(contentsOfFile: panelPath) else {
    fatalError("Missing input screenshots")
}

func rectFromTop(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect {
    NSRect(x: x, y: height - y - h, width: w, height: h)
}

func roundedRect(_ rect: NSRect, radius: CGFloat) -> NSBezierPath {
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func drawText(
    _ text: String,
    rect: NSRect,
    font: NSFont,
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
        in: rect,
        withAttributes: [
            .font: font,
            .foregroundColor: color,
            .paragraphStyle: paragraph,
            .kern: 0
        ]
    )
}

func drawShadowedImage(_ image: NSImage, in rect: NSRect, radius: CGFloat, alpha: CGFloat = 1) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.17)
    shadow.shadowOffset = NSSize(width: 0, height: -24)
    shadow.shadowBlurRadius = 64
    shadow.set()
    NSColor.white.setFill()
    roundedRect(rect, radius: radius).fill()
    NSGraphicsContext.restoreGraphicsState()

    NSGraphicsContext.saveGraphicsState()
    roundedRect(rect, radius: radius).addClip()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: alpha)
    NSGraphicsContext.restoreGraphicsState()
}

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(width),
    pixelsHigh: Int(height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fatalError("Failed to create bitmap")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

let bg = NSGradient(colors: [
    NSColor(calibratedRed: 0.970, green: 0.960, blue: 0.936, alpha: 1),
    NSColor(calibratedRed: 0.940, green: 0.958, blue: 0.936, alpha: 1),
    NSColor(calibratedRed: 0.900, green: 0.930, blue: 0.970, alpha: 1)
])!
bg.draw(in: NSRect(x: 0, y: 0, width: width, height: height), angle: -95)

let glow = NSGradient(colors: [
    NSColor(calibratedRed: 0.320, green: 0.520, blue: 0.735, alpha: 0.22),
    NSColor(calibratedRed: 0.435, green: 0.650, blue: 0.510, alpha: 0.14),
    NSColor.clear
])!
glow.draw(in: rectFromTop(-220, 1550, 1800, 1250), angle: 20)

drawText(
    "Just Do",
    rect: rectFromTop(98, 142, 360, 70),
    font: NSFont.systemFont(ofSize: 42, weight: .bold),
    color: NSColor(calibratedWhite: 0.08, alpha: 1)
)
NSColor(calibratedRed: 0.350, green: 0.570, blue: 0.760, alpha: 1).setFill()
NSBezierPath(ovalIn: rectFromTop(278, 173, 11, 11)).fill()

drawText(
    "목표 진행률은\n자동으로 채워져요",
    rect: rectFromTop(96, 300, 1050, 250),
    font: NSFont.systemFont(ofSize: 82, weight: .bold),
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)

drawText(
    "할 일과 습관을 마치면 월간 · 연간 목표 흐름이 자연스럽게 쌓입니다.",
    rect: rectFromTop(100, 565, 1010, 92),
    font: NSFont.systemFont(ofSize: 31, weight: .medium),
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 44
)

let goalRect = rectFromTop(92, 760, 700, 1518)
let panelRect = rectFromTop(564, 980, 660, 1432)

drawShadowedImage(goal, in: goalRect, radius: 46)
drawShadowedImage(panel, in: panelRect, radius: 46)

let badgeRect = rectFromTop(120, 2478, 610, 88)
NSColor.white.withAlphaComponent(0.76).setFill()
roundedRect(badgeRect, radius: 44).fill()
drawText(
    "실행 기록으로 목표를 돌아보기",
    rect: NSRect(x: badgeRect.minX + 34, y: badgeRect.minY + 23, width: badgeRect.width - 68, height: 42),
    font: NSFont.systemFont(ofSize: 29, weight: .semibold),
    color: NSColor(calibratedWhite: 0.18, alpha: 1)
)

NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Failed to encode output")
}

try data.write(to: URL(fileURLWithPath: outputPath))
print(outputPath)
