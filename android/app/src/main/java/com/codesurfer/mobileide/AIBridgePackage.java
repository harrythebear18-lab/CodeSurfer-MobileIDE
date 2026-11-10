package com.codesurfer.mobileide;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.List;

/**
 * React Native package registration for AIBridgeModule and QwenCoderModule.
 */
public class AIBridgePackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AIBridgeModule(reactContext));
        modules.add(new QwenCoderModule(reactContext));
        modules.add(new USBStorageModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return new ArrayList<>();
    }
}
