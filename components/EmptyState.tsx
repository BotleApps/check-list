import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
    CheckCircle2,
    ListTodo,
    FolderOpen,
    Compass,
    FileText,
    Tag,
    Wand2,
    Clock,
    WifiOff,
} from 'lucide-react-native';

interface EmptyStateProps {
    type: 'checklists' | 'templates' | 'folders' | 'tags' | 'search' | 'ai' | 'offline' | 'generic';
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    type,
    title,
    message,
    actionLabel,
    onAction,
}) => {
    const getDefaultContent = () => {
        switch (type) {
            case 'checklists':
                return {
                    icon: ListTodo,
                    iconColor: '#3B82F6',
                    bgColor: '#EFF6FF',
                    defaultTitle: 'No checklists yet',
                    defaultMessage: 'Create your first checklist to start organizing your tasks and boost your productivity.',
                    defaultAction: 'Create Checklist',
                };
            case 'templates':
                return {
                    icon: FileText,
                    iconColor: '#10B981',
                    bgColor: '#ECFDF5',
                    defaultTitle: 'No templates found',
                    defaultMessage: 'Discover community templates or create your own to share with others.',
                    defaultAction: 'Explore Templates',
                };
            case 'folders':
                return {
                    icon: FolderOpen,
                    iconColor: '#F59E0B',
                    bgColor: '#FFFBEB',
                    defaultTitle: 'No folders yet',
                    defaultMessage: 'Organize your checklists into folders for better structure.',
                    defaultAction: 'Create Folder',
                };
            case 'tags':
                return {
                    icon: Tag,
                    iconColor: '#8B5CF6',
                    bgColor: '#F5F3FF',
                    defaultTitle: 'No tags yet',
                    defaultMessage: 'Add tags to categorize and quickly find your checklists.',
                    defaultAction: 'Create Tag',
                };
            case 'search':
                return {
                    icon: Compass,
                    iconColor: '#6B7280',
                    bgColor: '#F3F4F6',
                    defaultTitle: 'No results found',
                    defaultMessage: 'Try adjusting your search or filters to find what you\'re looking for.',
                    defaultAction: 'Clear Search',
                };
            case 'ai':
                return {
                    icon: Wand2,
                    iconColor: '#7C3AED',
                    bgColor: '#F5F3FF',
                    defaultTitle: 'AI features unavailable',
                    defaultMessage: 'AI checklist generation is currently unavailable. You can still create checklists manually.',
                    defaultAction: 'Create Manually',
                };
            case 'offline':
                return {
                    icon: WifiOff,
                    iconColor: '#EF4444',
                    bgColor: '#FEF2F2',
                    defaultTitle: 'Connection Unavailable',
                    defaultMessage: 'The backend server is not reachable. Please check your connection or start the server.',
                    defaultAction: 'Retry',
                };
            default:
                return {
                    icon: CheckCircle2,
                    iconColor: '#6B7280',
                    bgColor: '#F3F4F6',
                    defaultTitle: 'Nothing here yet',
                    defaultMessage: 'Get started by adding something new.',
                    defaultAction: 'Get Started',
                };
        }
    };

    const content = getDefaultContent();
    const Icon = content.icon;
    const displayTitle = title || content.defaultTitle;
    const displayMessage = message || content.defaultMessage;
    const displayAction = actionLabel || content.defaultAction;

    return (
        <View style={styles.container}>
            {/* Animated Icon Container */}
            <View style={[styles.iconContainer, { backgroundColor: content.bgColor }]}>
                <Icon size={48} color={content.iconColor} />
            </View>

            {/* Decorative dots */}
            <View style={styles.dotsContainer}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
            </View>

            {/* Text Content */}
            <Text style={styles.title}>{displayTitle}</Text>
            <Text style={styles.message}>{displayMessage}</Text>

            {/* Action Button */}
            {onAction && (
                <View
                    style={styles.actionButton}
                    accessibilityRole="button"
                    accessibilityLabel={displayAction}
                >
                    <Text
                        style={styles.actionButtonText}
                        onPress={onAction}
                    >
                        {displayAction}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 32,
        paddingTop: 48,
        paddingBottom: 48,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    dotsContainer: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    dot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    dot1: {
        top: 0,
        left: '30%',
        transform: [{ scale: 0.8 }],
    },
    dot2: {
        top: 20,
        right: '25%',
        transform: [{ scale: 1.2 }],
    },
    dot3: {
        bottom: 10,
        left: '35%',
        transform: [{ scale: 0.6 }],
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
        marginBottom: 24,
    },
    actionButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default EmptyState;
