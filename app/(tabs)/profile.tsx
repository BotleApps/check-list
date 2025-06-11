import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfoModal } from '../../components/InfoModal';
import { 
  User, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Mail,
  Calendar,
  Edit3,
  Check,
  X,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({
    title: '',
    message: '',
  });
  
  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    dispatch(logoutUser());
    router.replace('/auth/login');
  };

  const showComingSoon = (title: string, message: string) => {
    setInfoModalContent({ title, message });
    setShowInfoModal(true);
  };

  const handleEditName = () => {
    setEditedName(user?.name || user?.email || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    // TODO: Implement name update API call
    Alert.alert('Coming Soon', 'Profile editing will be available in the next update');
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const menuItems = [
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      onPress: () => router.push('/settings'),
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      subtitle: 'Manage your privacy settings',
      onPress: () => router.push('/privacy-security'),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => router.push('/help-support'),
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <User size={48} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter your name"
                  autoFocus
                />
                <View style={styles.nameEditActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveName}
                  >
                    <Check size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                  >
                    <X size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{user.name}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditName}
                >
                  <Edit3 size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.userDetail}>
              <Mail size={14} color="#6B7280" />
              <Text style={styles.userDetailText}>{user.email}</Text>
            </View>
            <View style={styles.userDetail}>
              <Calendar size={14} color="#6B7280" />
              <Text style={styles.userDetailText}>
                Joined {formatDate(user.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuIconContainer}>
                <item.icon size={20} color="#6B7280" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Checklist App v1.0.0</Text>
        </View>
      </ScrollView>
      
      {/* Custom Modals */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
      
      <InfoModal
        visible={showInfoModal}
        title={infoModalContent.title}
        message={infoModalContent.message}
        onClose={() => setShowInfoModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameEditContainer: {
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  nameEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  userDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  versionSection: {
    alignItems: 'center',
    padding: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});