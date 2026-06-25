// Mirrors the Role enum from the Mongoose model.
// Defined here to avoid importing Mongoose in client components.
export enum Role {
  LANDLORD = "LANDLORD",
  PROPERTY_MANAGER = "PROPERTY_MANAGER",
  TENANT = "TENANT",
}

export type ProfileData = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

export type ChangeEmailData = {
  newEmail: string;
  confirmPassword: string;
};

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;