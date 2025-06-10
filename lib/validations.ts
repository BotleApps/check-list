// Validation constants and utilities for the checklist app

export const VALIDATION_LIMITS = {
  // Checklist limits
  CHECKLIST_TITLE_MIN_LENGTH: 1,
  CHECKLIST_TITLE_MAX_LENGTH: 100,
  CHECKLIST_DESCRIPTION_MAX_LENGTH: 500,
  MAX_CHECKLISTS_PER_USER: 1000,
  
  // Item limits
  ITEM_TEXT_MIN_LENGTH: 1,
  ITEM_TEXT_MAX_LENGTH: 200,
  ITEM_DESCRIPTION_MAX_LENGTH: 500,
  MAX_ITEMS_PER_CHECKLIST: 100,
  
  // Folder/Bucket limits
  BUCKET_NAME_MIN_LENGTH: 1,
  BUCKET_NAME_MAX_LENGTH: 50,
  MAX_BUCKETS_PER_USER: 50,
  
  // Tag limits
  TAG_NAME_MIN_LENGTH: 1,
  TAG_NAME_MAX_LENGTH: 30,
  MAX_TAGS_PER_CHECKLIST: 10,
  MAX_TAGS_PER_USER: 100,
  
  // Category limits
  CATEGORY_NAME_MIN_LENGTH: 1,
  CATEGORY_NAME_MAX_LENGTH: 50,
};

export const VALIDATION_MESSAGES = {
  // Checklist validation messages
  CHECKLIST_TITLE_REQUIRED: 'Checklist title is required',
  CHECKLIST_TITLE_TOO_SHORT: `Title must be at least ${VALIDATION_LIMITS.CHECKLIST_TITLE_MIN_LENGTH} character`,
  CHECKLIST_TITLE_TOO_LONG: `Title cannot exceed ${VALIDATION_LIMITS.CHECKLIST_TITLE_MAX_LENGTH} characters`,
  CHECKLIST_DESCRIPTION_TOO_LONG: `Description cannot exceed ${VALIDATION_LIMITS.CHECKLIST_DESCRIPTION_MAX_LENGTH} characters`,
  MAX_CHECKLISTS_REACHED: `You can have a maximum of ${VALIDATION_LIMITS.MAX_CHECKLISTS_PER_USER} checklists`,
  
  // Item validation messages
  ITEM_TEXT_REQUIRED: 'Item text is required',
  ITEM_TEXT_TOO_SHORT: `Item text must be at least ${VALIDATION_LIMITS.ITEM_TEXT_MIN_LENGTH} character`,
  ITEM_TEXT_TOO_LONG: `Item text cannot exceed ${VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH} characters`,
  ITEM_DESCRIPTION_TOO_LONG: `Item description cannot exceed ${VALIDATION_LIMITS.ITEM_DESCRIPTION_MAX_LENGTH} characters`,
  MAX_ITEMS_REACHED: `You can have a maximum of ${VALIDATION_LIMITS.MAX_ITEMS_PER_CHECKLIST} items per checklist`,
  
  // Folder validation messages
  BUCKET_NAME_REQUIRED: 'Folder name is required',
  BUCKET_NAME_TOO_SHORT: `Folder name must be at least ${VALIDATION_LIMITS.BUCKET_NAME_MIN_LENGTH} character`,
  BUCKET_NAME_TOO_LONG: `Folder name cannot exceed ${VALIDATION_LIMITS.BUCKET_NAME_MAX_LENGTH} characters`,
  MAX_BUCKETS_REACHED: `You can have a maximum of ${VALIDATION_LIMITS.MAX_BUCKETS_PER_USER} folders`,
  
  // Tag validation messages
  TAG_NAME_REQUIRED: 'Tag name is required',
  TAG_NAME_TOO_SHORT: `Tag name must be at least ${VALIDATION_LIMITS.TAG_NAME_MIN_LENGTH} character`,
  TAG_NAME_TOO_LONG: `Tag name cannot exceed ${VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH} characters`,
  MAX_TAGS_PER_CHECKLIST_REACHED: `You can have a maximum of ${VALIDATION_LIMITS.MAX_TAGS_PER_CHECKLIST} tags per checklist`,
  MAX_TAGS_REACHED: `You can have a maximum of ${VALIDATION_LIMITS.MAX_TAGS_PER_USER} tags`,
  
  // Category validation messages
  CATEGORY_NAME_REQUIRED: 'Category name is required',
  CATEGORY_NAME_TOO_SHORT: `Category name must be at least ${VALIDATION_LIMITS.CATEGORY_NAME_MIN_LENGTH} character`,
  CATEGORY_NAME_TOO_LONG: `Category name cannot exceed ${VALIDATION_LIMITS.CATEGORY_NAME_MAX_LENGTH} characters`,
};

