package com.codesurfer.mobileide;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.hardware.usb.UsbManager;
import android.os.Bundle;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.util.List;

public class USBStorageModule extends ReactContextBaseJavaModule {

    private static final String TAG = "USBStorageModule";
    private static final String USB_EVENT = "USBStateChanged";
    
    private BroadcastReceiver usbReceiver;
    private boolean receiverRegistered = false;

    public USBStorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        registerUSBReceiver();
    }

    private void registerUSBReceiver() {
        if (receiverRegistered) return;
        
        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (action == null) return;
                
                WritableMap params = Arguments.createMap();
                
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    params.putBoolean("connected", true);
                    params.putString("action", "attached");
                    sendEvent(USB_EVENT, params);
                    Log.i(TAG, "USB device attached");
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    params.putBoolean("connected", false);
                    params.putString("action", "detached");
                    sendEvent(USB_EVENT, params);
                    Log.i(TAG, "USB device detached");
                }
            }
        };
        
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        
        try {
            getReactApplicationContext().registerReceiver(usbReceiver, filter);
            receiverRegistered = true;
            Log.i(TAG, "USB receiver registered");
        } catch (Exception e) {
            Log.w(TAG, "Failed to register USB receiver", e);
        }
    }
    
    private void sendEvent(String eventName, WritableMap params) {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.w(TAG, "Failed to send event: " + eventName, e);
        }
    }
    
    @ReactMethod
    public void startUSBMonitoring(Promise promise) {
        registerUSBReceiver();
        promise.resolve(true);
    }
    
    @ReactMethod
    public void stopUSBMonitoring(Promise promise) {
        if (receiverRegistered && usbReceiver != null) {
            try {
                getReactApplicationContext().unregisterReceiver(usbReceiver);
                receiverRegistered = false;
            } catch (Exception e) {
                Log.w(TAG, "Failed to unregister USB receiver", e);
            }
        }
        promise.resolve(true);
    }

    @Override
    public String getName() {
        return "USBStorageModule";
    }

    @ReactMethod
    public void getUSBDevices(Promise promise) {
        try {
            WritableArray devices = Arguments.createArray();
            Context context = getReactApplicationContext();

            StorageManager storageManager = (StorageManager) context.getSystemService(Context.STORAGE_SERVICE);
            List<StorageVolume> volumes = storageManager.getStorageVolumes();

            for (StorageVolume volume : volumes) {
                String state = volume.getState();
                if (!"mounted".equals(state)) continue;

                boolean isRemovable = false;
                try {
                    java.lang.reflect.Method isRemovableMethod = StorageVolume.class.getMethod("isRemovable");
                    isRemovable = (boolean) isRemovableMethod.invoke(volume);
                } catch (Exception e) {
                    // Fallback: assume removable if not the primary internal storage
                    isRemovable = !"primary_internal".equals(getVolumeDescription(volume));
                }

                if (!isRemovable) continue;

                String path = getVolumePath(volume, context);
                if (path == null) continue;

                WritableMap device = Arguments.createMap();
                device.putString("path", path);
                device.putString("state", state);
                device.putString("description", getVolumeDescription(volume));
                device.putBoolean("removable", true);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    device.putBoolean("isEmulated", volume.isEmulated());
                }

                devices.pushMap(device);
            }

            // Also check /mnt and /storage for OTG paths
            checkAdditionalMountPaths(devices);

            promise.resolve(devices);
        } catch (Exception e) {
            Log.e(TAG, "getUSBDevices failed", e);
            promise.reject("USB_ERROR", "Failed to get USB devices: " + e.getMessage());
        }
    }

    private String getVolumePath(StorageVolume volume, Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                File dir = volume.getDirectory();
                if (dir != null) return dir.getAbsolutePath();
            }

            // Fallback for older APIs
            java.lang.reflect.Method getPathMethod = StorageVolume.class.getMethod("getPath");
            String path = (String) getPathMethod.invoke(volume);
            if (path != null) return path;

            // Try getPathFile
            java.lang.reflect.Method getPathFileMethod = StorageVolume.class.getMethod("getPathFile");
            File file = (File) getPathFileMethod.invoke(volume);
            if (file != null) return file.getAbsolutePath();
        } catch (Exception e) {
            Log.w(TAG, "getVolumePath fallback failed", e);
        }
        return null;
    }

    private String getVolumeDescription(StorageVolume volume) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                return volume.getDescription(getReactApplicationContext());
            }
            java.lang.reflect.Method getDescMethod = StorageVolume.class.getMethod("getDescription", Context.class);
            return (String) getDescMethod.invoke(volume, getReactApplicationContext());
        } catch (Exception e) {
            return "USB Storage";
        }
    }

    private void checkAdditionalMountPaths(WritableArray devices) {
        String[] possiblePaths = {
            "/mnt/usb", "/mnt/otg", "/mnt/media_rw",
            "/storage/usb", "/storage/otg",
        };

        for (String pathStr : possiblePaths) {
            File path = new File(pathStr);
            if (path.exists() && path.isDirectory() && path.canRead()) {
                File[] children = path.listFiles();
                if (children != null) {
                    for (File child : children) {
                        if (child.isDirectory() && child.canRead()) {
                            WritableMap d = Arguments.createMap();
                            d.putString("path", child.getAbsolutePath());
                            d.putString("state", "mounted");
                            d.putString("description", "USB OTG");
                            d.putBoolean("removable", true);
                            d.putBoolean("isEmulated", false);
                            devices.pushMap(d);
                        }
                    }
                }
            }
        }

        // Check /storage for any non-primary mounted volumes
        File storageDir = new File("/storage");
        if (storageDir.exists() && storageDir.isDirectory()) {
            File[] children = storageDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    String name = child.getName();
                    if (child.isDirectory() && child.canRead()
                            && !name.equals("emulated") && !name.equals("self")) {
                        // Check if already in the list
                        boolean alreadyListed = false;
                        for (int i = 0; i < devices.size(); i++) {
                            if (devices.getMap(i).getString("path").equals(child.getAbsolutePath())) {
                                alreadyListed = true;
                                break;
                            }
                        }
                        if (!alreadyListed) {
                            WritableMap d = Arguments.createMap();
                            d.putString("path", child.getAbsolutePath());
                            d.putString("state", "mounted");
                            d.putString("description", "External Storage");
                            d.putBoolean("removable", true);
                            d.putBoolean("isEmulated", false);
                            devices.pushMap(d);
                        }
                    }
                }
            }
        }
    }

    @ReactMethod
    public void ensureDirectory(String path, Promise promise) {
        try {
            File dir = new File(path);
            if (!dir.exists()) {
                boolean created = dir.mkdirs();
                if (!created) {
                    promise.reject("DIR_ERROR", "Failed to create directory: " + path);
                    return;
                }
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("DIR_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void listFiles(String path, Promise promise) {
        try {
            File dir = new File(path);
            if (!dir.exists() || !dir.isDirectory()) {
                promise.resolve(Arguments.createArray());
                return;
            }

            File[] files = dir.listFiles();
            WritableArray result = Arguments.createArray();

            if (files != null) {
                for (File file : files) {
                    WritableMap fileMap = Arguments.createMap();
                    fileMap.putString("name", file.getName());
                    fileMap.putString("path", file.getAbsolutePath());
                    fileMap.putBoolean("isDirectory", file.isDirectory());
                    fileMap.putDouble("size", file.length());
                    fileMap.putDouble("lastModified", file.lastModified());
                    result.pushMap(fileMap);
                }
            }

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "listFiles failed", e);
            promise.reject("LIST_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readFile(String path, Promise promise) {
        try {
            File file = new File(path);
            if (!file.exists() || !file.isFile()) {
                promise.reject("FILE_ERROR", "File not found: " + path);
                return;
            }

            FileInputStream fis = new FileInputStream(file);
            byte[] buffer = new byte[(int) Math.min(file.length(), 10 * 1024 * 1024)];
            int bytesRead = fis.read(buffer);
            fis.close();

            String content = new String(buffer, 0, bytesRead > 0 ? bytesRead : 0, "UTF-8");
            promise.resolve(content);
        } catch (Exception e) {
            Log.e(TAG, "readFile failed", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void writeFile(String path, String content, Promise promise) {
        try {
            File file = new File(path);
            file.getParentFile().mkdirs();

            FileOutputStream fos = new FileOutputStream(file);
            fos.write(content.getBytes("UTF-8"));
            fos.flush();
            fos.getFD().sync();
            fos.close();

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "writeFile failed", e);
            promise.reject("WRITE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void flushFile(String path, Promise promise) {
        try {
            File file = new File(path);
            if (file.exists()) {
                FileOutputStream fos = new FileOutputStream(file, true);
                fos.flush();
                fos.getFD().sync();
                fos.close();
            }
            promise.resolve(true);
        } catch (Exception e) {
            Log.w(TAG, "flushFile failed (non-fatal)", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void flushAll(Promise promise) {
        try {
            System.runFinalization();
            promise.resolve(true);
        } catch (Exception e) {
            Log.w(TAG, "flushAll failed", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void unmountUSB(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            StorageManager storageManager = (StorageManager) context.getSystemService(Context.STORAGE_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                for (StorageVolume volume : storageManager.getStorageVolumes()) {
                    if (volume.getState().equals("mounted")) {
                        try {
                            java.lang.reflect.Method isRemovableMethod = StorageVolume.class.getMethod("isRemovable");
                            boolean isRemovable = (boolean) isRemovableMethod.invoke(volume);
                            if (isRemovable) {
                                // Note: unmount requires system-level access
                                // We flush and notify the user to safely remove via system UI
                                Log.i(TAG, "USB volume ready for safe removal: " + getVolumeDescription(volume));
                            }
                        } catch (Exception e) {
                            // Ignore
                        }
                    }
                }
            }

            promise.resolve(true);
        } catch (Exception e) {
            Log.w(TAG, "unmountUSB failed", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void installAPK(String apkPath, Promise promise) {
        try {
            File apkFile = new File(apkPath);
            if (!apkFile.exists() || !apkFile.isFile()) {
                promise.reject("APK_ERROR", "APK file not found: " + apkPath);
                return;
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.fromFile(apkFile), "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "installAPK failed", e);
            promise.reject("INSTALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getFileInfo(String path, Promise promise) {
        try {
            File file = new File(path);
            if (!file.exists()) {
                promise.reject("FILE_ERROR", "File not found: " + path);
                return;
            }

            WritableMap info = Arguments.createMap();
            info.putString("name", file.getName());
            info.putString("path", file.getAbsolutePath());
            info.putBoolean("isDirectory", file.isDirectory());
            info.putBoolean("isFile", file.isFile());
            info.putBoolean("canRead", file.canRead());
            info.putBoolean("canWrite", file.canWrite());
            info.putDouble("size", file.length());
            info.putDouble("lastModified", file.lastModified());
            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("FILE_INFO_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void copyFileToInternal(String sourcePath, String destPath, Promise promise) {
        FileInputStream fis = null;
        FileOutputStream fos = null;
        try {
            File source = new File(sourcePath);
            if (!source.exists() || !source.canRead()) {
                promise.reject("COPY_ERROR", "Cannot read source: " + sourcePath);
                return;
            }

            File dest = new File(destPath);
            dest.getParentFile().mkdirs();

            fis = new FileInputStream(source);
            fos = new FileOutputStream(dest);

            long totalBytes = source.length();
            byte[] buffer = new byte[8 * 1024 * 1024]; // 8MB buffer for large files
            int bytesRead;
            long totalCopied = 0;

            while ((bytesRead = fis.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
                totalCopied += bytesRead;

                // Periodic flush every 256MB to prevent memory pressure
                if (totalCopied % (256 * 1024 * 1024) == 0) {
                    fos.flush();
                }
            }

            // Final flush + fsync for data integrity
            fos.flush();
            fos.getFD().sync();
            fis.close();
            fos.close();

            Log.i(TAG, "Copied " + totalCopied + " bytes from " + sourcePath + " to " + destPath);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "copyFileToInternal failed", e);
            try { if (fis != null) fis.close(); } catch (Exception ignored) {}
            try { if (fos != null) fos.close(); } catch (Exception ignored) {}
            promise.reject("COPY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void copyDirectory(String sourceDirPath, String destDirPath, Promise promise) {
        try {
            File sourceDir = new File(sourceDirPath);
            if (!sourceDir.exists() || !sourceDir.isDirectory()) {
                promise.reject("COPY_ERROR", "Source directory not found: " + sourceDirPath);
                return;
            }

            File destDir = new File(destDirPath);
            destDir.mkdirs();

            File[] files = sourceDir.listFiles();
            if (files == null) {
                promise.resolve(0);
                return;
            }

            int copied = 0;
            for (File file : files) {
                if (file.isFile() && file.canRead()) {
                    File destFile = new File(destDir, file.getName());
                    FileInputStream fis = new FileInputStream(file);
                    FileOutputStream fos = new FileOutputStream(destFile);
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = fis.read(buffer)) != -1) {
                        fos.write(buffer, 0, bytesRead);
                    }
                    fos.flush();
                    fos.getFD().sync();
                    fis.close();
                    fos.close();
                    copied++;
                }
            }

            promise.resolve(copied);
        } catch (Exception e) {
            Log.e(TAG, "copyDirectory failed", e);
            promise.reject("COPY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void deleteFile(String path, Promise promise) {
        try {
            File file = new File(path);
            if (file.exists()) {
                boolean deleted = file.delete();
                promise.resolve(deleted);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("DELETE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void reassembleModel(com.facebook.react.bridge.ReadableArray chunkPaths, String outputPath, Promise promise) {
        FileOutputStream fos = null;
        try {
            File outputFile = new File(outputPath);
            outputFile.getParentFile().mkdirs();

            // Delete existing file if present
            if (outputFile.exists()) {
                outputFile.delete();
            }

            fos = new FileOutputStream(outputFile);
            byte[] buffer = new byte[8 * 1024 * 1024]; // 8MB buffer
            long totalWritten = 0;

            for (int i = 0; i < chunkPaths.size(); i++) {
                String chunkPath = chunkPaths.getString(i);
                File chunkFile = new File(chunkPath);

                if (!chunkFile.exists() || !chunkFile.canRead()) {
                    throw new IOException("Cannot read chunk: " + chunkPath);
                }

                Log.i(TAG, "Reassembling chunk " + i + ": " + chunkPath + " (" + chunkFile.length() + " bytes)");

                FileInputStream fis = new FileInputStream(chunkFile);
                int bytesRead;
                long chunkWritten = 0;

                while ((bytesRead = fis.read(buffer)) != -1) {
                    fos.write(buffer, 0, bytesRead);
                    chunkWritten += bytesRead;
                    totalWritten += bytesRead;

                    // Flush every 256MB
                    if (chunkWritten % (256 * 1024 * 1024) == 0) {
                        fos.flush();
                    }
                }

                fis.close();
                Log.i(TAG, "Chunk " + i + " done: " + chunkWritten + " bytes");
            }

            // Final flush + fsync
            fos.flush();
            fos.getFD().sync();
            fos.close();

            Log.i(TAG, "Reassembly complete: " + totalWritten + " bytes -> " + outputPath);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "reassembleModel failed", e);
            try { if (fos != null) fos.close(); } catch (Exception ignored) {}
            promise.reject("REASSEMBLE_ERROR", e.getMessage());
        }
    }
}
