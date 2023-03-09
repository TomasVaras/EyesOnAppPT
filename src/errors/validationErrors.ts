class ValidationError extends Error {
    constructor(messasge: string) {
        super(messasge);
        this.name = 'ValidationError';
    }
}

export { ValidationError }