package com.vukasinknezevic.mydayai

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Health Connect opens this from "Privacy policy" (ACTION_SHOW_PERMISSIONS_RATIONALE and
 * VIEW_PERMISSION_USAGE). It only forwards to the app's own Privacy screen and closes.
 */
class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse("mydayai://privacy"))
                .setPackage(packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        finish()
    }
}