// Validation functions
export const validateChecklistTitle = (title: string): string | null => {
  const trimmed = title.trim();
  
  if (!trimmed) {
    return VALIDATION_MESSAGES.CHECKLIST_TITLE_REQUIRED;
  }
  
  if (trimmed.length < VALIDATION_LIMITS.CHECKLIST_TITLE_MIN_LENGTH) {
    return VALIDATION_MESSAGES.CHECKLIST_TITLE_TOO_SHORT;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.CHECKLIST_TITLE_MAX_LENGTH) {
    return VALIDATION_MESSAGES.CHECKLIST_TITLE_TOO_LONG;
  }
  
  return null;
};

export const validateChecklistDescription = (description: string): string | null => {
  if (description && description.length > VALIDATION_LIMITS.CHECKLIST_DESCRIPTION_MAX_LENGTH) {
    return VALIDATION_MESSAGES.CHECKLIST_DESCRIPTION_TOO_LONG;
  }
  
  return null;
};

export const validateItemText = (text: string): string | null => {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return VALIDATION_MESSAGES.ITEM_TEXT_REQUIRED;
  }
  
  if (trimmed.length < VALIDATION_LIMITS.ITEM_TEXT_MIN_LENGTH) {
    return VALIDATION_MESSAGES.ITEM_TEXT_TOO_SHORT;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH) {
    return VALIDATION_MESSAGES.ITEM_TEXT_TOO_LONG;
  }
  
  return null;
};

export const validateItemDescription = (description: string): string | null => {
  if (description && description.length > VALIDATION_LIMITS.ITEM_DESCRIPTION_MAX_LENGTH) {
    return VALIDATION_MESSAGES.ITEM_DESCRIPTION_TOO_LONG;
  }
  
  return null;
};

export const validateBucketName = (name: string): string | null => {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return VALIDATION_MESSAGES.BUCKET_NAME_REQUIRED;
  }
  
  if (trimmed.length < VALIDATION_LIMITS.BUCKET_NAME_MIN_LENGTH) {
    return VALIDATION_MESSAGES.BUCKET_NAME_TOO_SHORT;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.BUCKET_NAME_MAX_LENGTH) {
    return VALIDATION_MESSAGES.BUCKET_NAME_TOO_LONG;
  }
  
  return null;
};

export const validateTagName = (name: string): string | null => {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return VALIDATION_MESSAGES.TAG_NAME_REQUIRED;
  }
  
  if (trimmed.length < VALIDATION_LIMITS.TAG_NAME_MIN_LENGTH) {
    return VALIDATION_MESSAGES.TAG_NAME_TOO_SHORT;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH) {
    return VALIDATION_MESSAGES.TAG_NAME_TOO_LONG;
  }
  
  return null;
};

export const validateCategoryName = (name: string): string | null => {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return VALIDATION_MESSAGES.CATEGORY_NAME_REQUIRED;
  }
  
  if (trimmed.length < VALIDATION_LIMITS.CATEGORY_NAME_MIN_LENGTH) {
    return VALIDATION_MESSAGES.CATEGORY_NAME_TOO_SHORT;
  }
  
  if (trimmed.length > VALIDATION_LIMITS.CATEGORY_NAME_MAX_LENGTH) {
    return VALIDATION_MESSAGES.CATEGORY_NAME_TOO_LONG;
  }
  
  return null;
};

// Count validations
export const canAddMoreChecklists = (currentCount: number): boolean => {
  return currentCount < VALIDATION_LIMITS.MAX_CHECKLISTS_PER_USER;
};

export const canAddMoreItems = (currentCount: number): boolean => {
  return currentCount < VALIDATION_LIMITS.MAX_ITEMS_PER_CHECKLIST;
};

export const canAddMoreBuckets = (currentCount: number): boolean => {
  return currentCount < VALIDATION_LIMITS.MAX_BUCKETS_PER_USER;
};

export const canAddMoreTags = (currentCount: number): boolean => {
  return currentCount < VALIDATION_LIMITS.MAX_TAGS_PER_USER;
};

export const canAddMoreTagsToChecklist = (currentCount: number): boolean => {
  return currentCount < VALIDATION_LIMITS.MAX_TAGS_PER_CHECKLIST;
};

// Helper function to get character count display
export const getCharacterCountText = (current: number, max: number): string => {
  return `${current}/${max}`;
};

// Helper function to determine if character count should be highlighted (close to limit)
export const shouldHighlightCharacterCount = (current: number, max: number): boolean => {
  return current > max * 0.8; // Highlight when more than 80% of limit
};
