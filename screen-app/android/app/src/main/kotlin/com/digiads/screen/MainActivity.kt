package com.digiads.screen

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

private const val TAG = "DigiAdsScreen"

/**
 * Boot-safety and GPU recovery guard.
 *
 * Prevents OS crashes and GPU starvation during the post-boot storm by deferring
 * hardware video surface allocation until the OS (SurfaceFlinger and media.codec)
 * has stabilized.
 */
object KioskGuard {
    private const val PREFS = "screen_guard"
    private const val KEY_UNHEALTHY_STARTS = "unhealthy_starts"

    const val MAX_UNHEALTHY_STARTS = 3
    const val HEALTHY_RUN_MS = 60_000L
    const val BOOT_SETTLE_MS = 25_000L
    private const val WARM_START_DELAY_MS = 500L

    fun prefs(context: Context): SharedPreferences {
        val ctx = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                context.createDeviceProtectedStorageContext()
            } catch (e: Exception) {
                context
            }
        } else {
            context
        }
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun settleDelayMs(): Long {
        val remaining = BOOT_SETTLE_MS - SystemClock.elapsedRealtime()
        return if (remaining > 0) remaining else WARM_START_DELAY_MS
    }

    fun isColdBootLaunch(): Boolean = SystemClock.elapsedRealtime() < BOOT_SETTLE_MS

    fun registerStart(context: Context): Int = try {
        val p = prefs(context)
        val count = p.getInt(KEY_UNHEALTHY_STARTS, 0) + 1
        p.edit().putInt(KEY_UNHEALTHY_STARTS, count).commit()
        count
    } catch (e: Exception) {
        Log.e(TAG, "registerStart failed: ${e.message}")
        0
    }

    fun markHealthy(context: Context) {
        try {
            prefs(context).edit().putInt(KEY_UNHEALTHY_STARTS, 0).commit()
            Log.i(TAG, "Screen run marked healthy — boot counter reset.")
        } catch (e: Exception) {
            Log.e(TAG, "markHealthy failed: ${e.message}")
        }
    }

    fun isTripped(context: Context): Boolean = try {
        prefs(context).getInt(KEY_UNHEALTHY_STARTS, 0) >= MAX_UNHEALTHY_STARTS
    } catch (e: Exception) {
        false
    }
}

class MainActivity : FlutterActivity() {
    private val SYSTEM_CHANNEL = "com.digiads.screen/system"
    private val VIDEO_CHANNEL = "com.digiads.screen/native_video"
    private var videoMethodChannel: MethodChannel? = null

    private val mainHandler = Handler(Looper.getMainLooper())
    private val healthyRunnable = Runnable { KioskGuard.markHealthy(this) }

