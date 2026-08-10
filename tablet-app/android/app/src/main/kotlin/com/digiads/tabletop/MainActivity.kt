package com.digiads.tabletop

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import android.util.Log
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.widget.FrameLayout
import android.widget.VideoView
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory
import kotlin.math.min

private const val TAG = "DigiAdsKiosk"

class KioskAdminReceiver : DeviceAdminReceiver()

/**
 * Boot-safety policy shared by the Activity, the boot receiver and the video view.
 *
 * Two independent problems are solved here:
 *
 *  1. COLD-BOOT RACE — on RK3326 / Mali-G31 / Android 8.1 the OS is still bringing up
 *     SurfaceFlinger, the HWC2On1Adapter shim and media.codec for tens of seconds after
 *     BOOT_COMPLETED. Allocating a video decoder or forcing a SystemUI relayout inside
 *     that window is what panics the GPU driver and triggers the OS watchdog reboot.
 *     Everything dangerous is therefore deferred until the device has been up for
 *     [BOOT_SETTLE_MS].
 *
 *  2. UNDETECTABLE REBOOT LOOP — the previous guard counted "4 launches in 60s" and
 *     persisted with apply(). A full RK3326 boot cycle takes 35-60s, so four launches
 *     can never fall inside a 60s window, and apply() is asynchronous so the write is
 *     lost when the watchdog kills the runtime seconds later. The guard could never
 *     fire on the exact failure it was written for. It is replaced by a monotonic
 *     "unhealthy start" counter written with commit() (synchronous) into
 *     device-protected storage, cleared only after the app survives [HEALTHY_RUN_MS].
 *     A device stuck in a reboot loop never reaches that marker, so the counter climbs
 *     until Safe Mode releases the lockdown.
 */
object KioskGuard {
    private const val PREFS = "kiosk_guard"
    private const val KEY_UNHEALTHY_STARTS = "unhealthy_starts"

    /** Consecutive starts that never reached a healthy runtime before Safe Mode engages. */
    const val MAX_UNHEALTHY_STARTS = 3

    /** How long the app must stay alive before a start counts as healthy. */
    const val HEALTHY_RUN_MS = 90_000L

    /** Device uptime before GPU / DevicePolicy work is considered safe. */
    const val BOOT_SETTLE_MS = 45_000L

    /** Minimum settle delay even on a warm start, so SystemUI/DPM are bound. */
    private const val WARM_START_DELAY_MS = 1_500L

    /**
     * Device-protected storage keeps the counter readable and writable before the user
     * unlocks the device and makes it independent of credential-encrypted storage,
     * which is not mounted during Direct Boot.
     */
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

    /** Milliseconds still remaining before the post-boot danger window closes. */
    fun settleDelayMs(): Long {
        val remaining = BOOT_SETTLE_MS - SystemClock.elapsedRealtime()
        return if (remaining > 0) remaining else WARM_START_DELAY_MS
    }

    /** True when this process started inside the post-boot danger window. */
    fun isColdBootLaunch(): Boolean = SystemClock.elapsedRealtime() < BOOT_SETTLE_MS

    /**
     * Records a start attempt. Written with commit() so it survives a hard watchdog
     * reboot that happens moments later. Returns the new consecutive-unhealthy count.
     */
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
            Log.i(TAG, "Run marked healthy — boot guard counter reset.")
        } catch (e: Exception) {
            Log.e(TAG, "markHealthy failed: ${e.message}")
        }
    }

    fun reset(context: Context) = markHealthy(context)

    fun isTripped(context: Context): Boolean = try {
        prefs(context).getInt(KEY_UNHEALTHY_STARTS, 0) >= MAX_UNHEALTHY_STARTS
    } catch (e: Exception) {
        false
    }
}

