import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>This section is under development. Use Performance for analytics.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  subtitle: { color: '#6b7280', textAlign: 'center', fontSize: 16 },
});
