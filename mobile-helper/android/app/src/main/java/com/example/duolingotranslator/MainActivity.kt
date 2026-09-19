package com.example.duolingotranslator

import android.Manifest
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.ArrayAdapter
import android.widget.TextView
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {
    private lateinit var projectionManager: MediaProjectionManager
    private lateinit var languageSpinner: Spinner
    private val languageNames = arrayOf("英语", "西班牙语", "法语", "德语", "意大利语", "葡萄牙语")
    private val languageCodes = arrayOf("en", "es", "fr", "de", "it", "pt")
    private val captureRequest = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val service = Intent(this, OverlayService::class.java).apply {
                action = OverlayService.START
                putExtra(OverlayService.RESULT_CODE, result.resultCode)
                putExtra(OverlayService.RESULT_DATA, result.data)
                putExtra(OverlayService.SOURCE_LANGUAGE, languageCodes[languageSpinner.selectedItemPosition])
            }
            startForegroundService(service)
            moveTaskToBack(true)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        projectionManager = getSystemService(MediaProjectionManager::class.java)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(48, 48, 48, 48)
        }
        root.addView(TextView(this).apply {
            text = "多邻国答题辅助\n\n启动后切换到多邻国，点击悬浮按钮，拖动框选题目文字。首次使用需要授权悬浮窗和屏幕采集。翻译在设备上完成；首次下载语言模型需联网。"
            textSize = 18f
        })
        languageSpinner = Spinner(this)
        languageSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, languageNames)
        root.addView(languageSpinner)
        root.addView(Button(this).apply {
            text = "启动悬浮翻译"
            setOnClickListener { startHelper() }
        })
        root.addView(Button(this).apply {
            text = "关闭悬浮翻译"
            setOnClickListener {
                stopService(Intent(this@MainActivity, OverlayService::class.java))
            }
        })
        setContentView(root)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
    }

    private fun startHelper() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        captureRequest.launch(projectionManager.createScreenCaptureIntent())
    }
}
