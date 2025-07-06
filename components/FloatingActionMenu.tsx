import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Plus, X, FileText, Wand2, Edit3 } from 'lucide-react-native';

interface FloatingActionMenuProps {
  onCreateFromTemplate: () => void;
  onCreateWithAI: () => void;
  onCreateFromScratch: () => void;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  onCreateFromTemplate,
  onCreateWithAI,
  onCreateFromScratch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    setIsOpen(!isOpen);

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleOptionPress = (action: () => void) => {
    toggleMenu();
    // Delay the action slightly so the menu animation completes first
    setTimeout(action, 100);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuOptions = [
    {
      icon: FileText,
      label: 'Use a Template',
      onPress: () => handleOptionPress(onCreateFromTemplate),
      color: '#059669',
    },
    {
      icon: Wand2,
      label: 'Generate with AI',
      onPress: () => handleOptionPress(onCreateWithAI),
      color: '#7C3AED',
    },
    {
      icon: Edit3,
      label: 'Start Blank',
      onPress: () => handleOptionPress(onCreateFromScratch),
      color: '#DC2626',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Menu Options */}
      {menuOptions.map((option, index) => {
        const Icon = option.icon;
        const translateY = scaleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(50 + index * 50)],
        });

        return (
          <Animated.View
            key={option.label}
            style={[
              styles.menuOption,
              {
                transform: [{ translateY }, { scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.optionButton}
              onPress={option.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: option.color }]}>
                <Icon size={18} color="#FFFFFF" />
              </View>
              <View style={styles.optionLabelContainer}>
                <Text style={styles.optionLabel} numberOfLines={1}>{option.label}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          {isOpen ? <X size={24} color="#FFFFFF" /> : <Plus size={24} color="#FFFFFF" />}
        </Animated.View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 3,
  },
  menuOption: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
    maxWidth: 250,
  },
  optionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionLabelContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
});
