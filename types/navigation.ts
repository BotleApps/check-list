import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  '(tabs)': NavigatorScreenParams<TabParamList>;
  auth: NavigatorScreenParams<AuthStackParamList>;
  checklist: { checklistId: string };
  'checklist-edit': { checklistId: string };
  'template-create': { templateId?: string };
  sharing: { checklistId: string };
};

export type TabParamList = {
  index: undefined;
  buckets: undefined;
  templates: undefined;
  profile: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
};