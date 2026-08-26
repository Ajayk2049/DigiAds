package com.digiads.screen

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import android.util.Log

private const val TAG = "DigiAdsScreenBoot"

/**
 * Fallback cold-boot launcher.
 *
 * When the app is the resolved default HOME activity, Android already starts it at boot.
 * Starting it a second time from here creates a duplicate FlutterEngine / video surface
 * fighting for the GPU/VPU during the boot storm. The receiver is only a fallback for
 * devices where the app has NOT been made the default launcher, and it defers past the boot storm.
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
                Log.w(TAG, "Android safe mode — skipping screen auto-launch.")
                return
            }

            if (KioskGuard.isTripped(context)) {
                Log.e(TAG, "Boot guard tripped — skipping screen auto-launch for recovery.")
                return
            }

            // CRITICAL: If the app is already the default HOME launcher, Android already launched it.
            // Spawning another activity creates duplicate Flutter engines and freezes the GPU.
            if (isDefaultHome(context)) {
                Log.i(TAG, "App is the default HOME activity — system handles boot launch natively. Skipping duplicate launch.")
                return
            }

            val launch = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            var flags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags = flags or PendingIntent.FLAG_IMMUTABLE
            }
            val pending = PendingIntent.getActivity(context, 0, launch, flags)

            val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarm.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + KioskGuard.settleDelayMs(),
                pending
            )
            Log.i(TAG, "Screen auto-launch scheduled after boot settle window.")
        } catch (e: Exception) {
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
