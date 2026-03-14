import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import { hapticLight } from '../utils/haptics';

interface DropdownPickerProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export default function DropdownPicker({
  label,
  options,
  selected,
  onSelect,
  placeholder = 'Select...',
}: DropdownPickerProps) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);

  function handleSelect(value: string) {
    hapticLight();
    onSelect(value);
    setVisible(false);
  }

  return (
    <View style={[styles.container, { marginBottom: t.spacing.lg }]}>
      <Text style={[t.typography.subhead, { color: t.colors.text, marginBottom: t.spacing.sm }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.trigger,
          t.shadow.subtle,
          {
            backgroundColor: t.colors.card,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: selected ? t.colors.accent : t.colors.border,
          },
        ]}
        onPress={() => { hapticLight(); setVisible(true); }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            t.typography.body,
            { color: selected ? t.colors.text : t.colors.subtext, flex: 1 },
          ]}
        >
          {selected || placeholder}
        </Text>
        <FontAwesome5 name="chevron-down" size={12} color={t.colors.subtext} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: t.colors.overlay }]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: t.colors.card,
                borderRadius: t.radius.lg,
              },
              t.shadow.floating,
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: t.colors.divider }]}>
              <Text style={[t.typography.headline, { color: t.colors.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <FontAwesome5 name="times" size={18} color={t.colors.subtext} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === selected;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: t.colors.divider },
                      isSelected && { backgroundColor: t.colors.accentLight },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        t.typography.body,
                        { color: t.colors.text, flex: 1 },
                        isSelected && { color: t.colors.accent, fontWeight: '600' },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <FontAwesome5 name="check" size={14} color={t.colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.optionList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
