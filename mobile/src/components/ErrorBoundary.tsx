import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ThemeContext, ThemeColors, darkColors } from "../context/ThemeContext";

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
    const error = this.state.error;
    if (error) {
      return (
        <ThemeContext.Consumer>
          {(ctx) => {
            const styles = makeStyles(ctx?.colors ?? darkColors);
            return (
              <View style={styles.container}>
                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.message}>
                  {String(error.message || error)}
                </Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => this.setState({ error: null })}
                >
                  <Text style={styles.btnText}>Reload</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        </ThemeContext.Consumer>
      );
    }
    return this.props.children;
  }
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
    message: {
      color: colors.dangerText,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 20,
    },
    btn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    btnText: { color: colors.onPrimary, fontWeight: "700" },
  });
}
