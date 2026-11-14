package com.vukasinknezevic.mydayai

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Health Connect, read only, and only Steps and Sleep. Every method resolves or rejects; nothing
 * throws into the web view. Reject codes: UNAVAILABLE, DENIED, FAILED.
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val needed = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )

    private fun available() =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun run(call: PluginCall, block: suspend (HealthConnectClient) -> Unit) {
        if (!available()) return call.reject("Health Connect is not available", "UNAVAILABLE")
        scope.launch {
            try {
                block(HealthConnectClient.getOrCreate(context))
            } catch (e: SecurityException) {
                call.reject(e.message ?: "permission", "DENIED")
            } catch (e: Exception) {
                call.reject(e.message ?: "failed", "FAILED")
            }
        }
    }

    private suspend fun state(client: HealthConnectClient): JSObject {
        val granted = client.permissionController.getGrantedPermissions()
        return JSObject()
            .put("steps", granted.contains(HealthPermission.getReadPermission(StepsRecord::class)))
            .put("sleep", granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val status = when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update-required"
            else -> "unavailable"
        }
        call.resolve(JSObject().put("status", status))
    }

    @PluginMethod
    fun getPermissions(call: PluginCall) = run(call) { call.resolve(state(it)) }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (!available()) return call.reject("Health Connect is not available", "UNAVAILABLE")
        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(context, needed)
        startActivityForResult(call, intent, "onPermissionsResult")
    }

    @ActivityCallback
    private fun onPermissionsResult(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (call == null) return
        run(call) { call.resolve(state(it)) }
    }

    @PluginMethod
    fun getDailySteps(call: PluginCall) = run(call) { client ->
        val day = LocalDate.parse(call.getString("date") ?: return@run call.reject("date", "FAILED"))
        val origin = call.getString("origin")
        // the aggregate de-duplicates between apps (unlike a sum of raw records)
        val response = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(day.atStartOfDay(), day.plusDays(1).atStartOfDay()),
                dataOriginFilter = if (origin.isNullOrEmpty()) emptySet() else setOf(DataOrigin(origin)),
            )
        )
        call.resolve(JSObject().put("count", response[StepsRecord.COUNT_TOTAL] ?: 0L))
    }

    @PluginMethod
    fun getSleepSessions(call: PluginCall) = run(call) { client ->
        val from = Instant.ofEpochMilli(call.getLong("from") ?: return@run call.reject("from", "FAILED"))
        val to = Instant.ofEpochMilli(call.getLong("to") ?: return@run call.reject("to", "FAILED"))
        val origin = call.getString("origin")
        val out = JSArray()
        val records = client.readRecords(
            ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(from, to),
                dataOriginFilter = if (origin.isNullOrEmpty()) emptySet() else setOf(DataOrigin(origin)),
            )
        ).records
        for (r in records) {
            out.put(
                JSObject()
                    .put("id", r.metadata.id)
                    .put("start", r.startTime.toEpochMilli())
                    .put("end", r.endTime.toEpochMilli())
                    .put("origin", r.metadata.dataOrigin.packageName)
            )
        }
        call.resolve(JSObject().put("sessions", out))
    }

    @PluginMethod
    fun listDataOrigins(call: PluginCall) = run(call) { client ->
        val to = Instant.now()
        val from = to.minusSeconds(30L * 24 * 3600)
        val names = sortedSetOf<String>()
        client.readRecords(
            ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(from, to))
        ).records.forEach { names.add(it.metadata.dataOrigin.packageName) }
        client.readRecords(
            ReadRecordsRequest(StepsRecord::class, TimeRangeFilter.between(from, to), pageSize = 1000)
        ).records.forEach { names.add(it.metadata.dataOrigin.packageName) }
        val out = JSArray()
        names.forEach { out.put(it) }
        call.resolve(JSObject().put("origins", out))
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "failed", "UNAVAILABLE")
        }
    }
}
