package app.wunschliste.local;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareIn")
public class ShareInPlugin extends Plugin {
    private static String pending = null;
    private static ShareInPlugin instance = null;

    @Override
    public void load() {
        instance = this;
    }

    public static void capture(Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_SEND.equals(intent.getAction())) return;
        String type = intent.getType();
        if (type == null || !type.startsWith("text/")) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        intent.setAction(Intent.ACTION_MAIN);
        if (text == null || text.trim().isEmpty()) return;
        pending = text;
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("text", text);
            instance.notifyListeners("shareIn", data, true);
        }
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject res = new JSObject();
        res.put("text", pending == null ? "" : pending);
        pending = null;
        call.resolve(res);
    }
}
