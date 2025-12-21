import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated,
    SafeAreaView,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    CheckSquare,
    Wand2,
    FolderOpen,
    Users,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = '@checklist_onboarding_complete';

interface OnboardingSlide {
    icon: any;
    iconColor: string;
    bgColor: string;
    title: string;
    description: string;
}

const slides: OnboardingSlide[] = [
    {
        icon: CheckSquare,
        iconColor: '#3B82F6',
        bgColor: '#EFF6FF',
        title: 'Create Powerful Checklists',
        description: 'Organize your tasks, projects, and goals with flexible checklists. Group items, add due dates, and track your progress.',
    },
    {
        icon: Wand2,
        iconColor: '#8B5CF6',
        bgColor: '#F5F3FF',
        title: 'AI-Powered Generation',
        description: 'Let AI create detailed checklists for you. Just describe what you need, and we\'ll generate a complete organized list.',
    },
    {
        icon: FolderOpen,
        iconColor: '#F59E0B',
        bgColor: '#FFFBEB',
        title: 'Stay Organized',
        description: 'Use folders and tags to categorize your checklists. Find anything instantly with powerful search and filters.',
    },
    {
        icon: Users,
        iconColor: '#10B981',
        bgColor: '#ECFDF5',
        title: 'Discover & Share Templates',
        description: 'Explore community templates or share your own. Start faster with proven checklists from others.',
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const fadeAnimation = useRef(new Animated.Value(1)).current;

    const goToSlide = (index: number) => {
        // Fade out
        Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setCurrentSlide(index);
            // Fade in
            Animated.timing(fadeAnimation, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            goToSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        } catch (error) {
            console.warn('Failed to save onboarding state:', error);
        }
        onComplete();
    };

    const currentSlideData = slides[currentSlide];
    const Icon = currentSlideData.icon;
    const isLastSlide = currentSlide === slides.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Skip Button */}
            {!isLastSlide && (
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    accessibilityLabel="Skip onboarding"
                    accessibilityRole="button"
                >
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
            )}

            {/* Slide Content */}
            <Animated.View style={[styles.slideContainer, { opacity: fadeAnimation }]}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: currentSlideData.bgColor }]}>
                    <Icon size={64} color={currentSlideData.iconColor} />
                </View>

                {/* Text Content */}
                <Text style={styles.title}>{currentSlideData.title}</Text>
                <Text style={styles.description}>{currentSlideData.description}</Text>
            </Animated.View>

            {/* Bottom Navigation */}
            <View style={styles.bottomContainer}>
                {/* Dots Indicator */}
                <View style={styles.dotsContainer}>
                    {slides.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dot,
                                currentSlide === index && styles.dotActive,
                            ]}
                            onPress={() => goToSlide(index)}
                            accessibilityLabel={`Go to slide ${index + 1}`}
                            accessibilityRole="button"
                        />
                    ))}
                </View>

                {/* Navigation Buttons */}
                <View style={styles.buttonsContainer}>
                    {currentSlide > 0 ? (
                        <TouchableOpacity
                            style={styles.previousButton}
                            onPress={handlePrevious}
                            accessibilityLabel="Previous slide"
                            accessibilityRole="button"
                        >
                            <ChevronLeft size={24} color="#6B7280" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.buttonPlaceholder} />
                    )}

                    <TouchableOpacity
                        style={[styles.nextButton, isLastSlide && styles.getStartedButton]}
                        onPress={handleNext}
                        accessibilityLabel={isLastSlide ? 'Get started' : 'Next slide'}
                        accessibilityRole="button"
                    >
                        {isLastSlide ? (
                            <Text style={styles.getStartedText}>Get Started</Text>
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>Next</Text>
                                <ChevronRight size={20} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

// Hook to check if onboarding has been completed
export const useOnboardingState = () => {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

    React.useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
                setHasCompletedOnboarding(value === 'true');
            } catch (error) {
                console.warn('Failed to check onboarding state:', error);
                setHasCompletedOnboarding(true); // Default to completed on error
            }
        };
        checkOnboarding();
    }, []);

    const resetOnboarding = async () => {
        try {
            await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
            setHasCompletedOnboarding(false);
        } catch (error) {
            console.warn('Failed to reset onboarding:', error);
        }
    };

    return { hasCompletedOnboarding, resetOnboarding };
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 20,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    skipButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    slideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    bottomContainer: {
        paddingHorizontal: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    dotActive: {
        backgroundColor: '#2563EB',
        width: 24,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previousButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPlaceholder: {
        width: 48,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 4,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    getStartedButton: {
        paddingHorizontal: 32,
    },
    getStartedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default OnboardingScreen;
