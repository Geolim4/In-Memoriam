export class EvaluationError extends Error {
    public expression: string;

    public constructor(message: string, expression: string) {
        super(message);
        this.name = 'EvaluationError';
        this.expression = expression;

        /**
        * Microsoft, YOU SUCK, seriously.
        * @see https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
        */
        Object.setPrototypeOf(this, EvaluationError.prototype);
    }
}
