const maxBulkSignupCount = 150;
const productName = "Let's Glance";
const incorrectOtpMessage = 'Verification code is incorrect';
const expiredOtpMessage = 'Verification code has expired. Request a new code';

enum OtpPurpose {
  Login = 'login',
  Signup = 'signup',
}

export const AuthConstantsCollection = {
  maxBulkSignupCount,
  productName,
  incorrectOtpMessage,
  expiredOtpMessage,
  OtpPurpose,
};
