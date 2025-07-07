import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import bucketsReducer from './slices/bucketsSlice';
import checklistsReducer from './slices/checklistsSlice';
import taskGroupsReducer from './slices/taskGroupsSlice';
import templateGroupsReducer from './slices/templateGroupsSlice';
import templatesReducer from './slices/templatesSlice';
import tagsReducer from './slices/tagsSlice';
import categoriesReducer from './slices/categoriesSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['buckets', 'checklists', 'taskGroups', 'templateGroups', 'templates', 'tags', 'categories'],
  blacklist: ['auth'], // Don't persist auth state to avoid loading state issues
};

const rootReducer = combineReducers({
  auth: authReducer,
  buckets: bucketsReducer,
  checklists: checklistsReducer,
  taskGroups: taskGroupsReducer,
  templateGroups: templateGroupsReducer,
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