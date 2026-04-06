export class InviteRequiresSignInError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}. Sign in with that account to claim access.`);
    this.name = "InviteRequiresSignInError";
  }
}

export class InviteAccountMismatchError extends Error {
  constructor(expectedEmail: string) {
    super(`This invite belongs to ${expectedEmail}. Sign in with that account before claiming access.`);
    this.name = "InviteAccountMismatchError";
  }
}

export class AttachmentLinkageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentLinkageError";
  }
}

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many requests. Please wait and try again.");
    this.name = "RateLimitExceededError";
  }
}

export class ArtifactStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactStorageError";
  }
}
