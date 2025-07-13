import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  visible: boolean;
  date: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;
  onDateChange: (date: Date | null) => void;
  onClose: () => void;
  title?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  date,
  minimumDate,
  maximumDate,
  onDateChange,
  onClose,
  title = 'Select Date',
}) => {
  const [tempDate, setTempDate] = useState<Date>(date || new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // On web, the date change is handled differently
      return;
    }
    
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    onClose();
  };

  const handleClear = () => {
    onDateChange(null);
    onClose();
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const WebDatePicker = () => {
    const [webDate, setWebDate] = useState(date ? formatDateForInput(date) : '');

    const handleWebDateChange = (value: string) => {
      setWebDate(value);
      if (value) {
        const newDate = new Date(value);
        if (!isNaN(newDate.getTime())) {
          setTempDate(newDate);
        }
      }
    };

    return (
      <View style={styles.webContainer}>
        <View style={styles.webDateInputContainer}>
          <input
            type="date"
            value={webDate}
            min={minimumDate ? formatDateForInput(minimumDate) : undefined}
            max={maximumDate ? formatDateForInput(maximumDate) : undefined}
            onChange={(e) => handleWebDateChange(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              width: '100%',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: '#000000',
              margin: 0,
            }}
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const NativeDatePicker = () => (
    <View style={styles.nativeContainer}>
      <DateTimePicker
        value={tempDate}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        style={styles.datePicker}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.datePickerContainer}>
          {Platform.OS === 'web' ? <WebDatePicker /> : <NativeDatePicker />}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  headerSpacer: {
    width: 64, // Balance the cancel button on the left
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  webContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webDateInputContainer: {
    marginBottom: 20,
  },
  nativeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  datePicker: {
    height: 200,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