/**
 * Fallback cold-boot launcher.
 *
 * When the app is the resolved default HOME activity the system already starts it at
 * boot. Starting it a second time from here raced the system launch and produced two
 * competing Flutter engines / video surfaces during the exact window the GPU driver
 * cannot tolerate. The receiver is now only a fallback for devices where the app has
 * not been made the default launcher, and it always defers past the boot storm.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        try {
            if (context.packageManager.isSafeMode) {
                Log.w(TAG, "Android safe mode — skipping kiosk auto-launch.")
                return
            }
            if (KioskGuard.isTripped(context)) {
                Log.e(TAG, "Boot guard tripped — skipping kiosk auto-launch for recovery.")
                return
            }
            if (isDefaultHome(context)) {
                Log.i(TAG, "App is the default HOME activity — system handles boot launch.")
                return
            }

            val launch = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            var flags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags = flags or PendingIntent.FLAG_IMMUTABLE
            }
            val pending = PendingIntent.getActivity(context, 0, launch, flags)

            // AlarmManager, not postDelayed: this receiver's process may be reclaimed
            // as soon as onReceive() returns during the boot storm.
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarm.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + KioskGuard.settleDelayMs(),
                pending
            )
            Log.i(TAG, "Kiosk auto-launch scheduled after boot settle window.")
        } catch (e: Exception) {
            // An uncaught throw here kills the process. As the HOME app that makes the
            // system relaunch us immediately, which is the loop we are trying to break.
            Log.e(TAG, "Boot launch scheduling failed: ${e.message}")
        }
    }

    private fun isDefaultHome(context: Context): Boolean = try {
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val resolved = context.packageManager
            .resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)
        resolved?.activityInfo?.packageName == context.packageName
    } catch (e: Exception) {
        false
    }
}

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.digiads.tabletop/performance"
    private val VIDEO_CHANNEL = "com.digiads.tabletop/native_video"
    private var methodChannel: MethodChannel? = null
    private var kioskActive = true
    private var isCircuitBreakerTripped = false
    private var policiesApplied = false
    private var lockTaskAttempts = 0

    private val mainHandler = Handler(Looper.getMainLooper())

    // Held as fields so kiosk policy callbacks can be cancelled individually. Cancelling
    // the whole queue would also drop [healthyRunnable] and leave the boot-guard counter
    // elevated, which would falsely trip Safe Mode on a later boot.
    private val lockTaskRunnable = Runnable { applyLockTaskPolicies() }
    private val statusBarRunnable = Runnable { applyStatusBarPolicy() }
    private val healthyRunnable = Runnable { KioskGuard.markHealthy(this) }

    companion object {
        var activeVideoView: NativeVideoView? = null

        /** Read by the video view: when true, no decoder is created at all. */
        @Volatile
        var safeMode: Boolean = false
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        try {
            Process.setThreadPriority(Process.THREAD_PRIORITY_DISPLAY)
        } catch (e: Exception) {
            Log.w(TAG, "Could not set thread priority: ${e.message}")
        }

        evaluateBootGuard()

        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VIDEO_CHANNEL)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getThreadPriority" -> result.success(Process.getThreadPriority(Process.myTid()))

                    "isCircuitBreakerTripped" -> result.success(isCircuitBreakerTripped)

                    "resetCircuitBreaker" -> {
                        KioskGuard.reset(this)
                        isCircuitBreakerTripped = false
                        safeMode = false
                        result.success(true)
                    }

                    "startKioskMode" -> {
                        try {
                            if (isCircuitBreakerTripped) {
                                // Safe Mode: refuse to lock down a device that is
                                // already failing, so it stays recoverable on-site.
                                result.success(false)
                            } else {
                                kioskActive = true
                                lockTaskAttempts = 0
                                scheduleKioskPolicies()
                                result.success(true)
                            }
                        } catch (e: Exception) {
                            result.error("LOCK_TASK_ERROR", e.message, null)
                        }
                    }

                    "stopKioskMode" -> {
                        try {
                            kioskActive = false
                            // Cancel only the kiosk policy callbacks; healthyRunnable must
                            // still fire so the boot-guard counter gets cleared.
                            mainHandler.removeCallbacks(lockTaskRunnable)
                            mainHandler.removeCallbacks(statusBarRunnable)
                            stopLockTask()
                            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                            val admin = ComponentName(this, KioskAdminReceiver::class.java)
                            if (dpm.isDeviceOwnerApp(packageName)) {
                                dpm.setStatusBarDisabled(admin, false)
                            }
                            showSystemUI()
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("LOCK_TASK_ERROR", e.message, null)
                        }
                    }

                    "openAndroidSettings" -> {
                        try {
                            startActivity(
                                Intent(android.provider.Settings.ACTION_SETTINGS)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            )
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("SETTINGS_ERROR", e.message, null)
                        }
                    }

                    // Field recovery for kiosks with no USB port: releases Device Owner
                    // so the unit can be re-provisioned or reset without a cable.
                    "clearDeviceOwner" -> {
                        try {
                            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                            if (dpm.isDeviceOwnerApp(packageName)) {
                                kioskActive = false
                                try {
                                    stopLockTask()
                                } catch (e: Exception) {
                                    Log.w(TAG, "stopLockTask during release: ${e.message}")
                                }
                                dpm.clearDeviceOwnerApp(packageName)
                                showSystemUI()
                                result.success(true)
                            } else {
                                result.success(false)
                            }
                        } catch (e: Exception) {
                            result.error("CLEAR_OWNER_ERROR", e.message, null)
                        }
                    }

                    else -> result.notImplemented()
                }
            }

        flutterEngine.platformViewsController.registry.registerViewFactory(
            "native_video_view",
            NativeVideoViewFactory(methodChannel)
        )

        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "setPlaylist" -> {
                    val paths = call.argument<List<String>>("paths") ?: emptyList()
                    val index = call.argument<Int>("currentIndex") ?: 0
                    activeVideoView?.setPlaylist(paths, index)
                    result.success(null)
                }
                "play" -> {
                    activeVideoView?.play()
                    result.success(null)
                }
                "pause" -> {
                    activeVideoView?.pause()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        if (!isCircuitBreakerTripped) {
            scheduleKioskPolicies()
        }
    }

    // ────────────────── Boot guard ──────────────────

    private fun evaluateBootGuard() {
        val starts = KioskGuard.registerStart(this)
        isCircuitBreakerTripped = starts >= KioskGuard.MAX_UNHEALTHY_STARTS
        safeMode = isCircuitBreakerTripped
        kioskActive = !isCircuitBreakerTripped

        if (isCircuitBreakerTripped) {
            Log.e(
                TAG,
                "SAFE MODE ENGAGED — $starts consecutive starts never reached a healthy " +
                    "runtime. Kiosk lockdown, status-bar policy and native video are disabled " +
                    "so the device can be recovered on-site."
            )
        } else {
            Log.i(TAG, "Boot guard: unhealthy start counter = $starts")
        }

        // Cleared only if the process is still alive after HEALTHY_RUN_MS. A device in a
        // reboot loop is killed long before this fires, so the counter keeps climbing.
        mainHandler.removeCallbacks(healthyRunnable)
        mainHandler.postDelayed(healthyRunnable, KioskGuard.HEALTHY_RUN_MS)
    }

    // ────────────────── Kiosk policies ──────────────────

    /**
     * LockTask is engaged promptly (it is cheap and does not touch the GPU), while the
     * status-bar policy — which forces a SystemUI relayout and can take SystemUI down
     * mid-boot — is held back until the device has settled.
     */
    private fun scheduleKioskPolicies() {
        if (isCircuitBreakerTripped) {
            showSystemUI()
            return
        }

        mainHandler.removeCallbacks(lockTaskRunnable)
        mainHandler.removeCallbacks(statusBarRunnable)
        mainHandler.postDelayed(lockTaskRunnable, 1_500L)

        val settle = KioskGuard.settleDelayMs()
        if (KioskGuard.isColdBootLaunch()) {
            Log.i(TAG, "Cold boot detected — deferring status-bar policy by ${settle}ms")
        }
        mainHandler.postDelayed(statusBarRunnable, settle)
    }

    private fun applyLockTaskPolicies() {
        if (isCircuitBreakerTripped || isFinishing) return
        policiesApplied = true
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val admin = ComponentName(this, KioskAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setLockTaskPackages(admin, arrayOf(packageName))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Lock task policy setup failed: ${e.message}")
        }
        hideSystemUI()
        if (kioskActive) enterLockTask()
    }

    private fun applyStatusBarPolicy() {
        if (isCircuitBreakerTripped || isFinishing || !kioskActive) return
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val admin = ComponentName(this, KioskAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setStatusBarDisabled(admin, true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Status bar policy failed: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        if (isCircuitBreakerTripped) {
            showSystemUI()
            return
        }
        // Do nothing until the deferred boot policies have run, otherwise resume would
        // pull LockTask and SystemUI work straight back into the boot danger window.
        if (!policiesApplied) return
        hideSystemUI()
        if (kioskActive) enterLockTask()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) return
        if (isCircuitBreakerTripped) showSystemUI() else if (policiesApplied) hideSystemUI()
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(lockTaskRunnable)
        mainHandler.removeCallbacks(statusBarRunnable)
        // If the activity survived long enough to be torn down cleanly rather than
        // taken out by a watchdog reboot, credit the run before dropping the callback.
        if (SystemClock.elapsedRealtime() > KioskGuard.BOOT_SETTLE_MS) {
            KioskGuard.markHealthy(this)
        }
        mainHandler.removeCallbacks(healthyRunnable)
        activeVideoView = null
        super.onDestroy()
    }

    private fun enterLockTask() {
        if (isCircuitBreakerTripped) return
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            if (!dpm.isDeviceOwnerApp(packageName)) return
            if (isInLockTaskMode()) {
                lockTaskAttempts = 0
                return
            }
            // Bounded retries: an unbounded startLockTask() loop against a system_server
            // that keeps rejecting it is itself a way to bring the platform down.
            if (lockTaskAttempts >= 8) return
            lockTaskAttempts++
            startLockTask()
        } catch (e: Exception) {
            Log.e(TAG, "startLockTask failed: ${e.message}")
        }
    }

    private fun isInLockTaskMode(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
        } else {
            @Suppress("DEPRECATION")
            am.isInLockTaskMode
        }
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
                    android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
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

    private fun showSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
            window.insetsController?.show(
                android.view.WindowInsets.Type.statusBars() or
                    android.view.WindowInsets.Type.navigationBars()
            )
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }
}

