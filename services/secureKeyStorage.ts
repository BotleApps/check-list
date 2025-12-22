import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const GEMINI_API_KEY_STORAGE = 'user_gemini_api_key';

class SecureKeyStorage {
  // Store the API key securely
  async setGeminiApiKey(apiKey: string): Promise<void> {
    if (Platform.OS === 'web') {
      // For web, use AsyncStorage (browser localStorage)
      // Note: In production, consider additional encryption for sensitive data
      // Web storage is less secure than mobile secure stores
      await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, apiKey);
    } else {
      // For mobile, use SecureStore (Keychain on iOS, Keystore on Android)
      await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE, apiKey);
    }
  }

  // Get the stored API key
  async getGeminiApiKey(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
    } else {
      return await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE);
    }
  }

  // Remove the API key
  async removeGeminiApiKey(): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE);
    } else {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE);
    }
  }

  // Check if a key is stored
  async hasGeminiApiKey(): Promise<boolean> {
    const key = await this.getGeminiApiKey();
    return !!key && key.length > 0;
  }
}

export const secureKeyStorage = new SecureKeyStorage();
