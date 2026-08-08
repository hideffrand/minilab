import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render-time errors (e.g. invalid JSX) so a single screen can't
// silently kill the app in a release build — it shows a recoverable screen
// with the error message instead.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Minilab error boundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {String(this.state.error.message || this.state.error)}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.btnText}>Reload</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111318",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: { color: "#f2f3f5", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  message: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  btn: { backgroundColor: "#3b82f6", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
});
