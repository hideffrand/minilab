import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface Block {
  title: string;
  body: string;
}

const TERMS: Block[] = [
  {
    title: "What Mooni is",
    body:
      "Mooni is a companion app for the self-hosted Mooni server. It lets you " +
      "browse, preview, and transfer files to and from a server that you run " +
      "yourself, and optionally trigger a reboot or shutdown of that machine.",
  },
  {
    title: "Acceptance of terms",
    body:
      "By installing and using Mooni you agree to these terms. If you do not " +
      "agree, uninstall the app. The app is provided free of charge, without " +
      "any account, and can be removed at any time.",
  },
  {
    title: "What Mooni does not do",
    body:
      "Mooni does not collect, store, or transmit any data to us. It contains " +
      "no advertising, no analytics, and no third-party tracking SDKs. There is " +
      "no account system and no cloud backend operated by us.",
  },
  {
    title: "Your data stays on your hardware",
    body:
      "Files you browse or transfer are stored on your own server. The app " +
      "connects to that server over your local network or a Tailscale VPN, " +
      "using an API key you create during pairing. Access is only possible with " +
      "that key, and only while the app has it stored on your device.",
  },
  {
    title: "Security and your responsibilities",
    body:
      "The API key grants access to everything under the server's configured " +
      "file root and includes the power-control feature. Treat it like a " +
      "password. You are responsible for keeping your server, network, and " +
      "Tailscale configuration secure, and for choosing the file root you " +
      "expose. Depending on your network, the app may communicate over plain " +
      "HTTP, so prefer pairing over an encrypted connection such as Tailscale.",
  },
  {
    title: "Removal of your data",
    body:
      "To revoke app access, remove the device from the app's device list or " +
      "uninstall Mooni — this deletes the stored API key. Files on your server " +
      "are not touched and are yours to manage. Power control can also be " +
      "disabled by removing the passwordless-sudo rule on the server.",
  },
  {
    title: "No warranty and limitation of liability",
    body:
      "Mooni is provided \"as is\", without warranties of any kind. To the " +
      "maximum extent permitted by law, the developers are not liable for any " +
      "damages arising from its use, including file loss or hardware control. " +
      "You use the power-control feature at your own risk and should test it " +
      "on non-essential hardware first.",
  },
  {
    title: "Changes and open source",
    body:
      "These terms may be updated as the app evolves; continued use after a " +
      "change constitutes acceptance. Mooni is open source, and its source " +
      "code is available for review.",
  },
];

const PRIVACY: Block[] = [
  {
    title: "Information we collect",
    body:
      "We do not collect any personal information. Mooni has no analytics, no " +
      "crash reporting service, and no remote servers of our own. It does not " +
      "even phone home to verify its own version.",
  },
  {
    title: "Information stored on your device",
    body:
      "The app stores, locally on your device: the list of paired servers " +
      "(name and address) in AsyncStorage, and each server's API key in the " +
      "device's encrypted SecureStore. Nothing is transmitted except direct " +
      "requests to the servers you paired. You can delete everything by " +
      "removing devices and uninstalling the app.",
  },
  {
    title: "Information sent to your server",
    body:
      "Requests to your own server carry the API key you generated during " +
      "pairing and file paths you navigate or transfer. This traffic stays " +
      "between your phone and your server; we never see it.",
  },
  {
    title: "Camera and biometrics",
    body:
      "Camera access is used only to scan the pairing QR code produced by the " +
      "server. Nothing is recorded or uploaded. Device lock (fingerprint or " +
      "PIN) is used only on-device to confirm power-control actions; it is " +
      "never transmitted.",
  },
  {
    title: "Permissions requested",
    body:
      "Mooni requests only the Android permissions it needs: camera (pairing " +
      "QR scan) and biometric (power control confirmation). No storage, " +
      "microphone, or overlay permissions are used.",
  },
  {
    title: "Children's privacy",
    body:
      "Mooni is not directed at children under 13, and since it collects no " +
      "personal information, no such data is knowingly gathered from anyone.",
  },
  {
    title: "Contact",
    body:
      "For questions about this policy or the app, use the support contact " +
      "listed on the app's Play Store listing.",
  },
];

export default function LegalScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const renderBlocks = (blocks: Block[]) =>
    blocks.map((b, i) => (
      <View key={i} style={styles.group}>
        <Text style={styles.blockTitle}>{b.title}</Text>
        <Text style={styles.blockBody}>{b.body}</Text>
      </View>
    ));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        These terms and this privacy policy cover the Mooni Android app. They
        are written in plain language; they describe what the app does with
        your data and what you can expect from it.
      </Text>

      <Text style={styles.sectionTitle}>Terms of Service</Text>
      {renderBlocks(TERMS)}

      <Text style={styles.sectionTitle}>Privacy Policy</Text>
      {renderBlocks(PRIVACY)}

      <Text style={styles.effective}>Last updated: August 2026</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    intro: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 20,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 10,
    },
    group: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    blockTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 6 },
    blockBody: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    effective: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
      textAlign: "center",
    },
  });
}
