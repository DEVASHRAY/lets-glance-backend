import type { UserFields } from '../user/user.model.ts';
import type { AuthConstantsCollection } from './auth.constants.ts';

export type LoginInput = Pick<UserFields, 'email' | 'password'>;

type OptionalCreateUserField =
  'interestedIn' | 'isSeededProfile' | 'photos' | 'photoUrl' | 'preferences';

type OtpPurpose =
  (typeof AuthConstantsCollection.OtpPurpose)[keyof typeof AuthConstantsCollection.OtpPurpose];

type CreateUserInputWithPassword = Omit<
  UserFields,
  'createdAt' | 'updatedAt' | 'id' | 'role' | OptionalCreateUserField
> &
  Partial<Pick<UserFields, OptionalCreateUserField>>;

export interface AuthTypeCollection {
  LoginInput: LoginInput;
  OtpPurpose: OtpPurpose;
  SendOtpInput: Pick<UserFields, 'email'> & { purpose: OtpPurpose };
  CreateUserInputWithPassword: CreateUserInputWithPassword;
  CreateUserInputWithOtp: Omit<AuthTypeCollection['CreateUserInputWithPassword'], 'password'>;
}
