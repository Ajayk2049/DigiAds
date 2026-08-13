package com.digiads.tabletop

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.io.File
import java.io.FileInputStream

class KioskUpdater(private val context: Context) {

    companion object {
        private const val TAG = "KioskUpdater"
        private const val ACTION_INSTALL_COMPLETE = "com.digiads.tabletop.INSTALL_COMPLETE"
    }

    fun installApk(apkPath: String): Boolean {
        val apkFile = File(apkPath)
        if (!apkFile.exists() || !apkFile.canRead()) {
            Log.e(TAG, "APK file does not exist or is unreadable: $apkPath")
            return false
        }

        return try {
            val packageInstaller = context.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            params.setAppPackageName(context.packageName)

            val sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            val out = session.openWrite("KioskOTAStream", 0, apkFile.length())
            FileInputStream(apkFile).use { input ->
                input.copyTo(out)
            }
            session.fsync(out)
            out.close()

            val intent = Intent(context, InstallReceiver::class.java).apply {
                action = ACTION_INSTALL_COMPLETE
            }
            
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                sessionId,
                intent,
                flags
            )

            session.commit(pendingIntent.intentSender)
            session.close()
            Log.i(TAG, "PackageInstaller session $sessionId committed silently.")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute silent PackageInstaller session: ${e.message}", e)
            false
        }
    }

    class InstallReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val status = intent?.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
            val message = intent?.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
            Log.i(TAG, "Installation broadcast status: $status, message: $message")

            if (status == PackageInstaller.STATUS_SUCCESS && context != null) {
                Log.i(TAG, "OTA Update succeeded! Scheduling MainActivity launch...")
                Handler(Looper.getMainLooper()).postDelayed({
                    try {
                        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        }
                        if (launchIntent != null) {
                            context.startActivity(launchIntent)
                        } else {
                            val mainIntent = Intent(context, MainActivity::class.java).apply {
                                action = Intent.ACTION_MAIN
                                addCategory(Intent.CATEGORY_LAUNCHER)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            context.startActivity(mainIntent)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to relaunch MainActivity post-update: ${e.message}", e)
                    }
                }, 800)
            } else {
                Log.e(TAG, "PackageInstaller failed with status $status: $message")
            }
        }
    }
}