/**
 * Ad video surface.
 *
 * Android 8.1 / RK3326 path uses a single [TextureView] + [MediaPlayer].
 * [VideoView] is a [android.view.SurfaceView], and a SurfaceView hosted inside a Flutter
 * AndroidView forces the platform view out of texture composition and into a real
 * hardware overlay layer. On the Mali-G31 with the Android 8.1 HWC2On1Adapter shim that
 * is what produced "Validate was called more than once!", the BufferQueueProducer
 * disconnect and the SurfaceFlinger death that reboots the device. A TextureView is
 * composited as an ordinary GL texture, so no extra HWC layer is ever created.
 *
 * Android 11+ keeps the original dual-VideoView crossfade, which is known good there.
 */
class NativeVideoView(
    context: Context,
    id: Int,
    creationParams: Map<String, Any?>?,
    private val methodChannel: MethodChannel?
) : PlatformView, FrameLayout(context) {

    private val isLegacyAndroid = Build.VERSION.SDK_INT <= Build.VERSION_CODES.O_MR1

    // Legacy (API <= 27) pipeline
    private val textureView: TextureView? = if (isLegacyAndroid) TextureView(context) else null
    private var mediaPlayer: MediaPlayer? = null
    private var surface: Surface? = null
    private var surfaceReady = false

    // Modern (API >= 28) pipeline with full-bleed center-crop onMeasure override
    private fun createFullBleedVideoView(): VideoView {
        return object : VideoView(context) {
            override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
                val width = MeasureSpec.getSize(widthMeasureSpec)
                val height = MeasureSpec.getSize(heightMeasureSpec)
                setMeasuredDimension(width, height)
            }
        }
    }

    private val playerA: VideoView? = if (!isLegacyAndroid) createFullBleedVideoView() else null
    private val playerB: VideoView? = if (!isLegacyAndroid) createFullBleedVideoView() else null

    private val handler = Handler(Looper.getMainLooper())

    private var playlist: List<String> = emptyList()
    private var currentIndex = 0
    private var activePlayerIndex = 0
    private var isPlaying = true
    private var disposed = false
    private var attached = false

    private var consecutiveFailures = 0
    private var videoWidth = 0
    private var videoHeight = 0

    private val prepareWatchdog = Runnable {
        Log.w(TAG, "Decoder did not prepare in time — skipping to next ad.")
        onPlaybackFailed("prepare-timeout")
    }

    init {
        // Exactly one live native player. RK3326 exposes a single hardware AVC decoder
        // instance; a leaked second one is fatal to the media stack.
        MainActivity.activeVideoView?.let { if (it !== this) it.dispose() }
        MainActivity.activeVideoView = this

        setBackgroundColor(Color.BLACK)

        playlist = (creationParams?.get("paths") as? List<String>) ?: emptyList()
        val initialIndex = (creationParams?.get("initialIndex") as? Int) ?: 0
        currentIndex = if (initialIndex >= 0 && initialIndex < playlist.size) initialIndex else 0

        if (MainActivity.safeMode) {
            // Safe Mode: never allocate a decoder or attach a video surface. The view
            // stays a plain black frame so the device remains recoverable on-site.
            Log.w(TAG, "Safe Mode — native video surface suppressed for recovery.")
        } else if (KioskGuard.isColdBootLaunch()) {
            val delay = KioskGuard.settleDelayMs()
            Log.i(TAG, "Cold boot — delaying video surface attach by ${delay}ms")
            handler.postDelayed({ attachSurfaces() }, delay)
        } else {
            attachSurfaces()
        }
    }

    private fun attachSurfaces() {
        if (disposed || attached) return
        attached = true

        val params = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)

        if (isLegacyAndroid) {
            val tv = textureView ?: return
            tv.layoutParams = params
            tv.isOpaque = true
            tv.isClickable = false
            tv.isFocusable = false
            tv.isFocusableInTouchMode = false
            tv.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
                override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
                    surface = Surface(st)
                    surfaceReady = true
                    if (isPlaying && playlist.isNotEmpty()) playCurrent()
                }

                override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {
                    applyFitCenter()
                }

                override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
                    surfaceReady = false
                    releasePlayer()
                    surface?.release()
                    surface = null
                    return true
                }

                override fun onSurfaceTextureUpdated(st: SurfaceTexture) = Unit
            }
            addView(tv)
            return
        }

        val a = playerA ?: return
        a.layoutParams = params
        a.setZOrderMediaOverlay(true)
        a.isClickable = false
        a.isFocusable = false
        a.isFocusableInTouchMode = false
        addView(a)
        a.visibility = View.VISIBLE

        playerB?.let { b ->
            b.layoutParams = params
            b.setZOrderMediaOverlay(true)
            b.isClickable = false
            b.isFocusable = false
            b.isFocusableInTouchMode = false
            addView(b)
            b.visibility = View.GONE
        }

        if (playlist.isNotEmpty()) {
            if (isPlaying) playCurrent() else preloadCurrentOnly()
        }
    }

    override fun getView(): View = this

    // ────────────────── Public API (called from Dart) ──────────────────

    fun setPlaylist(paths: List<String>, initialIndex: Int = 0) {
        if (disposed) return

        val oldSource = playlist.getOrNull(currentIndex)
        playlist = paths

        if (playlist.isEmpty()) {
            stopAll()
            return
        }

        val newIndex = if (oldSource != null) playlist.indexOf(oldSource) else -1
        if (newIndex >= 0) {
            // Currently playing item survived the update — do not restart it.
            currentIndex = newIndex
            if (!isLegacyAndroid && attached) preloadNext()
            return
        }

        currentIndex = if (initialIndex >= 0 && initialIndex < playlist.size) initialIndex else 0
        consecutiveFailures = 0
        if (!attached) return
        if (isPlaying) playCurrent() else preloadCurrentOnly()
    }

    fun play() {
        if (disposed) return
        isPlaying = true
        if (!attached) return

        if (isLegacyAndroid) {
            val mp = mediaPlayer
            if (mp != null) {
                try {
                    if (!mp.isPlaying) mp.start()
                    return
                } catch (e: IllegalStateException) {
                    Log.w(TAG, "start() on stale player: ${e.message}")
                }
            }
            playCurrent()
            return
        }

        val active = getActivePlayer() ?: return
        if (active.isPlaying) return
        if (active.duration <= 0) playCurrent() else {
            active.start()
            preloadNext()
        }
    }

    fun pause() {
        isPlaying = false
        handler.removeCallbacks(prepareWatchdog)
        if (isLegacyAndroid) {
            try {
                mediaPlayer?.let { if (it.isPlaying) it.pause() }
            } catch (e: IllegalStateException) {
                Log.w(TAG, "pause() on stale player: ${e.message}")
            }
            return
        }
        playerA?.pause()
        playerB?.pause()
    }

    // ────────────────── Playback ──────────────────

    private fun playCurrent() {
        if (disposed || !attached) return
        if (playlist.isEmpty() || currentIndex < 0 || currentIndex >= playlist.size) return
        if (isLegacyAndroid) playCurrentLegacy() else playCurrentModern()
    }

    private fun playCurrentLegacy() {
        val target = surface
        if (!surfaceReady || target == null) return

        val path = playlist[currentIndex]

        try {
            var mp = mediaPlayer
            if (mp == null) {
                mp = MediaPlayer()
                mediaPlayer = mp
            } else {
                try {
                    mp.reset()
                } catch (e: Exception) {
                    mp.release()
                    mp = MediaPlayer()
                    mediaPlayer = mp
                }
            }

            mp.setSurface(target)
            applyDataSource(mp, path)
            mp.isLooping = false

            mp.setOnVideoSizeChangedListener { _, w, h ->
                videoWidth = w
                videoHeight = h
                applyFitCenter()
            }
            mp.setOnPreparedListener { player ->
                handler.removeCallbacks(prepareWatchdog)
                consecutiveFailures = 0
                applyFitCenter()
                if (isPlaying && !disposed) {
                    try {
                        player.start()
                    } catch (e: IllegalStateException) {
                        onPlaybackFailed("start:${e.message}")
                    }
                }
            }
            mp.setOnCompletionListener {
                handler.removeCallbacks(prepareWatchdog)
                methodChannel?.invokeMethod(
                    "onVideoComplete",
                    mapOf("path" to playlist.getOrNull(currentIndex))
                )
                if (isPlaying && !disposed) {
                    advanceIndex()
                    playCurrent()
                }
            }
            mp.setOnErrorListener { _, what, extra ->
                onPlaybackFailed("what=$what extra=$extra")
                true
            }

            handler.removeCallbacks(prepareWatchdog)
            handler.postDelayed(prepareWatchdog, 10_000L)
            mp.prepareAsync()
        } catch (e: Exception) {
            onPlaybackFailed("setup:${e.message}")
        }
    }

    private fun applyDataSource(mp: MediaPlayer, path: String) {
        val uri = Uri.parse(path)
        if (uri.scheme.isNullOrEmpty()) {
            mp.setDataSource(path)
        } else {
            mp.setDataSource(context, uri)
        }
    }

    /** Scale video to fill 100% of TextureView without black/green side bars (BoxFit.cover math). */
    private fun applyFitCenter() {
        val tv = textureView ?: return
        val vw = videoWidth
        val vh = videoHeight
        if (vw <= 0 || vh <= 0 || tv.width <= 0 || tv.height <= 0) return

        val scale = kotlin.math.max(tv.width.toFloat() / vw, tv.height.toFloat() / vh)
        val drawnW = vw * scale
        val drawnH = vh * scale

        val m = Matrix()
        m.setScale(drawnW / tv.width, drawnH / tv.height)
        m.postTranslate((tv.width - drawnW) / 2f, (tv.height - drawnH) / 2f)
        tv.setTransform(m)
        tv.invalidate()
    }

    /**
     * Backs off instead of recursing. The previous handler advanced and immediately
     * replayed on every error, so a playlist of unreadable files became a tight decoder
     * allocation loop — a reliable way to take the media stack (and the device) down.
     */
    private fun onPlaybackFailed(reason: String) {
        handler.removeCallbacks(prepareWatchdog)
        Log.w(TAG, "Playback failed [$reason] on ${playlist.getOrNull(currentIndex)}")
        methodChannel?.invokeMethod(
            "onVideoError",
            mapOf("path" to playlist.getOrNull(currentIndex), "error" to reason)
        )
        releasePlayer()

        if (disposed || !isPlaying) return

        consecutiveFailures++
        advanceIndex()

        if (playlist.isEmpty()) return

        if (consecutiveFailures >= playlist.size) {
            // Every item failed once. Stop hammering the decoder and retry slowly.
            consecutiveFailures = 0
            handler.postDelayed({ if (!disposed && isPlaying) playCurrent() }, 15_000L)
            return
        }
        handler.postDelayed({ if (!disposed && isPlaying) playCurrent() }, 400L)
    }

    private fun releasePlayer() {
        handler.removeCallbacks(prepareWatchdog)
        mediaPlayer?.let { mp ->
            try {
                mp.setOnPreparedListener(null)
                mp.setOnCompletionListener(null)
                mp.setOnErrorListener(null)
                mp.setOnVideoSizeChangedListener(null)
                if (mp.isPlaying) mp.stop()
            } catch (e: Exception) {
                Log.w(TAG, "MediaPlayer teardown: ${e.message}")
            }
            try {
                mp.reset()
                mp.release()
            } catch (e: Exception) {
                Log.w(TAG, "MediaPlayer release: ${e.message}")
            }
        }
        mediaPlayer = null
    }

    // ────────────────── Modern (API >= 28) dual-player path ──────────────────

    private fun getActivePlayer(): VideoView? =
        if (activePlayerIndex == 0) playerA else playerB

    private fun getBackgroundPlayer(): VideoView? =
        if (activePlayerIndex == 0) playerB else playerA

    private fun playCurrentModern() {
        val path = playlist[currentIndex]
        val active = getActivePlayer() ?: return
        val background = getBackgroundPlayer()

        active.visibility = View.VISIBLE
        background?.visibility = View.GONE

        active.setVideoURI(Uri.parse(path))
        active.setOnPreparedListener { mp ->
            mp.isLooping = false
            try {
                mp.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING)
            } catch (e: Exception) {
                Log.w(TAG, "Could not set VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING: ${e.message}")
            }
            consecutiveFailures = 0
            if (isPlaying) {
                active.start()
                preloadNext()
            }
        }
        active.setOnCompletionListener {
            methodChannel?.invokeMethod(
                "onVideoComplete",
                mapOf("path" to playlist.getOrNull(currentIndex))
            )
            if (isPlaying) swapPlayers()
        }
        active.setOnErrorListener { _, what, extra ->
            onPlaybackFailed("what=$what extra=$extra")
            true
        }
    }

    private fun preloadCurrentOnly() {
        if (isLegacyAndroid || !attached) return
        if (playlist.isEmpty() || currentIndex < 0 || currentIndex >= playlist.size) return
        val active = getActivePlayer() ?: return
        active.setVideoURI(Uri.parse(playlist[currentIndex]))
        active.setOnPreparedListener { mp ->
            mp.isLooping = false
            try {
                mp.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING)
            } catch (e: Exception) {}
        }
    }

    private fun preloadNext() {
        if (isLegacyAndroid || !attached) return
        val background = getBackgroundPlayer() ?: return
        if (playlist.isEmpty()) return
        val nextPath = playlist[(currentIndex + 1) % playlist.size]
        background.setVideoURI(Uri.parse(nextPath))
        background.setOnPreparedListener { mp ->
            mp.isLooping = false
            try {
                mp.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING)
            } catch (e: Exception) {}
        }
    }

    private fun swapPlayers() {
        val active = getActivePlayer() ?: return
        val background = getBackgroundPlayer() ?: return

        background.visibility = View.VISIBLE
        active.visibility = View.GONE
        background.start()

        activePlayerIndex = 1 - activePlayerIndex
        currentIndex = (currentIndex + 1) % playlist.size

        val currentPath = playlist[currentIndex]
        background.setOnCompletionListener {
            methodChannel?.invokeMethod("onVideoComplete", mapOf("path" to currentPath))
            if (isPlaying) swapPlayers()
        }
        background.setOnErrorListener { _, what, extra ->
            onPlaybackFailed("what=$what extra=$extra")
            true
        }

        active.stopPlayback()
        preloadNext()
    }

    // ────────────────── Lifecycle ──────────────────

    private fun advanceIndex() {
        if (playlist.isNotEmpty()) {
            currentIndex = (currentIndex + 1) % playlist.size
        }
    }

    private fun stopAll() {
        handler.removeCallbacks(prepareWatchdog)
        if (isLegacyAndroid) {
            releasePlayer()
        } else {
            playerA?.stopPlayback()
            playerB?.stopPlayback()
            playerA?.visibility = View.VISIBLE
            playerB?.visibility = View.GONE
        }
        activePlayerIndex = 0
        currentIndex = 0
    }

    override fun dispose() {
        if (disposed) return
        disposed = true
        handler.removeCallbacksAndMessages(null)
        stopAll()
        surface?.release()
        surface = null
        surfaceReady = false
        textureView?.surfaceTextureListener = null
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
