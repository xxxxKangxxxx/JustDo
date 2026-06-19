import AppKit
import Foundation

let pageWidth: CGFloat = 1320
let height: CGFloat = 2868
let spreadWidth: CGFloat = pageWidth * 2
let homePath = "/Users/kang-yeongmo/Downloads/Frame 85.png"
let goalsPath = "/Users/kang-yeongmo/Downloads/Frame 87.png"
let panelPath = "/Users/kang-yeongmo/Downloads/Frame 89.png"
let output1 = "/Users/kang-yeongmo/justdo/app-store-screenshots/01-calendar-carousel.png"
let output2 = "/Users/kang-yeongmo/justdo/app-store-screenshots/02-goals-carousel.png"

guard let home = NSImage(contentsOfFile: homePath),
      let goals = NSImage(contentsOfFile: goalsPath),
      let panel = NSImage(contentsOfFile: panelPath) else {
    fatalError("Missing input screenshots")
}

func rectFromTop(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect {
    NSRect(x: x, y: height - y - h, width: w, height: h)
}

func roundedRect(_ rect: NSRect, radius: CGFloat) -> NSBezierPath {
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func drawText(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, size: CGFloat, weight: NSFont.Weight, color: NSColor, lineHeight: CGFloat? = nil) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .left
    if let lineHeight {
        paragraph.minimumLineHeight = lineHeight
        paragraph.maximumLineHeight = lineHeight
    }
    text.draw(
        in: rectFromTop(x, y, width, 280),
        withAttributes: [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: color,
            .paragraphStyle: paragraph,
            .kern: 0
        ]
    )
}

func drawBrand(x: CGFloat) {
    drawText("Just Do", x: x, y: 142, width: 360, size: 42, weight: .bold, color: NSColor(calibratedWhite: 0.08, alpha: 1))
    NSColor(calibratedRed: 0.350, green: 0.570, blue: 0.760, alpha: 1).setFill()
    NSBezierPath(ovalIn: rectFromTop(x + 180, 173, 11, 11)).fill()
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
    NSColor.white.withAlphaComponent(0.76).setFill()
    roundedRect(rect, radius: 44).fill()
    drawText(text, x: x + 34, y: y + 22, width: width - 68, size: 29, weight: .semibold, color: NSColor(calibratedWhite: 0.18, alpha: 1))
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

let bg = NSGradient(colors: [
    NSColor(calibratedRed: 0.973, green: 0.965, blue: 0.946, alpha: 1),
    NSColor(calibratedRed: 0.943, green: 0.958, blue: 0.936, alpha: 1),
    NSColor(calibratedRed: 0.900, green: 0.930, blue: 0.970, alpha: 1)
])!
bg.draw(in: NSRect(x: 0, y: 0, width: spreadWidth, height: height), angle: -96)

let glow = NSGradient(colors: [
    NSColor(calibratedRed: 0.320, green: 0.520, blue: 0.735, alpha: 0.22),
    NSColor(calibratedRed: 0.435, green: 0.650, blue: 0.510, alpha: 0.12),
    NSColor.clear
])!
glow.draw(in: rectFromTop(180, 1680, 2200, 1120), angle: 12)

drawBrand(x: 98)
drawBrand(x: pageWidth + 98)

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
    size: 31,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 44
)

drawText(
    "목표 진행률은\n자동으로 채워져요",
    x: pageWidth + 96,
    y: 300,
    width: 1050,
    size: 82,
    weight: .bold,
    color: NSColor(calibratedWhite: 0.08, alpha: 1),
    lineHeight: 96
)
drawText(
    "실행 기록이 쌓이면 월간 · 연간 목표 흐름이 자연스럽게 보입니다.",
    x: pageWidth + 100,
    y: 565,
    width: 1000,
    size: 31,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.34, alpha: 1),
    lineHeight: 44
)

let homeRect = rectFromTop(92, 820, 760, 1648)
let goalsSeamRect = rectFromTop(860, 865, 770, 1672)
let panelRect = rectFromTop(pageWidth + 450, 1030, 720, 1562)

drawShadowedImage(home, in: homeRect, radius: 52)
drawShadowedImage(goals, in: goalsSeamRect, radius: 52, shadowAlpha: 0.18)
drawShadowedImage(panel, in: panelRect, radius: 52, shadowAlpha: 0.18)

drawBadge("일정 · 습관 · 목표를 한 곳에", x: 118, y: 2550, width: 520)
drawBadge("기록으로 목표를 돌아보기", x: pageWidth + 120, y: 2550, width: 500)

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
    let source = NSRect(x: CGFloat(index) * pageWidth, y: 0, width: pageWidth, height: height)
    if let cgImage = spread.cgImage?.cropping(to: source) {
        NSImage(cgImage: cgImage, size: NSSize(width: pageWidth, height: height))
            .draw(in: NSRect(x: 0, y: 0, width: pageWidth, height: height), from: .zero, operation: .sourceOver, fraction: 1)
    }
    NSGraphicsContext.restoreGraphicsState()
    guard let data = page.representation(using: .png, properties: [:]) else {
        fatalError("Failed to encode page")
    }
    try data.write(to: URL(fileURLWithPath: output))
}

try cropPage(index: 0, output: output1)
try cropPage(index: 1, output: output2)
print(output1)
print(output2)
