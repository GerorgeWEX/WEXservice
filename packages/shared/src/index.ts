export const APP_NAME = 'WEX Service';
export const TIMEZONE = 'Europe/Bucharest';
export const USER_ROLES = ['admin', 'subadmin', 'technician', 'client'] as const;
export type UserRole = (typeof USER_ROLES)[number];
