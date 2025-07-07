import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// Import the default avatar image
const defaultAvatar = require('../assets/images/icon.png');

// Pastel color palette based on name length
const PASTEL_COLORS = [
  '#FFB3BA', // Light Pink
  '#FFDFBA', // Light Peach
  '#FFFFBA', // Light Yellow
  '#BAFFC9', // Light Green
  '#BAE1FF', // Light Blue
  '#E1BAFF', // Light Purple
  '#FFBAE1', // Light Magenta
  '#BAFFFF', // Light Cyan
  '#D4FFBA', // Light Lime
  '#FFCABA', // Light Coral
];

interface ProfileAvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
  fontSize?: number;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name = '',
  imageUrl,
  size = 40,
  fontSize,
}) => {
  const getInitial = () => {
    return name.trim().charAt(0).toUpperCase() || '?';
  };

  const getBackgroundColor = () => {
    const colorIndex = name.length % PASTEL_COLORS.length;
    return PASTEL_COLORS[colorIndex];
  };

  const calculatedFontSize = fontSize || Math.max(12, size * 0.4);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, avatarStyle]}
        defaultSource={defaultAvatar}
      />
    );
  }

  return (
    <View style={[
      styles.avatar,
      avatarStyle,
      { backgroundColor: getBackgroundColor() }
    ]}>
      <Text style={[
        styles.initial,
        { fontSize: calculatedFontSize }
      ]}>
        {getInitial()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
