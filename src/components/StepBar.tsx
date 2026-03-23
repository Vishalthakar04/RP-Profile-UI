// components/StepBar.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface StepBarProps {
  current: number   // 1-based current step
  total?: number    // default 6
}

export default function StepBar({ current, total = 6 }: StepBarProps) {
  return (
    <>
      <Text style={s.stepLabel}>STEP {current} OF {total}</Text>
      <View style={s.stepRow}>
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1
          const isDone   = step < current
          const isActive = step === current
          return (
            <View
              key={i}
              style={[
                s.seg,
                isDone   && s.segDone,
                isActive && s.segActive,
                !isDone && !isActive && s.segIdle,
              ]}
            />
          )
        })}
      </View>
    </>
  )
}

const s = StyleSheet.create({
  stepLabel: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 10,
  },
  seg:       { width: 30, height: 6, borderRadius: 10 },
  segDone:   { backgroundColor: '#F97316' },
  segActive: { backgroundColor: '#FB923C', opacity: 0.85 },
  segIdle:   { backgroundColor: '#E5E7EB' },
})