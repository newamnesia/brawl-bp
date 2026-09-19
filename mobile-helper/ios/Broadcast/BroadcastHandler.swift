import ReplayKit
import Vision
import Translation
import CoreImage

final class BroadcastHandler: RPBroadcastSampleHandler {
    private let shared = UserDefaults(suiteName: "group.com.example.duolingotranslator")!
    private let context = CIContext()
    private var lastSample = CFAbsoluteTimeGetCurrent()
    private var busy = false
    private var lastText = ""

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer,
                                      with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video, !busy,
              CFAbsoluteTimeGetCurrent() - lastSample >= 0.7,
              let pixel = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        lastSample = CFAbsoluteTimeGetCurrent()
        let image = CIImage(cvPixelBuffer: pixel)
        let full = image.extent
        let top = shared.double(forKey: "top")
        let bottom = shared.double(forKey: "bottom")
        let left = shared.double(forKey: "left")
        let right = shared.double(forKey: "right")
        let lower = min(top, bottom)
        let upper = max(top, bottom)
        let start = min(left, right)
        let end = max(left, right)
        // CIImage coordinates begin at the bottom edge.
        let crop = CGRect(x: full.minX + full.width * start,
                          y: full.minY + full.height * (1 - upper),
                          width: full.width * (end - start), height: full.height * (upper - lower))
        guard crop.width > 10, crop.height > 10,
              let cgImage = context.createCGImage(image.cropped(to: crop), from: crop) else { return }
        busy = true
        Task {
            defer { busy = false }
            let started = CFAbsoluteTimeGetCurrent()
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["en-US"]
            do {
                try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
                let source = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
                    .joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                guard !source.isEmpty, source != lastText else { return }
                lastText = source
                let session = TranslationSession(installedSource: Locale.Language(identifier: "en"),
                                                 target: Locale.Language(identifier: "zh-Hans"))
                let response = try await session.translate(source)
                shared.set(response.targetText, forKey: "translation")
                shared.set(source, forKey: "original")
                shared.set(Date().timeIntervalSince1970, forKey: "translatedAt")
                shared.set(Int((CFAbsoluteTimeGetCurrent() - started) * 1000), forKey: "latencyMs")
            } catch {
                shared.set("识别或翻译失败：\(error.localizedDescription)", forKey: "translation")
            }
        }
    }
}
