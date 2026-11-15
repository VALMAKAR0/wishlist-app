package app.wunschliste.local;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApkDownload")
public class ApkDownloadPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String url = call.getString("url");
        String name = call.getString("name", "wunschliste.apk");
        if (url == null || !url.startsWith("https://github.com/")) {
            call.reject("url");
            return;
        }
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (!name.endsWith(".apk")) name = name + ".apk";
        try {
            DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setTitle(name);
            req.setDescription("Wunschliste Update");
            req.setMimeType("application/vnd.android.package-archive");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            long id = dm.enqueue(req);
            JSObject res = new JSObject();
            res.put("id", id);
            res.put("name", name);
            call.resolve(res);
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "download" : e.getMessage());
        }
    }
}
