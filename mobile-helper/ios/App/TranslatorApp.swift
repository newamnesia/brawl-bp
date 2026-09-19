import SwiftUI
import ReplayKit
import Translation

private let shared = UserDefaults(suiteName: "group.com.example.duolingotranslator")!

@main struct TranslatorApp: App {
    @StateObject private var pip = TranslationPiP()
    @State private var regionTop = 0.15
    @State private var regionBottom = 0.65
    @State private var regionLeft = 0.0
    @State private var regionRight = 1.0
    @State private var modelReady = false

    var body: some Scene {
        WindowGroup {
            ScrollView {
              VStack(alignment: .leading, spacing: 20) {
                Text("多邻国答题辅助").font(.largeTitle.bold())
                Text("iOS 画中画实验版：先设置要识别的屏幕纵向范围，准备语言包，开启画中画与屏幕广播，再切换到多邻国。")
                Text("范围上沿：\(Int(regionTop * 100))%")
                Slider(value: $regionTop, in: 0...0.8, step: 0.01)
                Text("范围下沿：\(Int(regionBottom * 100))%")
                Slider(value: $regionBottom, in: 0.2...1, step: 0.01)
                Text("范围左沿：\(Int(regionLeft * 100))%")
                Slider(value: $regionLeft, in: 0...0.8, step: 0.01)
                Text("范围右沿：\(Int(regionRight * 100))%")
                Slider(value: $regionRight, in: 0.2...1, step: 0.01)
                Text(modelReady ? "离线翻译语言包已准备" : "正在准备离线翻译语言包…")
                    .foregroundStyle(modelReady ? .green : .orange)
                PiPPreview(output: pip).frame(width: 280, height: 158)
                Button("开启画中画") { pip.start() }
                    .buttonStyle(.borderedProminent)
                Text("开启屏幕广播（系统会请求录屏授权）")
                BroadcastPicker().frame(width: 48, height: 48)
                Text("识别与翻译结果会显示在画中画。首次下载语言包、系统授权与切换应用所需的时间不计入处理耗时。")
                    .font(.footnote)
              }
              .padding()
            }
            .onChange(of: regionTop) { _, _ in saveRegion() }
            .onChange(of: regionBottom) { _, _ in saveRegion() }
            .onChange(of: regionLeft) { _, _ in saveRegion() }
            .onChange(of: regionRight) { _, _ in saveRegion() }
            .onAppear { saveRegion() }
            .translationTask(source: Locale.Language(identifier: "en"),
                             target: Locale.Language(identifier: "zh-Hans")) { session in
                do { try await session.prepareTranslation(); modelReady = true }
                catch { modelReady = false }
            }
        }
    }

    private func saveRegion() {
        shared.set(min(regionTop, regionBottom - 0.05), forKey: "top")
        shared.set(max(regionBottom, regionTop + 0.05), forKey: "bottom")
        shared.set(min(regionLeft, regionRight - 0.05), forKey: "left")
        shared.set(max(regionRight, regionLeft + 0.05), forKey: "right")
    }
}

private struct BroadcastPicker: UIViewRepresentable {
    func makeUIView(context: Context) -> RPSystemBroadcastPickerView {
        let view = RPSystemBroadcastPickerView()
        view.preferredExtension = "com.example.duolingotranslator.broadcast"
        view.showsMicrophoneButton = false
        return view
    }
    func updateUIView(_ uiView: RPSystemBroadcastPickerView, context: Context) {}
}

private struct PiPPreview: UIViewRepresentable {
    let output: TranslationPiP
    func makeUIView(context: Context) -> UIView { output.preview }
    func updateUIView(_ uiView: UIView, context: Context) {}
}
