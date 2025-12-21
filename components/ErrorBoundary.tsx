import React, { Component, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error);
        console.error('Error info:', errorInfo);

        this.setState({ errorInfo });

        // In production, you could send this to an error reporting service
        // errorReportingService.log({ error, errorInfo });
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        // Reset error state and trigger navigation
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Force reload to home - this is a last resort recovery
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        {/* Error Icon */}
                        <View style={styles.iconContainer}>
                            <AlertTriangle size={64} color="#F59E0B" />
                        </View>

                        {/* Error Message */}
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            We're sorry, but something unexpected happened. Don't worry, your
                            data is safe.
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={this.handleRetry}
                                accessibilityLabel="Try again"
                                accessibilityRole="button"
                            >
                                <RefreshCw size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Try Again</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={this.handleGoHome}
                                accessibilityLabel="Return to home"
                                accessibilityRole="button"
                            >
                                <Home size={20} color="#2563EB" />
                                <Text style={styles.secondaryButtonText}>Go to Home</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Debug Info (only in development) */}
                        {__DEV__ && this.state.error && (
                            <View style={styles.debugContainer}>
                                <Text style={styles.debugTitle}>Debug Info</Text>
                                <Text style={styles.debugText} numberOfLines={5}>
                                    {this.state.error.toString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 320,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 300,
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
    },
    debugContainer: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        width: '100%',
        maxWidth: 320,
    },
    debugTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#991B1B',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 11,
        color: '#7F1D1D',
        fontFamily: 'monospace',
    },
});

export default ErrorBoundary;
