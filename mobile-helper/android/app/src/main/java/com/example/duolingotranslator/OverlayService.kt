package com.example.duolingotranslator

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.RectF
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class OverlayService : Service() {
    companion object {
        const val START = "helper.start"
        const val RESULT_CODE = "resultCode"
        const val RESULT_DATA = "resultData"
        const val SOURCE_LANGUAGE = "sourceLanguage"
        private const val CHANNEL = "duolingo_helper"
    }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var windows: WindowManager
    private var projection: MediaProjection? = null
    private var display: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var bubble: LinearLayout? = null
    private var bubbleParams: WindowManager.LayoutParams? = null
    private var selection: SelectionView? = null
    private var resultLabel: TextView? = null
    private var translator: Translator? = null
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private var modelReady = false
    private var requestNumber = 0
    private var resultPending = false

    override fun onBind(intent: Intent?): IBinder? = null

    @Suppress("DEPRECATION")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != START) return START_NOT_STICKY
        if (projection != null) return START_NOT_STICKY
        windows = getSystemService(WINDOW_SERVICE) as WindowManager
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(
            NotificationChannel(CHANNEL, "悬浮翻译", NotificationManager.IMPORTANCE_LOW)
        )
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_search)
            .setContentTitle("多邻国答题辅助运行中")
            .setContentText("点击悬浮窗框选文字；从应用内可关闭")
            .setContentIntent(open).build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } else startForeground(1, notification)

        val data = if (Build.VERSION.SDK_INT >= 33)
            intent.getParcelableExtra(RESULT_DATA, Intent::class.java)
        else intent.getParcelableExtra<Intent>(RESULT_DATA)
        if (data == null) { stopSelf(); return START_NOT_STICKY }
        val code = intent.getIntExtra(RESULT_CODE, 0)
        val manager = getSystemService(MediaProjectionManager::class.java)
        projection = manager.getMediaProjection(code, data)
        projection?.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() { main.post { stopSelf() } }
        }, main)

        val metrics = DisplayMetrics()
        windows.defaultDisplay.getRealMetrics(metrics)
        imageReader = ImageReader.newInstance(metrics.widthPixels, metrics.heightPixels,
            PixelFormat.RGBA_8888, 2)
        display = projection?.createVirtualDisplay("translation-capture", metrics.widthPixels,
            metrics.heightPixels, metrics.densityDpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader!!.surface, null, main)
        showBubble()
        val source = intent.getStringExtra(SOURCE_LANGUAGE) ?: "en"
        val language = TranslateLanguage.fromLanguageTag(source) ?: TranslateLanguage.ENGLISH
        translator = Translation.getClient(TranslatorOptions.Builder()
            .setSourceLanguage(language).setTargetLanguage(TranslateLanguage.CHINESE).build())
        resultLabel?.text = "正在准备离线翻译模型…"
        translator!!.downloadModelIfNeeded().addOnSuccessListener {
            modelReady = true
            resultLabel?.text = "准备好了。点击“框选”翻译。"
        }.addOnFailureListener {
            resultLabel?.text = "语言模型下载失败，请联网后重新启动。"
        }
        return START_NOT_STICKY
    }

    private fun showBubble() {
        val density = resources.displayMetrics.density
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((12*density).toInt(), (8*density).toInt(),
                (12*density).toInt(), (8*density).toInt())
            setBackgroundColor(Color.argb(240, 27, 35, 54))
        }
        val header = TextView(this).apply {
            text = "☰  多邻国翻译"
            textSize = 16f
            setTextColor(Color.WHITE)
        }
        box.addView(header)
        val action = TextView(this).apply {
            text = "框选"
            textSize = 18f
            setTextColor(Color.rgb(130, 240, 175))
            setPadding(0, (8*density).toInt(), 0, (8*density).toInt())
            setOnClickListener { if (modelReady) capture() }
        }
        box.addView(action)
        resultLabel = TextView(this).apply {
            textSize = 15f
            setTextColor(Color.WHITE)
            maxLines = 8
        }
        box.addView(resultLabel)
        val close = TextView(this).apply {
            text = "关闭"
            textSize = 13f
            setTextColor(Color.LTGRAY)
            setOnClickListener { stopSelf() }
        }
        box.addView(close)
        val params = WindowManager.LayoutParams((260*density).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START; x = 24; y = 180 }
        var initialX = 0
        var initialY = 0
        var touchX = 0f
        var touchY = 0f
        header.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x; initialY = params.y
                    touchX = event.rawX; touchY = event.rawY; true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX-touchX).toInt()
                    params.y = initialY + (event.rawY-touchY).toInt()
                    windows.updateViewLayout(box, params); true
                }
                else -> true
            }
        }
        bubble = box
        bubbleParams = params
        windows.addView(box, params)
    }

    private fun capture(attempt: Int = 0) {
        bubble?.visibility = View.GONE
        main.postDelayed({
            val frame = imageReader?.acquireLatestImage()
            if (frame == null) {
                if (attempt < 8) capture(attempt + 1)
                else { bubble?.visibility = View.VISIBLE; resultLabel?.text = "屏幕采集尚未就绪" }
                return@postDelayed
            }
            val plane = frame.planes[0]
            val width = frame.width
            val height = frame.height
            val paddedWidth = plane.rowStride / plane.pixelStride
            val padded = Bitmap.createBitmap(paddedWidth, height, Bitmap.Config.ARGB_8888)
            padded.copyPixelsFromBuffer(plane.buffer)
            frame.close()
            val screenshot = Bitmap.createBitmap(padded, 0, 0, width, height)
            padded.recycle()
            showSelection(screenshot)
        }, 100)
    }

    private fun showSelection(screenshot: Bitmap) {
        val view = SelectionView(screenshot) { rectangle ->
            selection?.let { windows.removeView(it) }
            selection = null
            bubble?.visibility = View.VISIBLE
            if (rectangle == null) { screenshot.recycle(); return@SelectionView }
            val crop = Bitmap.createBitmap(screenshot, rectangle.left, rectangle.top,
                rectangle.width(), rectangle.height())
            screenshot.recycle()
            translateCrop(crop)
        }
        selection = view
        windows.addView(view, WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT))
    }

    private fun translateCrop(bitmap: Bitmap) {
        val id = ++requestNumber
        val began = System.nanoTime()
        resultPending = true
        resultLabel?.text = "识别中…"
        main.postDelayed({
            if (id == requestNumber && resultPending)
                resultLabel?.text = "处理超过 3 秒，仍在继续…"
        }, 3000)
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { recognized ->
                bitmap.recycle()
                if (id != requestNumber) return@addOnSuccessListener
                val original = recognized.text.trim()
                if (original.isEmpty()) {
                    resultPending = false
                    resultLabel?.text = "框内未识别到文字"
                    return@addOnSuccessListener
                }
                translator?.translate(original)?.addOnSuccessListener { chinese ->
                    if (id == requestNumber) {
                        resultPending = false
                        val elapsed = (System.nanoTime()-began)/1_000_000
                        resultLabel?.text = "$chinese\n\n原文：$original\n${elapsed} ms"
                    }
                }?.addOnFailureListener {
                    if (id == requestNumber) {
                        resultPending = false
                        resultLabel?.text = "翻译失败：${it.localizedMessage}"
                    }
                }
            }.addOnFailureListener {
                bitmap.recycle()
                if (id == requestNumber) {
                    resultPending = false
                    resultLabel?.text = "识别失败：${it.localizedMessage}"
                }
            }
    }

    override fun onDestroy() {
        requestNumber++
        selection?.let { windows.removeView(it) }
        bubble?.let { windows.removeView(it) }
        display?.release()
        imageReader?.close()
        projection?.stop()
        translator?.close()
        recognizer.close()
        super.onDestroy()
    }

    private inner class SelectionView(
        private val screenshot: Bitmap,
        private val finished: (Rect?) -> Unit
    ) : View(this@OverlayService) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private var startX = 0f
        private var startY = 0f
        private var endX = 0f
        private var endY = 0f
        private var dragging = false

        override fun onDraw(canvas: Canvas) {
            canvas.drawBitmap(screenshot, null, Rect(0, 0, width, height), paint)
            paint.color = Color.argb(85, 0, 0, 0)
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
            if (dragging) {
                val area = RectF(min(startX,endX), min(startY,endY), max(startX,endX), max(startY,endY))
                paint.color = Color.WHITE
                canvas.drawBitmap(screenshot,
                    Rect((area.left*screenshot.width/width).toInt(), (area.top*screenshot.height/height).toInt(),
                        (area.right*screenshot.width/width).toInt(), (area.bottom*screenshot.height/height).toInt()), area, paint)
                paint.color = Color.rgb(100, 230, 150)
                paint.style = Paint.Style.STROKE
                paint.strokeWidth = 4f
                canvas.drawRect(area, paint)
                paint.style = Paint.Style.FILL
            }
        }

        override fun onTouchEvent(event: MotionEvent): Boolean {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    startX = event.x; startY = event.y
                    endX = startX; endY = startY; dragging = true; invalidate(); return true
                }
                MotionEvent.ACTION_MOVE -> {
                    endX = event.x; endY = event.y; invalidate(); return true
                }
                MotionEvent.ACTION_UP -> {
                    endX = event.x; endY = event.y
                    val rect = Rect(
                        (min(startX,endX)*screenshot.width/width).toInt().coerceIn(0,screenshot.width-1),
                        (min(startY,endY)*screenshot.height/height).toInt().coerceIn(0,screenshot.height-1),
                        (max(startX,endX)*screenshot.width/width).toInt().coerceIn(1,screenshot.width),
                        (max(startY,endY)*screenshot.height/height).toInt().coerceIn(1,screenshot.height))
                    finished(if (abs(endX-startX) > 12 && abs(endY-startY) > 12) rect else null)
                    return true
                }
            }
            return true
        }
    }
}
