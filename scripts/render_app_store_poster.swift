import AppKit
import Foundation

let width: CGFloat = 1320
let height: CGFloat = 2868
let homePath = "/Users/kang-yeongmo/Downloads/Frame 85.png"
let addPath = "/Users/kang-yeongmo/Downloads/Frame 86.png"
let outputPath = "/Users/kang-yeongmo/justdo/app-store-screenshots/01-home-calendar.png"

guard let home = NSImage(contentsOfFile: homePath),
      let add = NSImage(contentsOfFile: addPath) else {
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
    lineHeight: CGFloat? = nil,
    alignment: NSTextAlignment = .left
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
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

func drawClippedImage(_ image: NSImage, in rect: NSRect, radius: CGFloat) {
    NSGraphicsContext.saveGraphicsState()
    roundedRect(rect, radius: radius).addClip()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
}

func drawShadowedCard(_ rect: NSRect, radius: CGFloat, shadowAlpha: CGFloat) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(shadowAlpha)
    shadow.shadowOffset = NSSize(width: 0, height: -22)
    shadow.shadowBlurRadius = 54
    shadow.set()
    NSColor.white.setFill()
    roundedRect(rect, radius: radius).fill()
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
    NSColor(calibratedRed: 0.972, green: 0.965, blue: 0.946, alpha: 1),
    NSColor(calibratedRed: 0.968, green: 0.955, blue: 0.930, alpha: 1),
    NSColor(calibratedRed: 0.910, green: 0.940, blue: 0.955, alpha: 1)
])!
bg.draw(in: NSRect(x: 0, y: 0, width: width, height: height), angle: -92)

let lowerGlow = NSGradient(colors: [
    NSColor(calibratedRed: 0.373, green: 0.553, blue: 0.750, alpha: 0.20),
    NSColor(calibratedRed: 0.820, green: 0.412, blue: 0.300, alpha: 0.12),
    NSColor.clear
])!
lowerGlow.draw(in: rectFromTop(-180, 1800, 1680, 1100), angle: 15)

drawText(
    "Just Do",
    rect: rectFromTop(98, 142, 360, 70),
    font: NSFont.systemFont(ofSize: 42, weight: .bold),
    color: NSColor(calibratedWhite: 0.08, alpha: 1)
)
NSColor(calibratedRed: 0.350, green: 0.570, blue: 0.760, alpha: 1).setFill()
NSBezierPath(ovalIn: rectFromTop(278, 173, 11, 11)).fill()

drawText(
    "할 일과 습관을\n캘린더 한 화면에서",
    rect: rectFromTop(96, 300, 980, 250),
    font: NSFont.systemFont(ofSize: 82, weight: .bold),
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)

drawText(
    "날짜 위에 흐름을 정리하고, 오늘 해야 할 일을 바로 확인하세요.",
    rect: rectFromTop(100, 565, 1000, 82),
    font: NSFont.systemFont(ofSize: 31, weight: .medium),
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 44
)

let mainRect = rectFromTop(92, 760, 805, 1746)
let addRect = rectFromTop(780, 1142, 430, 932)

drawShadowedCard(mainRect, radius: 54, shadowAlpha: 0.16)
drawClippedImage(home, in: mainRect, radius: 54)

drawShadowedCard(addRect, radius: 46, shadowAlpha: 0.18)
drawClippedImage(add, in: addRect, radius: 46)

let badgeRect = rectFromTop(118, 2538, 495, 86)
NSColor.white.withAlphaComponent(0.72).setFill()
roundedRect(badgeRect, radius: 43).fill()
drawText(
    "일정 · 습관 · 목표를 한 곳에",
    rect: NSRect(x: badgeRect.minX + 34, y: badgeRect.minY + 22, width: badgeRect.width - 68, height: 42),
    font: NSFont.systemFont(ofSize: 29, weight: .semibold),
    color: NSColor(calibratedWhite: 0.18, alpha: 1)
)

NSGraphicsContext.restoreGraphicsState()

guard let data = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Failed to encode output")
}

try data.write(to: URL(fileURLWithPath: outputPath))
print(outputPath)
