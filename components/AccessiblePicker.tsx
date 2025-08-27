import React, { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';

interface PickerItem {
  label: string;
  value: string;
}

interface AccessiblePickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  placeholder?: string;
  accessibilityLabel?: string;
}

export const AccessiblePicker: React.FC<AccessiblePickerProps> = ({
  selectedValue,
  onValueChange,
  items,
  placeholder = "Select an option",
  accessibilityLabel,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedItem = items.find(item => item.value === selectedValue);

  if (Platform.OS === 'web') {
    return (
      <select
        value={selectedValue}
        onChange={(e) => onValueChange((e.target as HTMLSelectElement).value)}
        style={{
          width: "100%",
          padding: 12,
          border: "none",
          backgroundColor: "transparent",
          fontSize: 16,
          color: "#000",
        }}
        aria-label={accessibilityLabel}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setIsVisible(true)}
        style={{
          padding: 12,
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to select an option"
      >
        <Text style={{ fontSize: 16, color: selectedItem ? '#000' : '#999' }}>
          {selectedItem?.label || placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            width: '80%',
            maxHeight: '70%',
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
              Select School
            </Text>
            
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onValueChange(item.value);
                    setIsVisible(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{item.label}</Text>
                </Pressable>
              )}
            />
            
            <Pressable
              onPress={() => setIsVisible(false)}
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#f0f0f0',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};
