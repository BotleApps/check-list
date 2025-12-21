import React from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

// Base Skeleton Component with shimmer animation
export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const shimmerValue = React.useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = useWindowDimensions();

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerValue, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerValue]);

    const translateX = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-screenWidth, screenWidth],
    });

    return (
        <View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
};

// Checklist Card Skeleton
export const ChecklistCardSkeleton: React.FC = () => (
    <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
            <Skeleton width="70%" height={20} />
            <Skeleton width={40} height={20} />
        </View>
        <View style={styles.cardMeta}>
            <Skeleton width="40%" height={14} />
            <Skeleton width={80} height={14} />
        </View>
        <View style={styles.cardTags}>
            <Skeleton width={60} height={24} borderRadius={12} />
            <Skeleton width={80} height={24} borderRadius={12} />
        </View>
    </View>
);

// Template Card Skeleton
export const TemplateCardSkeleton: React.FC = () => (
    <View style={styles.templateContainer}>
        <View style={styles.templateHeader}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={styles.templateHeaderText}>
                <Skeleton width="60%" height={18} />
                <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
            </View>
        </View>
        <Skeleton width="100%" height={40} style={{ marginTop: 12 }} />
        <View style={styles.templateItems}>
            <Skeleton width="90%" height={14} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="85%" height={14} />
        </View>
    </View>
);

// Profile Section Skeleton
export const ProfileSkeleton: React.FC = () => (
    <View style={styles.profileContainer}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={styles.profileInfo}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
            <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
        </View>
    </View>
);

// List Skeleton - renders multiple card skeletons
export const ChecklistListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <View style={styles.listContainer}>
        {Array.from({ length: count }).map((_, index) => (
            <ChecklistCardSkeleton key={index} />
        ))}
    </View>
);

// Template List Skeleton
export const TemplateListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <View style={styles.listContainer}>
        {Array.from({ length: count }).map((_, index) => (
            <TemplateCardSkeleton key={index} />
        ))}
    </View>
);

// Menu Item Skeleton for settings/profile menus
export const MenuItemSkeleton: React.FC = () => (
    <View style={styles.menuItem}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.menuContent}>
            <Skeleton width="50%" height={16} />
            <Skeleton width="70%" height={12} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={20} height={20} borderRadius={4} />
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        width: '50%',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardTags: {
        flexDirection: 'row',
        gap: 8,
    },
    templateContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    templateHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    templateItems: {
        marginTop: 12,
        gap: 8,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    listContainer: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    menuContent: {
        flex: 1,
        marginLeft: 12,
    },
});

export default Skeleton;