    companion object {
        var activeVideoView: NativeVideoView? = null
        var safeMode = false
        var pendingVideoPath: String? = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        val starts = KioskGuard.registerStart(this)
        safeMode = starts >= KioskGuard.MAX_UNHEALTHY_STARTS
        if (safeMode) {
            Log.e(TAG, "SAFE MODE ENGAGED ($starts consecutive unhealthy starts).")
        } else {
            Log.i(TAG, "Screen start registered. Count: $starts")
        }

        mainHandler.removeCallbacks(healthyRunnable)
        mainHandler.postDelayed(healthyRunnable, KioskGuard.HEALTHY_RUN_MS)

        // System Channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SYSTEM_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openAndroidSettings" -> {
                    try {
                        startActivity(
                            Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("SETTINGS_ERROR", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // Native Video Channel
        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VIDEO_CHANNEL)
        videoMethodChannel = channel

        flutterEngine.platformViewsController.registry.registerViewFactory(
            VIDEO_CHANNEL,
            NativeVideoViewFactory(channel)
        )

        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "playVideo" -> {
                    val path = call.argument<String>("path") ?: ""
                    mainHandler.post {
                        val view = activeVideoView
                        if (view == null) {
                            pendingVideoPath = path
                            Log.i(TAG, "Video view is not attached yet; queued $path")
                        } else {
                            view.playVideo(path)
                        }
                    }
                    result.success(null)
                }
                "setPlaylist" -> {
                    val paths = call.argument<List<String>>("paths") ?: emptyList()
                    val index = call.argument<Int>("currentIndex") ?: 0
                    val targetPath = paths.getOrNull(index) ?: paths.firstOrNull() ?: ""
                    mainHandler.post { activeVideoView?.playVideo(targetPath) }
                    result.success(null)
                }
                "play" -> {
                    mainHandler.post { activeVideoView?.play() }
                    result.success(null)
                }
                "pause" -> {
                    mainHandler.post { activeVideoView?.pause() }
                    result.success(null)
                }
                "stopVideo" -> {
                    mainHandler.post {
                        pendingVideoPath = null
                        activeVideoView?.stopVideo()
                    }
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        hideSystemUI()
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(healthyRunnable)
        if (SystemClock.elapsedRealtime() > KioskGuard.BOOT_SETTLE_MS) {
            KioskGuard.markHealthy(this)
        }
        activeVideoView = null
        pendingVideoPath = null
        super.onDestroy()
    }

    private fun hideSystemUI() {
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { c ->
                c.hide(
                    android.view.WindowInsets.Type.statusBars() or
                        android.view.WindowInsets.Type.navigationBars()
                )
                c.systemBarsBehavior =
                    android.view.WindowInsetsController.BEHAVIOR_DEFAULT
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                )
        }
    }
}

/**
 * Native AndroidX Media3 ExoPlayer SurfaceView for Wall Screen Displays.
 * Renders video natively with direct hardware SurfaceView display clipping.
 * Defers surface allocation during cold boot until the OS has settled.
 */
class NativeVideoView(
    context: Context,
    id: Int,
    creationParams: Map<String, Any?>?,
    private val methodChannel: MethodChannel?
) : PlatformView, FrameLayout(context) {

    private var exoPlayer: androidx.media3.exoplayer.ExoPlayer? = null
    private var playerView: androidx.media3.ui.PlayerView? = null
    private val handler = Handler(Looper.getMainLooper())

    private var currentVideoPath: String? = null
    private var pendingVideoPath: String? = null
    private var isPlaying = true
    private var disposed = false
    private var attached = false

    init {
        MainActivity.activeVideoView?.let { if (it !== this) it.dispose() }
        MainActivity.activeVideoView = this

        setBackgroundColor(Color.BLACK)

        val initialPath = (creationParams?.get("path") as? String)
            ?: (creationParams?.get("paths") as? List<*>)?.firstOrNull() as? String
            ?: MainActivity.pendingVideoPath
        MainActivity.pendingVideoPath = null
        currentVideoPath = initialPath
        Log.i(TAG, "NativeVideoView created; initial video=${initialPath ?: "none"}")

        if (MainActivity.safeMode) {
            Log.w(TAG, "Safe Mode — native video surface suppressed for recovery.")
        } else if (KioskGuard.isColdBootLaunch()) {
            val delay = KioskGuard.settleDelayMs()
            Log.i(TAG, "Cold boot detected — deferring ExoPlayer surface attach by ${delay}ms to prevent GPU contention")
            handler.postDelayed({ attachSurfaces() }, delay)
        } else {
            attachSurfaces()
        }
    }

    private fun attachSurfaces() {
        if (disposed || attached) return
        attached = true

        try {
            val player = androidx.media3.exoplayer.ExoPlayer.Builder(context).build().apply {
                volume = 0f
                trackSelectionParameters = trackSelectionParameters
                    .buildUpon()
                    .setTrackTypeDisabled(androidx.media3.common.C.TRACK_TYPE_AUDIO, true)
                    .build()
            }
            exoPlayer = player

            val pv = androidx.media3.ui.PlayerView(context).apply {
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
                useController = false
                resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT
                setShutterBackgroundColor(Color.BLACK)
                setPlayer(player)
            }
            playerView = pv
            addView(pv)

            player.addListener(object : androidx.media3.common.Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    Log.i(TAG, "ExoPlayer state=$playbackState path=$currentVideoPath")
                    if (playbackState == androidx.media3.common.Player.STATE_ENDED) {
                        val durationMs = player.duration
                        val durationSec = if (durationMs > 0) (durationMs / 1000).toInt() else 0
                        methodChannel?.invokeMethod(
                            "onVideoComplete",
                            mapOf(
                                "path" to currentVideoPath,
                                "duration" to durationSec
                            )
                        )
                    }
                }

                override fun onRenderedFirstFrame() {
                    Log.i(TAG, "ExoPlayer first frame rendered path=$currentVideoPath")
                }

                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    Log.w(TAG, "ExoPlayer playback error: ${error.message}")
                    methodChannel?.invokeMethod(
                        "onVideoError",
                        mapOf("path" to currentVideoPath, "error" to error.message)
                    )
                }
            })

            pendingVideoPath?.let {
                currentVideoPath = it
                pendingVideoPath = null
            }
            currentVideoPath?.let { path ->
                if (path.isNotEmpty()) {
                    playVideo(path)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "ExoPlayer initialization failed: ${e.message}")
        }
    }

    override fun getView(): View = this

    fun playVideo(path: String) {
        if (disposed) return
        currentVideoPath = path
        isPlaying = true

        val player = exoPlayer
        if (player == null) {
            pendingVideoPath = path
            return
        }
        if (path.isEmpty()) {
            player.stop()
            player.clearMediaItems()
            return
        }

        try {
            player.stop()
            player.clearMediaItems()
            val uri = Uri.parse(path)
            val mediaItem = if (uri.scheme.isNullOrEmpty()) {
                androidx.media3.common.MediaItem.fromUri(Uri.fromFile(java.io.File(path)))
            } else {
                androidx.media3.common.MediaItem.fromUri(uri)
            }

            player.volume = 0f
            player.setMediaItem(mediaItem, 0L)
            player.seekToDefaultPosition()
            player.repeatMode = androidx.media3.common.Player.REPEAT_MODE_OFF
            player.prepare()
            player.play()
        } catch (e: Exception) {
            Log.e(TAG, "playVideo failed for $path: ${e.message}")
        }
    }

    fun play() {
        if (disposed) return
        isPlaying = true
        exoPlayer?.let {
            if (it.playbackState == androidx.media3.common.Player.STATE_ENDED || it.playbackState == androidx.media3.common.Player.STATE_IDLE) {
                it.seekToDefaultPosition()
                it.prepare()
            }
            it.play()
        }
    }

    fun pause() {
        isPlaying = false
        exoPlayer?.pause()
    }

    fun stopVideo() {
        currentVideoPath = null
        exoPlayer?.stop()
        exoPlayer?.clearMediaItems()
    }

    override fun dispose() {
        if (disposed) return
        disposed = true
        handler.removeCallbacksAndMessages(null)
        try {
            exoPlayer?.stop()
            exoPlayer?.release()
        } catch (e: Exception) {
            Log.w(TAG, "ExoPlayer release: ${e.message}")
        }
        exoPlayer = null
        playerView = null
        removeAllViews()
        if (MainActivity.activeVideoView === this) {
            MainActivity.activeVideoView = null
        }
    }
}

class NativeVideoViewFactory(private val methodChannel: MethodChannel?) :
    PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, id: Int, args: Any?): PlatformView {
        @Suppress("UNCHECKED_CAST")
        val creationParams = args as? Map<String, Any?>
        return NativeVideoView(context, id, creationParams, methodChannel)
    }
}
