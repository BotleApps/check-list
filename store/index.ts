import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import bucketsReducer from './slices/bucketsSlice';
import checklistsReducer from './slices/checklistsSlice';
import templatesReducer from './slices/templatesSlice';
import tagsReducer from './slices/tagsSlice';
import categoriesReducer from './slices/categoriesSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'buckets', 'checklists', 'templates', 'tags', 'categories'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  buckets: bucketsReducer,
  checklists: checklistsReducer,
  templates: templatesReducer,
  tags: tagsReducer,
  categories: categoriesReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;