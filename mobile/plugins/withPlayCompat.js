const {
  withAndroidManifest,
  withAndroidStyles,
} = require("expo/config-plugins");

const REMOVE_PERMISSIONS = [
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
];

const TOOLS_NS = "http://schemas.android.com/tools";

module.exports = function withPlayCompatibility(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest) return config;

    const attrs = manifest.manifest.$ || (manifest.manifest.$ = {});
    if (!attrs["xmlns:tools"]) {
      attrs["xmlns:tools"] = TOOLS_NS;
    }

    const application = manifest.manifest.application;
    if (Array.isArray(application) && application[0]) {
      const appAttrs = application[0].$ || (application[0].$ = {});
      appAttrs["android:allowBackup"] = "false";
    }

    const usesPermission = manifest.manifest["uses-permission"] || [];
    for (const name of REMOVE_PERMISSIONS) {
      usesPermission.push({
        $: { "android:name": name, "tools:node": "remove" },
      });
    }
    manifest.manifest["uses-permission"] = usesPermission;
    return config;
  });

  config = withAndroidStyles(config, (config) => {
    const resource = config.modResults.resources;
    if (!resource || !resource.style) return config;

    const item = {
      $: { name: "android:windowOptOutEdgeToEdgeEnforcement" },
      _: "true",
    };
    for (const style of resource.style) {
      const styleName = style.$ && style.$.name;
      if (styleName !== "AppTheme" && styleName !== "Theme.App.SplashScreen") {
        continue;
      }
      style.item = style.item || [];
      style.item.push(item);
    }
    return config;
  });

  return config;
};
