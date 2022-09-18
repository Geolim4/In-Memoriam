export class MethodCallNotAllowedError extends Error {
  public expression: string;

  constructor(message: string) {
    super(message);
    this.name = 'MethodCallNotAllowedError';

    /**
     * Microsoft, YOU SUCK, seriously.
     * @see https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, MethodCallNotAllowedError.prototype);
  }
}
