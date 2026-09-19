import SwiftUI
import AVKit
import CoreMedia
import CoreVideo

private let sharedOutput = UserDefaults(suiteName: "group.com.example.duolingotranslator")!

final class TranslationPiP: NSObject, ObservableObject,
    AVPictureInPictureSampleBufferPlaybackDelegate, AVPictureInPictureControllerDelegate {
    let preview = UIView(frame: CGRect(x: 0, y: 0, width: 280, height: 158))
    private let videoLayer = AVSampleBufferDisplayLayer()
    private var controller: AVPictureInPictureController?
    private var timer: Timer?
    private var lastResult = ""

    override init() {
        super.init()
        preview.backgroundColor = .black
        videoLayer.frame = preview.bounds
        videoLayer.videoGravity = .resizeAspect
        preview.layer.addSublayer(videoLayer)
        if AVPictureInPictureController.isPictureInPictureSupported() {
            let source = AVPictureInPictureController.ContentSource(
                sampleBufferDisplayLayer: videoLayer, playbackDelegate: self)
            controller = AVPictureInPictureController(contentSource: source)
            controller?.delegate = self
        }
        render("等待翻译…")
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    func start() {
        guard controller?.isPictureInPicturePossible == true else {
            render("画中画尚未就绪；请稍候重试")
            return
        }
        controller?.startPictureInPicture()
    }

    private func refresh() {
        let result = sharedOutput.string(forKey: "translation") ?? "等待翻译…"
        let latency = sharedOutput.integer(forKey: "latencyMs")
        let current = latency > 0 ? "\(result)\n\(latency) ms" : result
        if current != lastResult { render(current) }
    }

    private func render(_ text: String) {
        lastResult = text
        let size = CGSize(width: 640, height: 360)
        let image = UIGraphicsImageRenderer(size: size).image { renderer in
            UIColor(red: 0.08, green: 0.12, blue: 0.18, alpha: 1).setFill()
            UIRectFill(CGRect(origin: .zero, size: size))
            let title = "多邻国翻译" as NSString
            title.draw(in: CGRect(x: 24, y: 18, width: 590, height: 40),
                       withAttributes: [.foregroundColor: UIColor.systemGreen,
                                        .font: UIFont.boldSystemFont(ofSize: 27)])
            (text as NSString).draw(in: CGRect(x: 24, y: 72, width: 590, height: 270),
                                    withAttributes: [.foregroundColor: UIColor.white,
                                                     .font: UIFont.systemFont(ofSize: 33)])
        }
        guard let cgImage = image.cgImage else { return }
        var pixelBuffer: CVPixelBuffer?
        let attributes: [String: Any] = [kCVPixelBufferCGImageCompatibilityKey as String: true,
                                         kCVPixelBufferCGBitmapContextCompatibilityKey as String: true]
        guard CVPixelBufferCreate(kCFAllocatorDefault, 640, 360, kCVPixelFormatType_32BGRA,
                                  attributes as CFDictionary, &pixelBuffer) == kCVReturnSuccess,
              let pixelBuffer else { return }
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        if let context = CGContext(data: CVPixelBufferGetBaseAddress(pixelBuffer), width: 640,
                                   height: 360, bitsPerComponent: 8,
                                   bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
                                   space: CGColorSpaceCreateDeviceRGB(),
                                   bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue |
                                               CGBitmapInfo.byteOrder32Little.rawValue) {
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: 640, height: 360))
        }
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        var format: CMVideoFormatDescription?
        guard CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault,
              imageBuffer: pixelBuffer, formatDescriptionOut: &format) == noErr,
              let format else { return }
        var timing = CMSampleTimingInfo(duration: CMTime(value: 1, timescale: 30),
            presentationTimeStamp: CMTime(seconds: CACurrentMediaTime(), preferredTimescale: 600),
            decodeTimeStamp: .invalid)
        var sample: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(allocator: kCFAllocatorDefault,
              imageBuffer: pixelBuffer, formatDescription: format, sampleTiming: &timing,
              sampleBufferOut: &sample) == noErr, let sample else { return }
        if let attachments = CMSampleBufferGetSampleAttachmentsArray(sample, createIfNecessary: true) {
            let array = attachments as NSArray
            if let first = array.firstObject as? NSMutableDictionary {
                first[kCMSampleAttachmentKey_DisplayImmediately] = true
            }
        }
        if videoLayer.status == .failed { videoLayer.flush() }
        videoLayer.enqueue(sample)
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                    setPlaying playing: Bool) {}
    func pictureInPictureControllerTimeRangeForPlayback(_ pictureInPictureController: AVPictureInPictureController) -> CMTimeRange {
        CMTimeRange(start: .zero, duration: .positiveInfinity)
    }
    func pictureInPictureControllerIsPlaybackPaused(_ pictureInPictureController: AVPictureInPictureController) -> Bool { false }
    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                    didTransitionToRenderSize newRenderSize: CMVideoDimensions) {}
    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                    skipByInterval skipInterval: CMTime,
                                    completion completionHandler: @escaping () -> Void) { completionHandler() }
    func pictureInPictureControllerShouldProhibitBackgroundAudioPlayback(_ pictureInPictureController: AVPictureInPictureController) -> Bool { true }
}
